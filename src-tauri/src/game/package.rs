//! 可恢复资源下载任务编排、安装互斥、取消与事件投影。
//! @since Beta v0.11.5

use super::{
  committer,
  downloader::{RateLimiter, download_object, prepare_cache_root},
  hoyoplay::{create_http_client, get_game_branches},
  installer,
  journal::{self, TaskJournal},
  model::{
    GameInstallation, PackagePlanStrategy, PackagePlanTarget, PackageTaskOptions, PackageTaskState,
    PackageTaskSummary, PackageVerifySummary,
  },
  planner::{
    PersistedPlan, cached_chunk_matches, flush_cache_validation_index,
    hydrate_and_validate_repair_plan, same_volume,
  },
  switch::{self, PersistedSwitchPlan},
  verify::{self, VerifyRuntime},
};
use futures_util::{StreamExt, stream};
use std::{
  collections::{HashMap, HashSet},
  fs,
  path::{Path, PathBuf},
  sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex as AsyncMutex;

const DEFAULT_CONCURRENCY: usize = 4;
const MAX_CONCURRENCY: usize = 16;
const MIN_RATE_LIMIT: u64 = 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;

pub(crate) struct GamePackageManager {
  active: Arc<Mutex<ActiveTasks>>,
  verify: Arc<VerifyRuntime>,
}

struct ActiveTasks {
  by_task: HashMap<String, ActiveTask>,
  by_installation: HashMap<String, String>,
}

#[derive(Clone)]
struct ActiveTask {
  installation_id: String,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  journal: Arc<AsyncMutex<TaskJournal>>,
}

#[derive(Clone)]
pub(crate) struct InstallContext {
  pub(crate) pool: sqlx::SqlitePool,
  pub(crate) machine_uid: String,
  pub(crate) draft_id: String,
}

pub(crate) struct TaskReservation {
  active: Arc<Mutex<ActiveTasks>>,
  installation_id: String,
  task_id: String,
  retained: bool,
}

impl TaskReservation {
  fn acquire(
    active: Arc<Mutex<ActiveTasks>>,
    installation_id: &str,
    task_id: &str,
  ) -> Result<Self, String> {
    {
      let mut tasks = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if tasks.by_installation.contains_key(installation_id) {
        return Err("该游戏安装已有资源任务正在运行".to_string());
      }
      tasks.by_installation.insert(installation_id.to_string(), task_id.to_string());
    }
    Ok(Self {
      active,
      installation_id: installation_id.to_string(),
      task_id: task_id.to_string(),
      retained: false,
    })
  }

  fn retain(&mut self) {
    self.retained = true;
  }
}

impl Drop for TaskReservation {
  fn drop(&mut self) {
    if self.retained {
      return;
    }
    let Ok(mut active) = self.active.lock() else {
      return;
    };
    if active.by_installation.get(&self.installation_id) == Some(&self.task_id) {
      active.by_installation.remove(&self.installation_id);
    }
  }
}

impl GamePackageManager {
  pub(crate) fn new() -> Self {
    Self {
      active: Arc::new(Mutex::new(ActiveTasks {
        by_task: HashMap::new(),
        by_installation: HashMap::new(),
      })),
      verify: Arc::new(VerifyRuntime::new()),
    }
  }

  /// 启动只写应用缓存的资源下载。游戏运行时仍允许开始；改游戏目录发生在 apply。
  pub(crate) fn start(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    options: PackageTaskOptions,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    if self.verify.is_running(&plan.installation_id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再开始资源任务".to_string());
    }
    if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      || plan.inventory.is_empty()
    {
      return Err("当前只能启动包含完整目标清单的资源计划".to_string());
    }
    let concurrency = options.concurrency.unwrap_or(DEFAULT_CONCURRENCY);
    if !(1..=MAX_CONCURRENCY).contains(&concurrency) {
      return Err(format!("下载并发数必须在 1 到 {MAX_CONCURRENCY} 之间"));
    }
    if options.max_bytes_per_second.is_some_and(|value| value < MIN_RATE_LIMIT) {
      return Err("下载限速不能低于 1 MiB/s".to_string());
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let cache_root = prepare_cache_root(&task_root)?;
    let download_client = create_http_client()?;
    let missing_bytes = plan
      .downloads
      .iter()
      .filter(|download| !cached_chunk_matches(&cache_root, download))
      .try_fold(0_u64, |total, download| {
        total.checked_add(download.compressed_size).ok_or_else(|| "待下载资源大小溢出".to_string())
      })?;
    let required = missing_bytes
      .checked_add(SAFETY_MARGIN_BYTES)
      .ok_or_else(|| "缓存空间需求溢出".to_string())?;
    let available = fs2::available_space(&cache_root)
      .map_err(|error| format!("读取资源缓存磁盘剩余空间失败：{error}"))?;
    if available < required {
      return Err(format!("资源缓存磁盘空间不足：至少还需 {required} 字节，可用 {available} 字节"));
    }

    let mut journal = journal::load_or_create(&task_root, &plan)?;
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的资源任务，请使用恢复操作继续".to_string());
    }
    if recovering && journal.state == PackageTaskState::ReadyToApply {
      return Err("资源任务已经完成下载".to_string());
    }
    rebuild_completed_cache(&mut journal, &plan, &cache_root);
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.bytes_per_second = 0;
    journal.eta_seconds = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;

    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_task(
        app_handle.clone(),
        &task_root,
        &cache_root,
        plan.clone(),
        download_client,
        shared_journal,
        Arc::clone(&canceled),
        Arc::clone(&paused),
        concurrency,
        options.max_bytes_per_second,
        None,
      )
      .await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn has_running_tasks(&self) -> Result<bool, String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    Ok(!active.by_task.is_empty())
  }

  pub(crate) fn start_install(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    draft_id: String,
    options: PackageTaskOptions,
    context: InstallContext,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    installer::ensure_windows_install_platform()?;
    if plan.target != PackagePlanTarget::Install || plan.strategy != PackagePlanStrategy::Full {
      return Err("当前计划不是全新安装计划".to_string());
    }
    if plan.inventory.is_empty() || plan.install_overlay.is_none() {
      return Err("全新安装计划缺少完整目标清单".to_string());
    }
    let concurrency = options.concurrency.unwrap_or(DEFAULT_CONCURRENCY);
    if !(1..=MAX_CONCURRENCY).contains(&concurrency) {
      return Err(format!("下载并发数必须在 1 到 {MAX_CONCURRENCY} 之间"));
    }
    if options.max_bytes_per_second.is_some_and(|value| value < MIN_RATE_LIMIT) {
      return Err("下载限速不能低于 1 MiB/s".to_string());
    }
    let download_client = create_http_client()?;
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let cache_root = prepare_cache_root(&task_root)?;
    let missing_bytes = plan
      .downloads
      .iter()
      .filter(|download| !cached_chunk_matches(&cache_root, download))
      .try_fold(0_u64, |total, download| {
        total.checked_add(download.compressed_size).ok_or_else(|| "安装下载大小溢出".to_string())
      })?;
    let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
    if matches!(
      installer::load_draft(&task_root, &draft_id)?.state,
      installer::InstallDraftState::Completed | installer::InstallDraftState::Canceled
    ) {
      return Err("安装草稿已经结束，不能重新启动".to_string());
    }
    let install_bytes = plan
      .assets
      .iter()
      .try_fold(overlay.config.len() as u64, |total, asset| {
        total.checked_add(asset.size).ok_or_else(|| "安装大小溢出".to_string())
      })?
      .checked_add(overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size))
      .ok_or_else(|| "安装大小溢出".to_string())?;
    let cache_available = fs2::available_space(&cache_root)
      .map_err(|error| format!("读取资源缓存磁盘剩余空间失败：{error}"))?;
    let game_parent = Path::new(&overlay.game_root).parent().unwrap_or(Path::new("."));
    let install_available = fs2::available_space(game_parent)
      .map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
    let same_volume = same_volume(&cache_root, game_parent);
    let cache_required = missing_bytes.saturating_add(SAFETY_MARGIN_BYTES);
    let install_required = install_bytes.saturating_add(SAFETY_MARGIN_BYTES);
    let required = if same_volume {
      missing_bytes
        .checked_add(install_bytes)
        .and_then(|value| value.checked_add(SAFETY_MARGIN_BYTES))
        .ok_or_else(|| "安装所需空间溢出".to_string())?
    } else {
      cache_required.checked_add(install_required).ok_or_else(|| "安装所需空间溢出".to_string())?
    };
    let available =
      if same_volume { cache_available.min(install_available) } else { cache_available };
    let sufficient = if same_volume {
      available >= required
    } else {
      cache_available >= cache_required && install_available >= install_required
    };
    if !sufficient {
      return Err(format!(
        "安装空间不足：需要约 {required} 字节，可用缓存 {} 字节、安装盘 {} 字节",
        cache_available, install_available
      ));
    }
    let mut journal = journal::load_or_create(&task_root, &plan)?;
    if journal.state.blocks_launch() && !recovering {
      return Err("检测到未完成的安装提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的安装任务，请使用恢复操作继续".to_string());
    }
    if !recovering && journal.state == PackageTaskState::Paused {
      return Err("检测到已暂停的安装任务，请使用恢复操作继续".to_string());
    }
    if recovering
      && matches!(
        journal.state,
        PackageTaskState::Published
          | PackageTaskState::Verified
          | PackageTaskState::RegistrationPending
      )
    {
      return Err("安装已经发布，请使用安装恢复命令完成登记".to_string());
    }
    rebuild_completed_cache(&mut journal, &plan, &cache_root);
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.bytes_per_second = 0;
    journal.eta_seconds = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    installer::set_draft_state(&task_root, &draft_id, installer::InstallDraftState::Downloading)?;
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_task(
        app_handle.clone(),
        &task_root,
        &cache_root,
        plan,
        download_client,
        shared_journal,
        canceled,
        paused,
        concurrency,
        options.max_bytes_per_second,
        Some(context),
      )
      .await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn start_switch(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    plan: PersistedSwitchPlan,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    if is_game_running() {
      return Err("游戏仍在运行，无法开始换服".to_string());
    }
    if self.verify.is_running(plan.installation_id())? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再换服".to_string());
    }
    if journal::has_incomplete_tasks(&task_root, Some(plan.installation_id()))? {
      let incomplete = journal::list(&task_root, Some(plan.installation_id()))?;
      if incomplete.iter().any(|journal| {
        journal.plan_id != plan.plan_id()
          && !matches!(
            journal.state,
            PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
          )
      }) {
        return Err("该游戏安装已有未完成的资源任务，暂时不能换服".to_string());
      }
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), plan.installation_id(), plan.plan_id())?;
    let mut journal = switch::load_or_create_switch_journal(&task_root, &plan)?;
    if journal.state.blocks_launch() && !recovering {
      return Err("检测到未完成的换服提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的换服任务，请使用恢复操作继续".to_string());
    }
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id().to_string(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id().to_string(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, plan.plan_id()))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_switch(app_handle, task_root, installation, plan, shared_journal, canceled).await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn rollback_switch(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    game_root: &Path,
    request: &committer::SwitchApplyRequest,
    retry: bool,
  ) -> Result<PackageTaskSummary, String> {
    let journal_value = journal::load(&journal::journal_path(task_root, &request.plan_id))?;
    let _reservation = TaskReservation::acquire(
      Arc::clone(&self.active),
      &journal_value.installation_id,
      &request.plan_id,
    )?;
    if is_game_running() {
      return Err("游戏仍在运行，无法恢复换服提交".to_string());
    }
    let mut journal_value = journal_value;
    committer::rollback_switch(
      request,
      game_root,
      task_root,
      &mut journal_value,
      retry,
      |journal| {
        emit_state(app_handle, &journal.summary());
      },
    )?;
    Ok(journal_value.summary())
  }

  pub(crate) fn cancel(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    task_id: &str,
  ) -> Result<(), String> {
    if let Some(summary) = self.request_or_reap_cancel(task_root, task_id)? {
      emit_state(app_handle, &summary);
    }
    Ok(())
  }

  /// 暂停全新安装的资源下载，保留草稿与已完成缓存以便后续恢复。
  pub(crate) async fn pause_install(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    task_id: &str,
    installation_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    let task = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.get(task_id).cloned()
    };
    let Some(task) = task else {
      let journal = journal::load(&journal::journal_path(task_root, task_id))?;
      if journal.installation_id != installation_id {
        return Err("安装任务身份不匹配".to_string());
      }
      if journal.state == PackageTaskState::Paused {
        return Ok(journal.summary());
      }
      return Err("安装任务当前不在下载中".to_string());
    };
    if task.installation_id != installation_id {
      return Err("安装任务身份不匹配".to_string());
    }
    let mut journal_value = task.journal.lock().await;
    if journal_value.target != PackagePlanTarget::Install {
      return Err("当前任务不是游戏本体安装任务".to_string());
    }
    if journal_value.installation_id != installation_id {
      return Err("安装任务身份不匹配".to_string());
    }
    if journal_value.state == PackageTaskState::Paused {
      return Ok(journal_value.summary());
    }
    if !matches!(journal_value.state, PackageTaskState::Queued | PackageTaskState::Downloading) {
      return Err("安装任务当前不能暂停".to_string());
    }
    let previous_state = journal_value.state;
    task.paused.store(true, Ordering::Release);
    journal_value.state = PackageTaskState::Paused;
    journal_value.current_file = None;
    journal_value.bytes_per_second = 0;
    journal_value.eta_seconds = None;
    journal_value.error_message = None;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      task.paused.store(false, Ordering::Release);
      journal_value.state = previous_state;
      return Err(error);
    }
    let summary = journal_value.summary();
    emit_progress(app_handle, &summary);
    emit_state(app_handle, &summary);
    Ok(summary)
  }

  /// 等待暂停任务的下载 worker 退出，避免恢复或删除与旧 worker 并发操作日志和缓存。
  pub(crate) async fn wait_for_task_idle(&self, task_id: &str) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
      let running = {
        let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
        active.by_task.contains_key(task_id)
      };
      if !running {
        return Ok(());
      }
      if Instant::now() >= deadline {
        return Err("安装任务仍在停止，请稍后重试".to_string());
      }
      tokio::time::sleep(Duration::from_millis(50)).await;
    }
  }

  fn request_or_reap_cancel(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<Option<PackageTaskSummary>, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if let Some(task) = active.by_task.get(task_id) {
        task.canceled.store(true, Ordering::Release);
        return Ok(None);
      }
      if active.by_installation.values().any(|id| id == task_id) {
        return Ok(None);
      }
    }
    let journal = journal::load(&journal::journal_path(task_root, task_id))?;
    if matches!(
      journal.state,
      PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
    ) {
      return Ok(Some(journal.summary()));
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    Ok(Some(self.rollback_download(task_root, task_id)?))
  }

  pub(crate) fn apply(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    plan: PersistedPlan,
  ) -> Result<PackageTaskSummary, String> {
    if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      || plan.inventory.is_empty()
    {
      return Err("当前只能应用包含完整目标清单的资源计划".to_string());
    }
    if self.verify.is_running(&installation.id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再应用更新".to_string());
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    if is_game_running() {
      return Err("游戏仍在运行，无法应用资源更新".to_string());
    }
    let journal_value = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?;
    let can_apply = journal_value.state == PackageTaskState::ReadyToApply;
    let can_repair = journal_value.repair.is_some()
      && matches!(
        journal_value.state,
        PackageTaskState::RepairRequired
          | PackageTaskState::Assembling
          | PackageTaskState::Committing
          | PackageTaskState::Verifying
          | PackageTaskState::RollingBack
      );
    if !can_apply && !can_repair {
      return Err("资源任务当前不能应用或修复".to_string());
    }
    let should_execute_apply = can_apply;
    let game_root = PathBuf::from(&installation.root_path);
    let summary = journal_value.summary();
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal_value));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let active = Arc::clone(&self.active);
    let finished_task_id = plan.plan_id.clone();
    let worker_journal = Arc::clone(&shared_journal);
    tauri::async_runtime::spawn(async move {
      let worker_app_handle = app_handle.clone();
      let canceled_flag = Arc::clone(&canceled);
      let snapshot = Arc::clone(&worker_journal);
      if should_execute_apply {
        let apply_plan = plan.clone();
        let apply_game_root = game_root.clone();
        let apply_task_root = task_root.clone();
        let apply_canceled = Arc::clone(&canceled_flag);
        let apply_snapshot = Arc::clone(&snapshot);
        let apply_handle = worker_app_handle.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
          let mut journal_value = apply_snapshot.blocking_lock().clone();
          let emit = |journal: &TaskJournal| {
            *apply_snapshot.blocking_lock() = journal.clone();
            let summary = journal.summary();
            emit_state(&apply_handle, &summary);
            emit_progress(&apply_handle, &summary);
          };
          committer::execute_apply(
            &apply_plan,
            &apply_game_root,
            &apply_task_root,
            &mut journal_value,
            &apply_canceled,
            emit,
          )
        })
        .await;
        match result {
          Ok(Ok(committer::ApplyOutcome::Completed)) => {
            finish_task(&active, &finished_task_id);
            return;
          }
          Ok(Ok(committer::ApplyOutcome::RepairNeeded)) => {}
          Ok(Err(error)) => {
            log::warn!("[game-package] 应用资源任务失败：{error}");
            finish_task(&active, &finished_task_id);
            return;
          }
          Err(error) => {
            log::error!("[game-package] 应用资源任务异常退出：{error}");
            finish_task(&active, &finished_task_id);
            return;
          }
        }
      }
      if let Err(error) = continue_repair(
        worker_app_handle,
        task_root,
        game_root,
        installation,
        plan,
        snapshot,
        canceled_flag,
      )
      .await
      {
        log::warn!("[game-package] 修复资源任务失败：{error}");
      }
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn rollback_apply(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    game_root: &Path,
    plan: &PersistedPlan,
    repair_plan: Option<&PersistedPlan>,
    retry: bool,
  ) -> Result<PackageTaskSummary, String> {
    let _reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    if is_game_running() {
      return Err("游戏仍在运行，无法恢复资源提交".to_string());
    }
    let mut journal_value = journal::load(&journal::journal_path(task_root, &plan.plan_id))?;
    committer::rollback_apply(
      plan,
      repair_plan,
      game_root,
      task_root,
      &mut journal_value,
      retry,
      |journal| {
        emit_state(app_handle, &journal.summary());
      },
    )?;
    Ok(journal_value.summary())
  }

  pub(crate) fn start_verify(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    branches: super::hoyoplay::GameBranches,
  ) -> Result<PackageVerifySummary, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if active.by_installation.contains_key(&installation.id) {
        return Err("该游戏安装已有资源任务正在运行".to_string());
      }
    }
    verify::start_verify(&self.verify, app_handle, task_root, installation, branches)
  }

  pub(crate) fn verify_status(
    &self,
    task_root: &Path,
    installation_id: &str,
  ) -> Result<Option<PackageVerifySummary>, String> {
    self.verify.status(task_root, installation_id)
  }

  pub(crate) fn cancel_verify(&self, installation_id: &str) -> Result<(), String> {
    self.verify.cancel(installation_id)
  }

  pub(crate) fn clear_verify(&self, task_root: &Path, installation_id: &str) -> Result<(), String> {
    self.verify.clear(task_root, installation_id)
  }

  pub(crate) fn reserve_installation(
    &self,
    installation_id: &str,
  ) -> Result<TaskReservation, String> {
    TaskReservation::acquire(Arc::clone(&self.active), installation_id, "game-launch")
  }

  pub(crate) async fn list(
    &self,
    task_root: &Path,
    installation_id: Option<&str>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let live_ids = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      let mut ids = active.by_task.keys().cloned().collect::<HashSet<_>>();
      ids.extend(active.by_installation.values().cloned());
      ids
    };
    let mut summaries = HashMap::new();
    for mut journal in journal::list(task_root, installation_id)? {
      if matches!(journal.state, PackageTaskState::Queued | PackageTaskState::Downloading)
        && !live_ids.contains(&journal.task_id)
      {
        journal.state = PackageTaskState::Failed;
        journal.error_message = Some("资源任务已中断，请恢复或放弃".to_string());
        journal.current_file = None;
        journal.touch();
        journal::persist(task_root, &journal)?;
      }
      let mut summary = journal.summary();
      if summary.state.requires_recovery() {
        summary.state = PackageTaskState::RecoveryRequired;
      }
      summaries.insert(summary.task_id.clone(), summary);
    }
    let active = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.values().cloned().collect::<Vec<_>>()
    };
    for task in active {
      if installation_id.is_none_or(|id| id == task.installation_id) {
        let summary = task.journal.lock().await.summary();
        summaries.insert(summary.task_id.clone(), summary);
      }
    }
    let mut summaries = summaries.into_values().collect::<Vec<_>>();
    summaries.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(summaries)
  }

  pub(crate) fn rollback_download(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if active.by_task.contains_key(task_id) {
        return Err("任务仍在运行，请先请求取消并等待安全边界".to_string());
      }
    }
    let path = journal::journal_path(task_root, task_id);
    let mut journal = journal::load(&path)?;
    if journal.state == PackageTaskState::Completed {
      return Err("资源任务已经完成".to_string());
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    cleanup_task_partials(&task_root.join("cache/chunks"), task_id)?;
    cleanup_task_partials(&task_root.join("cache/sdks"), task_id)?;
    journal.state = PackageTaskState::Canceled;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(task_root, &journal)?;
    Ok(journal.summary())
  }
}

async fn continue_repair(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
) -> Result<(), String> {
  let files = {
    let journal_value = journal.lock().await;
    let can_continue = journal_value.repair.is_some()
      && matches!(
        journal_value.state,
        PackageTaskState::RepairRequired
          | PackageTaskState::Assembling
          | PackageTaskState::Committing
          | PackageTaskState::Verifying
          | PackageTaskState::RollingBack
      );
    if !can_continue {
      return Ok(());
    }
    journal_value.repair.as_ref().ok_or_else(|| "资源任务缺少修复清单".to_string())?.files.clone()
  };
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::Assembling;
    journal_value.current_file = Some("准备修复资源".to_string());
    journal_value.error_message = None;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
    emit_state(&app_handle, &journal_value.summary());
  }
  let result = run_repair(
    app_handle.clone(),
    task_root.clone(),
    game_root,
    installation,
    plan,
    journal.clone(),
    canceled,
    files,
  )
  .await;
  if let Err(error) = &result {
    let mut journal_value = journal.lock().await;
    let incomplete_repair =
      journal_value.repair.as_ref().is_some_and(|repair| repair.apply.is_some());
    if journal_value.state != PackageTaskState::Completed
      && journal_value.state != PackageTaskState::RecoveryRequired
      && !incomplete_repair
    {
      journal_value.state = PackageTaskState::RepairRequired;
      journal_value.error_message = Some(error.clone());
      journal_value.current_file = None;
      journal_value.touch();
      if journal::persist(&task_root, &journal_value).is_ok() {
        emit_state(&app_handle, &journal_value.summary());
      }
    }
  }
  result
}

async fn run_repair(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  files: Vec<super::planner::PlanFile>,
) -> Result<(), String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let repair_plan =
    hydrate_and_validate_repair_plan(&installation, &branches, plan.clone(), &files).await?;
  {
    let mut journal_value = journal.lock().await;
    if journal_value.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
      committer::revert_incomplete_repair(
        &repair_plan,
        &game_root,
        &task_root,
        &mut journal_value,
      )?;
      emit_state(&app_handle, &journal_value.summary());
    }
    journal_value.state = PackageTaskState::RepairRequired;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
  }
  let cache_root = prepare_cache_root(&task_root)?;
  let pending = repair_plan
    .downloads
    .iter()
    .filter(|download| !cached_chunk_matches(&cache_root, download))
    .cloned()
    .collect::<Vec<_>>();
  if !pending.is_empty() {
    {
      let mut journal_value = journal.lock().await;
      journal_value.state = PackageTaskState::Assembling;
      journal_value.current_file = Some("下载修复资源".to_string());
      journal_value.touch();
      journal::persist(&task_root, &journal_value)?;
      emit_state(&app_handle, &journal_value.summary());
    }
    let limiter = Arc::new(RateLimiter::new(None));
    let paused = Arc::new(AtomicBool::new(false));
    let downloads = stream::iter(pending.into_iter().map(|download| {
      let cache_root = cache_root.clone();
      let task_id = repair_plan.plan_id.clone();
      let canceled = Arc::clone(&canceled);
      let paused = Arc::clone(&paused);
      let limiter = Arc::clone(&limiter);
      let client = client.clone();
      async move {
        download_object(&client, &cache_root, &download, &task_id, &canceled, &paused, &limiter)
          .await
      }
    }))
    .buffer_unordered(DEFAULT_CONCURRENCY);
    futures_util::pin_mut!(downloads);
    while let Some(result) = downloads.next().await {
      result?;
      if canceled.load(Ordering::Acquire) {
        return Err("应用更新已取消".to_string());
      }
    }
    flush_cache_validation_index(&cache_root);
  }
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::RepairRequired;
    journal_value.current_file = None;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
  }
  let repair_handle = app_handle.clone();
  let repair_snapshot = Arc::clone(&journal);
  tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = repair_snapshot.blocking_lock().clone();
    let emit = |journal: &TaskJournal| {
      *repair_snapshot.blocking_lock() = journal.clone();
      let summary = journal.summary();
      emit_state(&repair_handle, &summary);
      emit_progress(&repair_handle, &summary);
    };
    committer::execute_repair(
      &plan,
      &repair_plan,
      &game_root,
      &task_root,
      &mut journal_value,
      &canceled,
      emit,
    )
  })
  .await
  .map_err(|error| format!("修复资源任务异常退出：{error}"))?
}

async fn run_switch(
  app_handle: AppHandle,
  task_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedSwitchPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
) {
  let fail = |journal: &Arc<AsyncMutex<TaskJournal>>, error: String, canceled_flag: bool| {
    if let Ok(mut journal_value) = journal.try_lock() {
      persist_terminal_journal(&task_root, &mut journal_value, error, canceled_flag, &app_handle);
    }
  };
  let client = match create_http_client() {
    Ok(client) => client,
    Err(error) => {
      fail(&journal, error, false);
      return;
    }
  };
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::Downloading;
    journal_value.current_file = Some("下载渠道 SDK".to_string());
    journal_value.touch();
    if let Err(error) = journal::persist(&task_root, &journal_value) {
      persist_terminal_journal(&task_root, &mut journal_value, error, false, &app_handle);
      return;
    }
    emit_state(&app_handle, &journal_value.summary());
  }
  let request = {
    let mut journal_value = journal.lock().await;
    match switch::prepare_switch_commit(
      &client,
      &installation,
      &plan,
      &task_root,
      &mut journal_value,
      &canceled,
    )
    .await
    {
      Ok(request) => {
        journal_value.state = PackageTaskState::ReadyToApply;
        journal_value.current_file = Some("渠道文件已就绪".to_string());
        journal_value.touch();
        if let Err(error) = journal::persist(&task_root, &journal_value) {
          persist_terminal_journal(&task_root, &mut journal_value, error, false, &app_handle);
          return;
        }
        emit_state(&app_handle, &journal_value.summary());
        request
      }
      Err(error) => {
        let canceled_flag = canceled.load(Ordering::Acquire) || error.contains("已取消");
        cleanup_task_partials(&task_root.join("cache/sdks"), plan.plan_id()).ok();
        journal_value.state =
          if canceled_flag { PackageTaskState::Canceled } else { PackageTaskState::Failed };
        journal_value.error_message = (!canceled_flag).then_some(error);
        journal_value.current_file = None;
        journal_value.touch();
        let _ = journal::persist(&task_root, &journal_value);
        emit_state(&app_handle, &journal_value.summary());
        return;
      }
    }
  };
  let game_root = PathBuf::from(&installation.root_path);
  let apply_journal = Arc::clone(&journal);
  let apply_handle = app_handle.clone();
  let apply_task_root = task_root.clone();
  let apply_canceled = Arc::clone(&canceled);
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = apply_journal.blocking_lock().clone();
    let emit = |journal: &TaskJournal| {
      *apply_journal.blocking_lock() = journal.clone();
      let summary = journal.summary();
      emit_state(&apply_handle, &summary);
      emit_progress(&apply_handle, &summary);
    };
    committer::execute_switch(
      &request,
      &game_root,
      &apply_task_root,
      &mut journal_value,
      &apply_canceled,
      emit,
    )
  })
  .await;
  match result {
    Ok(Ok(())) => {}
    Ok(Err(error)) => log::warn!("[game-package] 换服失败：{error}"),
    Err(error) => log::error!("[game-package] 换服任务异常退出：{error}"),
  }
}

fn finish_task(active: &Mutex<ActiveTasks>, task_id: &str) {
  let Ok(mut active) = active.lock() else {
    return;
  };
  if let Some(task) = active.by_task.remove(task_id) {
    active.by_installation.remove(&task.installation_id);
  }
}

async fn run_task(
  app_handle: AppHandle,
  task_root: &Path,
  cache_root: &Path,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  install_context: Option<InstallContext>,
) {
  {
    let mut journal_value = journal.lock().await;
    if paused.load(Ordering::Acquire) {
      journal_value.state = PackageTaskState::Paused;
      journal_value.error_message = None;
      journal_value.touch();
      if let Err(error) = journal::persist(task_root, &journal_value) {
        persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
        return;
      }
      emit_state(&app_handle, &journal_value.summary());
      return;
    }
    journal_value.state = PackageTaskState::Downloading;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
      return;
    }
    emit_state(&app_handle, &journal_value.summary());
  }
  let limiter = Arc::new(RateLimiter::new(max_bytes_per_second));
  let pending = plan
    .downloads
    .iter()
    .filter(|download| !cached_chunk_matches(cache_root, download))
    .cloned()
    .collect::<Vec<_>>();
  let download_labels = build_download_labels(&plan);
  let started_at = Instant::now();
  let mut last_emit = Instant::now() - Duration::from_secs(1);
  let mut last_persist = Instant::now();
  let mut fatal_error = None;
  let mut completed_cache_keys = {
    let journal_value = journal.lock().await;
    journal_value.owned_cache_files.iter().cloned().collect::<HashSet<_>>()
  };
  let downloads = stream::iter(pending.into_iter().map(|download| {
    let cache_root = cache_root.to_path_buf();
    let task_id = plan.plan_id.clone();
    let current_file = download_labels
      .get(&download.cache_key)
      .cloned()
      .unwrap_or_else(|| format!("资源对象：{}", download.id));
    let canceled = Arc::clone(&canceled);
    let paused = Arc::clone(&paused);
    let limiter = Arc::clone(&limiter);
    let client = download_client.clone();
    async move {
      let result =
        download_object(&client, &cache_root, &download, &task_id, &canceled, &paused, &limiter)
          .await;
      (current_file, result)
    }
  }))
  .buffer_unordered(concurrency);
  futures_util::pin_mut!(downloads);
  while let Some((current_file, result)) = downloads.next().await {
    match result {
      Ok(downloaded) => {
        let mut journal_value = journal.lock().await;
        if completed_cache_keys.insert(downloaded.cache_key.clone()) {
          journal_value.owned_cache_files.push(downloaded.cache_key);
          journal_value.committed_step = journal_value.owned_cache_files.len();
          journal_value.downloaded_bytes =
            journal_value.downloaded_bytes.saturating_add(downloaded.bytes);
        }
        journal_value.current_file = Some(current_file);
        let elapsed = started_at.elapsed().as_secs_f64().max(0.001);
        journal_value.bytes_per_second = (journal_value.downloaded_bytes as f64 / elapsed) as u64;
        let remaining = journal_value.total_bytes.saturating_sub(journal_value.downloaded_bytes);
        journal_value.eta_seconds = (journal_value.bytes_per_second > 0)
          .then_some(remaining / journal_value.bytes_per_second);
        journal_value.touch();
        if last_persist.elapsed() >= Duration::from_secs(1) {
          if let Err(error) = journal::persist(task_root, &journal_value) {
            fatal_error = Some(error);
            canceled.store(true, Ordering::Release);
          }
          last_persist = Instant::now();
        }
        if last_emit.elapsed() >= Duration::from_millis(250) {
          emit_progress(&app_handle, &journal_value.summary());
          last_emit = Instant::now();
        }
      }
      Err(error) => {
        if !canceled.load(Ordering::Acquire) && !paused.load(Ordering::Acquire) {
          fatal_error = Some(error);
          canceled.store(true, Ordering::Release);
        }
      }
    }
  }

  drop(downloads);

  let mut journal_value = journal.lock().await;
  rebuild_completed_cache(&mut journal_value, &plan, cache_root);
  flush_cache_validation_index(cache_root);
  journal_value.current_file = None;
  journal_value.bytes_per_second = 0;
  journal_value.eta_seconds = None;
  if paused.load(Ordering::Acquire) {
    journal_value.state = PackageTaskState::Paused;
    journal_value.error_message = None;
  } else if let Some(error) = fatal_error {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some(error);
  } else if canceled.load(Ordering::Acquire) {
    let draft_canceled = install_context
      .as_ref()
      .is_none_or(|context| installer::cancel_draft(task_root, &context.draft_id).is_ok());
    if draft_canceled {
      journal_value.state = PackageTaskState::Canceled;
      journal_value.error_message = None;
    } else {
      journal_value.state = PackageTaskState::RecoveryRequired;
      journal_value.error_message =
        Some("取消时已进入安装提交边界，请通过恢复入口继续处理".to_string());
    }
  } else if journal_value.owned_cache_files.len() == plan.downloads.len() {
    journal_value.state = PackageTaskState::ReadyToApply;
    journal_value.error_message = None;
  } else {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some("下载结束后仍有资源未通过完整性校验".to_string());
  }
  journal_value.touch();
  if matches!(journal_value.state, PackageTaskState::Failed | PackageTaskState::RecoveryRequired) {
    log_install_failure(&journal_value);
  }
  if let Err(error) = journal::persist(task_root, &journal_value) {
    persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
    return;
  }
  emit_progress(&app_handle, &journal_value.summary());
  emit_state(&app_handle, &journal_value.summary());
  let should_install =
    install_context.is_some() && journal_value.state == PackageTaskState::ReadyToApply;
  if should_install {
    if let Some(context) = install_context.as_ref() {
      let _ = installer::set_draft_state(
        task_root,
        &context.draft_id,
        installer::InstallDraftState::ReadyToApply,
      );
    }
  }
  drop(journal_value);
  if should_install {
    if let Some(context) = install_context {
      run_install_task(
        app_handle,
        task_root.to_path_buf(),
        plan.clone(),
        journal,
        Arc::clone(&canceled),
        context,
      )
      .await;
    }
  }
}

async fn run_install_task(
  app_handle: AppHandle,
  task_root: PathBuf,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  context: InstallContext,
) {
  let snapshot = Arc::clone(&journal);
  let handle = app_handle.clone();
  let task_root_for_blocking = task_root.clone();
  let plan_for_blocking = plan.clone();
  let canceled_for_blocking = Arc::clone(&canceled);
  let machine_uid = context.machine_uid.clone();
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = snapshot.blocking_lock().clone();
    let emit = |value: &TaskJournal| {
      *snapshot.blocking_lock() = value.clone();
      let summary = value.summary();
      emit_state(&handle, &summary);
      emit_progress(&handle, &summary);
    };
    installer::execute_install(
      &plan_for_blocking,
      &task_root_for_blocking,
      &machine_uid,
      &mut journal_value,
      &canceled_for_blocking,
      &emit,
    )
  })
  .await;
  let installation = match result {
    Ok(Ok(installation)) => installation,
    Ok(Err(error)) => {
      log::error!("[game-package][install][{}] 全新安装提交失败：{error}", plan.plan_id);
      let mut value = journal.lock().await;
      if value.state != PackageTaskState::Canceled {
        value.state = if value.state.blocks_launch() {
          PackageTaskState::RecoveryRequired
        } else {
          PackageTaskState::Failed
        };
        value.error_message = Some(error);
        value.touch();
        if let Err(persist_error) = journal::persist(&task_root, &value) {
          log::error!(
            "[game-package][install][{}] 持久化失败任务日志失败：{persist_error}",
            plan.plan_id
          );
        }
        emit_state(&app_handle, &value.summary());
      }
      return;
    }
    Err(error) => {
      log::error!("[game-package] 全新安装 worker 异常退出：{error}");
      let mut value = journal.lock().await;
      value.state = PackageTaskState::RecoveryRequired;
      value.error_message = Some(format!("安装 worker 异常退出：{error}"));
      value.touch();
      if let Err(persist_error) = journal::persist(&task_root, &value) {
        log::error!(
          "[game-package][install][{}] 持久化 worker 异常日志失败：{persist_error}",
          plan.plan_id
        );
      }
      emit_state(&app_handle, &value.summary());
      return;
    }
  };
  if let Err(error) = installer::register_installation(&context.pool, &installation).await {
    log::error!("[game-package][install][{}] 登记游戏安装失败：{error}", plan.plan_id);
    let mut value = journal.lock().await;
    value.state = PackageTaskState::RecoveryRequired;
    value.error_message = Some(error);
    value.touch();
    if let Err(persist_error) = journal::persist(&task_root, &value) {
      log::error!(
        "[game-package][install][{}] 持久化登记失败日志失败：{persist_error}",
        plan.plan_id
      );
    }
    emit_state(&app_handle, &value.summary());
    return;
  }
  let mut value = journal.lock().await;
  value.state = PackageTaskState::Completed;
  value.error_message = None;
  value.current_file = None;
  value.touch();
  if let Err(error) = journal::persist(&task_root, &value) {
    log::error!("[game-package][install][{}] 写入安装完成状态失败：{error}", plan.plan_id);
  }
  if let Err(error) = installer::set_draft_state(
    &task_root,
    &context.draft_id,
    installer::InstallDraftState::Completed,
  ) {
    log::error!("[game-package][install][{}] 写入安装草稿完成状态失败：{error}", plan.plan_id);
  }
  emit_state(&app_handle, &value.summary());
}

fn rebuild_completed_cache(journal: &mut TaskJournal, plan: &PersistedPlan, cache_root: &Path) {
  let mut completed = Vec::new();
  let mut bytes = 0_u64;
  for download in &plan.downloads {
    if cached_chunk_matches(cache_root, download) {
      completed.push(download.cache_key.clone());
      bytes = bytes.saturating_add(download.compressed_size);
    }
  }
  journal.committed_step = completed.len();
  journal.owned_cache_files = completed;
  journal.downloaded_bytes = bytes;
}

/// 构建进度展示名称，避免直接向用户展示内部 chunk 或缓存键。
fn build_download_labels(plan: &PersistedPlan) -> HashMap<String, String> {
  let mut asset_names = HashMap::<String, String>::new();
  for asset in &plan.assets {
    for chunk in &asset.chunks {
      asset_names.entry(chunk.id.clone()).or_insert_with(|| asset.name.clone());
    }
    if let Some(patch) = &asset.patch {
      asset_names.entry(patch.id.clone()).or_insert_with(|| asset.name.clone());
    }
  }

  plan
    .downloads
    .iter()
    .map(|download| {
      let label = plan
        .install_overlay
        .as_ref()
        .and_then(|overlay| overlay.sdk.as_ref())
        .filter(|sdk| sdk.cache_key == download.cache_key)
        .map(|sdk| format!("渠道 SDK：{}", sdk.pkg_version_file_name))
        .or_else(|| asset_names.get(&download.id).map(|name| format!("游戏文件：{name}")))
        .unwrap_or_else(|| format!("资源对象：{}", download.id));
      (download.cache_key.clone(), truncate_progress_label(label))
    })
    .collect()
}

fn truncate_progress_label(value: String) -> String {
  const MAX_PROGRESS_LABEL_BYTES: usize = 256;
  if value.len() <= MAX_PROGRESS_LABEL_BYTES {
    return value;
  }
  let suffix = "…";
  let mut end = MAX_PROGRESS_LABEL_BYTES - suffix.len();
  while !value.is_char_boundary(end) {
    end -= 1;
  }
  format!("{}{}", &value[..end], suffix)
}

fn cleanup_task_partials(cache_root: &Path, task_id: &str) -> Result<(), String> {
  let entries = match fs::read_dir(cache_root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
    Err(error) => return Err(format!("读取游戏资源缓存目录失败：{error}")),
  };
  let suffix = format!(".part.{task_id}");
  for entry in entries {
    let path = entry.map_err(|error| format!("读取缓存临时文件失败：{error}"))?.path();
    if path.file_name().and_then(|name| name.to_str()).is_some_and(|name| name.ends_with(&suffix)) {
      fs::remove_file(path).map_err(|error| format!("清理任务下载临时文件失败：{error}"))?;
    }
  }
  Ok(())
}

fn persist_terminal_journal(
  task_root: &Path,
  journal: &mut TaskJournal,
  error: String,
  canceled: bool,
  app_handle: &AppHandle,
) {
  journal.state = if canceled { PackageTaskState::Canceled } else { PackageTaskState::Failed };
  journal.error_message = (!canceled).then_some(error);
  journal.current_file = None;
  journal.touch();
  if !canceled {
    log_install_failure(journal);
  }
  if let Err(persist_error) = journal::persist(task_root, journal) {
    log::error!("[game-package] 持久化终止任务日志失败：{persist_error}");
  }
  emit_state(app_handle, &journal.summary());
}

fn log_install_failure(journal: &TaskJournal) {
  if journal.target != PackagePlanTarget::Install {
    return;
  }
  log::error!(
    "[game-package][install][{}] 安装任务失败：{}",
    journal.task_id,
    journal.error_message.as_deref().unwrap_or("未提供错误信息")
  );
}

fn emit_state(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Err(error) = app_handle.emit("game-package://state", summary) {
    log::warn!("[game-package] 发送任务状态事件失败：{error}");
  }
}

fn emit_progress(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Err(error) = app_handle.emit("game-package://progress", summary) {
    log::warn!("[game-package] 发送任务进度事件失败：{error}");
  }
}

#[cfg(target_os = "windows")]
const GAME_PROCESS_NAME: &str = "YuanShen.exe";

#[cfg(target_os = "windows")]
pub(crate) fn is_game_running() -> bool {
  yuan_shen_process_ids().map(|ids| !ids.is_empty()).unwrap_or(true)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn is_game_running() -> bool {
  false
}

/// 结束国服客户端进程；未在运行时直接成功。
pub(crate) fn stop_game() -> Result<(), String> {
  #[cfg(not(target_os = "windows"))]
  {
    Ok(())
  }
  #[cfg(target_os = "windows")]
  {
    let ids = yuan_shen_process_ids()?;
    if ids.is_empty() {
      return Ok(());
    }
    for pid in ids {
      terminate_pid(pid)?;
    }
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
      let remaining = yuan_shen_process_ids()?;
      if remaining.is_empty() {
        return Ok(());
      }
      if Instant::now() >= deadline {
        return Err("游戏未在时限内退出，请手动关闭后再换服".to_string());
      }
      std::thread::sleep(Duration::from_millis(200));
    }
  }
}

#[cfg(target_os = "windows")]
fn yuan_shen_process_ids() -> Result<Vec<u32>, String> {
  use windows_sys::Win32::{
    Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
    System::Diagnostics::ToolHelp::{
      CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
      TH32CS_SNAPPROCESS,
    },
  };
  unsafe {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if snapshot == INVALID_HANDLE_VALUE {
      return Err(format!("枚举游戏进程失败：{}", std::io::Error::last_os_error()));
    }
    let mut entry: PROCESSENTRY32W = std::mem::zeroed();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
    let mut ids = Vec::new();
    if Process32FirstW(snapshot, &mut entry) != 0 {
      loop {
        let length =
          entry.szExeFile.iter().position(|value| *value == 0).unwrap_or(entry.szExeFile.len());
        if String::from_utf16_lossy(&entry.szExeFile[..length])
          .eq_ignore_ascii_case(GAME_PROCESS_NAME)
        {
          ids.push(entry.th32ProcessID);
        }
        if Process32NextW(snapshot, &mut entry) == 0 {
          break;
        }
      }
    }
    CloseHandle(snapshot);
    Ok(ids)
  }
}

#[cfg(target_os = "windows")]
fn terminate_pid(pid: u32) -> Result<(), String> {
  use windows_sys::Win32::{
    Foundation::CloseHandle,
    System::Threading::{OpenProcess, PROCESS_TERMINATE, TerminateProcess},
  };
  if pid == 0 {
    return Ok(());
  }
  unsafe {
    let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
    if handle.is_null() {
      return Err(format!("结束游戏进程失败：{}", std::io::Error::last_os_error()));
    }
    let ok = TerminateProcess(handle, 1);
    CloseHandle(handle);
    if ok == 0 {
      return Err(format!("结束游戏进程失败：{}", std::io::Error::last_os_error()));
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{ActiveTask, GamePackageManager};
  use crate::game::{
    journal::{self, TaskJournal},
    model::{PackageTaskState, SchemeId},
  };
  use std::{
    fs,
    path::PathBuf,
    sync::{
      Arc,
      atomic::{AtomicBool, Ordering},
    },
  };
  use tokio::sync::Mutex as AsyncMutex;
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-package-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn switch_journal(task_id: &str) -> TaskJournal {
    TaskJournal::from_switch(
      task_id.to_string(),
      "installation".to_string(),
      SchemeId::CnOfficial,
      SchemeId::CnBilibili,
      "a".repeat(64),
      0,
      0,
    )
  }

  #[test]
  fn cancel_reaps_orphaned_downloading_switch_journal() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let summary = manager.request_or_reap_cancel(&root.0, &task_id).unwrap().unwrap();
    assert_eq!(summary.state, PackageTaskState::Canceled);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Canceled);
  }

  #[test]
  fn cancel_live_task_only_sets_flag() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let canceled = Arc::new(AtomicBool::new(false));
    {
      let mut active = manager.active.lock().unwrap();
      active.by_task.insert(
        task_id.clone(),
        ActiveTask {
          installation_id: "installation".to_string(),
          canceled: Arc::clone(&canceled),
          paused: Arc::new(AtomicBool::new(false)),
          journal: Arc::new(AsyncMutex::new(journal)),
        },
      );
    }
    assert!(manager.request_or_reap_cancel(&root.0, &task_id).unwrap().is_none());
    assert!(canceled.load(Ordering::Acquire));
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Downloading);
  }

  #[test]
  fn list_persists_orphaned_downloading_as_failed() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let listed = tauri::async_runtime::block_on(manager.list(&root.0, None)).unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].state, PackageTaskState::Failed);
    assert_eq!(listed[0].error_message.as_deref(), Some("资源任务已中断，请恢复或放弃"));
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Failed);
  }

  #[test]
  fn list_keeps_ready_to_apply_without_worker() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::ReadyToApply;
    journal::persist(&root.0, &journal).unwrap();
    let listed = tauri::async_runtime::block_on(manager.list(&root.0, None)).unwrap();
    assert_eq!(listed[0].state, PackageTaskState::ReadyToApply);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::ReadyToApply);
  }

  #[test]
  fn cancel_terminal_journal_is_idempotent() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Failed;
    journal.error_message = Some("先前失败".to_string());
    journal::persist(&root.0, &journal).unwrap();
    let summary = manager.request_or_reap_cancel(&root.0, &task_id).unwrap().unwrap();
    assert_eq!(summary.state, PackageTaskState::Failed);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Failed);
    assert_eq!(loaded.error_message.as_deref(), Some("先前失败"));
  }
}
