//! 可恢复资源下载任务编排、安装互斥、取消与事件投影。
//! @since Beta v0.11.5

use super::{
  committer,
  downloader::{RateLimiter, download_object, prepare_cache_root},
  hoyoplay::{create_http_client, get_game_branches},
  journal::{self, TaskJournal},
  model::{
    GameInstallation, PackagePlanStrategy, PackageTaskOptions, PackageTaskState, PackageTaskSummary,
  },
  planner::{PersistedPlan, cached_chunk_matches, hydrate_and_validate_repair_plan},
};
use futures_util::{StreamExt, stream};
use std::{
  collections::HashMap,
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
}

struct ActiveTasks {
  by_task: HashMap<String, ActiveTask>,
  by_installation: HashMap<String, String>,
}

#[derive(Clone)]
struct ActiveTask {
  installation_id: String,
  canceled: Arc<AtomicBool>,
  journal: Arc<AsyncMutex<TaskJournal>>,
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
    }
  }

  pub(crate) fn start(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    options: PackageTaskOptions,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    if is_game_running() {
      return Err("游戏仍在运行，无法开始资源任务".to_string());
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
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
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
        concurrency,
        options.max_bytes_per_second,
      )
      .await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn cancel(&self, task_id: &str) -> Result<(), String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    let task = active.by_task.get(task_id).ok_or_else(|| "任务当前未在运行".to_string())?;
    task.canceled.store(true, Ordering::Release);
    Ok(())
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
    let shared_journal = Arc::new(AsyncMutex::new(journal_value));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
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
    let mut summaries = journal::list(task_root, installation_id)?
      .into_iter()
      .map(|journal| {
        let mut summary = journal.summary();
        if summary.state.requires_recovery() {
          summary.state = PackageTaskState::RecoveryRequired;
        }
        (summary.task_id.clone(), summary)
      })
      .collect::<HashMap<_, _>>();
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
    let downloads = stream::iter(pending.into_iter().map(|download| {
      let cache_root = cache_root.clone();
      let task_id = repair_plan.plan_id.clone();
      let canceled = Arc::clone(&canceled);
      let limiter = Arc::clone(&limiter);
      let client = client.clone();
      async move {
        download_object(&client, &cache_root, &download, &task_id, &canceled, &limiter).await
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
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
) {
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::Downloading;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      journal_value.state = PackageTaskState::Failed;
      journal_value.error_message = Some(error);
      journal_value.touch();
      emit_state(&app_handle, &journal_value.summary());
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
  let started_at = Instant::now();
  let mut last_emit = Instant::now() - Duration::from_secs(1);
  let mut last_persist = Instant::now();
  let mut fatal_error = None;
  let downloads = stream::iter(pending.into_iter().map(|download| {
    let cache_root = cache_root.to_path_buf();
    let task_id = plan.plan_id.clone();
    let canceled = Arc::clone(&canceled);
    let limiter = Arc::clone(&limiter);
    let client = download_client.clone();
    async move {
      let result =
        download_object(&client, &cache_root, &download, &task_id, &canceled, &limiter).await;
      (download.cache_key, result)
    }
  }))
  .buffer_unordered(concurrency);
  futures_util::pin_mut!(downloads);
  while let Some((cache_key, result)) = downloads.next().await {
    match result {
      Ok(downloaded) => {
        let mut journal_value = journal.lock().await;
        if !journal_value.owned_cache_files.contains(&downloaded.cache_key) {
          journal_value.owned_cache_files.push(downloaded.cache_key);
          journal_value.committed_step = journal_value.owned_cache_files.len();
          journal_value.downloaded_bytes =
            journal_value.downloaded_bytes.saturating_add(downloaded.bytes);
        }
        journal_value.current_file = Some(cache_key);
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
        if !canceled.load(Ordering::Acquire) {
          fatal_error = Some(error);
          canceled.store(true, Ordering::Release);
        }
      }
    }
  }

  let mut journal_value = journal.lock().await;
  rebuild_completed_cache(&mut journal_value, &plan, cache_root);
  journal_value.current_file = None;
  journal_value.bytes_per_second = 0;
  journal_value.eta_seconds = None;
  if let Some(error) = fatal_error {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some(error);
  } else if canceled.load(Ordering::Acquire) {
    journal_value.state = PackageTaskState::Canceled;
    journal_value.error_message = None;
  } else if journal_value.owned_cache_files.len() == plan.downloads.len() {
    journal_value.state = PackageTaskState::ReadyToApply;
    journal_value.error_message = None;
  } else {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some("下载结束后仍有资源未通过完整性校验".to_string());
  }
  journal_value.touch();
  if let Err(error) = journal::persist(task_root, &journal_value) {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some(error);
    journal_value.touch();
  }
  emit_progress(&app_handle, &journal_value.summary());
  emit_state(&app_handle, &journal_value.summary());
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
pub(crate) fn is_game_running() -> bool {
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
      return true;
    }
    let mut entry: PROCESSENTRY32W = std::mem::zeroed();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
    if Process32FirstW(snapshot, &mut entry) != 0 {
      loop {
        let length =
          entry.szExeFile.iter().position(|value| *value == 0).unwrap_or(entry.szExeFile.len());
        if String::from_utf16_lossy(&entry.szExeFile[..length]).eq_ignore_ascii_case("YuanShen.exe")
        {
          CloseHandle(snapshot);
          return true;
        }
        if Process32NextW(snapshot, &mut entry) == 0 {
          break;
        }
      }
    }
    CloseHandle(snapshot);
  }
  false
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn is_game_running() -> bool {
  false
}
