//! 游戏安装检测、列表读取与可信启动命令。
//! @since Beta v0.11.5

use super::{
  cache,
  hoyoplay::{create_http_client, create_snapshot, get_game_branches},
  installation::{derive_installation_id, inspect_executable, locate_executables},
  installer, journal, launch,
  model::{
    GameInstallation, InstallationStatus, PackageCacheSummary, PackagePlanProgress,
    PackagePlanSummary, PackagePlanTarget, PackageRecoveryAction, PackageSnapshot,
    PackageSwitchSummary, PackageTaskCleanupSummary, PackageTaskOptions, PackageTaskState,
    PackageTaskSummary, PackageVerifySummary, SchemeId,
  },
  package::GamePackageManager,
  planner::{
    create_and_persist_install_plan, create_and_persist_plan, hydrate_and_validate_apply_plan,
    hydrate_and_validate_install_plan, hydrate_and_validate_plan, hydrate_and_validate_repair_plan,
    load_persisted_plan, persist_validated_plan, report_plan_progress,
  },
  switch::{self, create_and_persist_switch_plan},
};
use chrono::{Duration as ChronoDuration, Utc};
use serde::Serialize;
use sqlx::Row;
use std::{
  fs,
  path::{Path, PathBuf},
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager, ipc::Channel};
use tauri_plugin_machine_uid::MachineUidExt;
use tauri_plugin_sql::{DbInstances, DbPool};

const DATABASE_URL: &str = "sqlite:TeyvatGuide.db";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameUninstallProgress {
  completed: usize,
  total: usize,
  current: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameCacheClearProgress {
  completed: usize,
  total: usize,
  current: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameUninstallSummary {
  pub removed_files: usize,
  pub removed_dirs: usize,
}

/// 检测指定可执行文件，并返回当前磁盘上的游戏安装状态。
#[tauri::command]
pub fn game_installation_inspect(
  app_handle: AppHandle,
  executable_path: String,
) -> Result<GameInstallation, String> {
  inspect_executable(&executable_path, &read_machine_uid(&app_handle)?)
}

/// 读取全部已登记安装，逐项复检磁盘状态并迁移旧格式路径。
#[tauri::command]
pub async fn game_installation_list(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
) -> Result<Vec<GameInstallation>, String> {
  let machine_uid = read_machine_uid(&app_handle)?;
  let pool = sqlite_pool(&db_instances).await?;
  let rows = sqlx::query(
    "SELECT id, executablePath, rootPath, preferredScheme, audioLanguages, isChosen, lastSeen
     FROM GameInstallation
     ORDER BY isChosen DESC, lastSeen DESC",
  )
  .fetch_all(&pool)
  .await
  .map_err(|error| error.to_string())?;

  let mut installations = Vec::with_capacity(rows.len());
  for row in rows {
    let id = row.get::<String, _>("id");
    let executable_path = row.get::<String, _>("executablePath");
    let root_path = row.get::<String, _>("rootPath");
    let preferred_scheme =
      row.get::<Option<String>, _>("preferredScheme").as_deref().and_then(SchemeId::parse);
    let audio_languages_json = row.get::<String, _>("audioLanguages");
    let is_chosen = row.get::<bool, _>("isChosen");
    let last_seen = row.get::<String, _>("lastSeen");
    match inspect_executable(&executable_path, &machine_uid) {
      Ok(mut installation) => {
        if installation.id != id
          || installation.executable_path != executable_path
          || installation.root_path != root_path
        {
          sqlx::query(
            "UPDATE GameInstallation
             SET id = ?, executablePath = ?, rootPath = ?
             WHERE id = ?",
          )
          .bind(&installation.id)
          .bind(&installation.executable_path)
          .bind(&installation.root_path)
          .bind(&id)
          .execute(&pool)
          .await
          .map_err(|error| format!("迁移游戏安装路径失败：{error}"))?;
        }
        installation.preferred_scheme = preferred_scheme;
        installation.is_chosen = is_chosen;
        installation.last_seen = last_seen;
        installations.push(installation);
      }
      Err(error) => installations.push(GameInstallation {
        id,
        executable_path,
        root_path,
        scheme_id: None,
        preferred_scheme,
        status: InstallationStatus::Unsupported,
        status_message: error,
        version: None,
        channel: None,
        sub_channel: None,
        has_channel_sdk: false,
        audio_languages: serde_json::from_str(&audio_languages_json).unwrap_or_default(),
        is_chosen,
        last_seen,
      }),
    }
  }
  Ok(installations)
}

/// 从 Unity 日志静默定位国服 `YuanShen.exe`。
#[tauri::command]
pub fn game_installation_locate() -> Vec<String> {
  locate_executables()
}

/// 卸载已登记的游戏安装：删除 `YuanShen.exe` 所在目录的全部内容，保留空目录本身，
/// 并删除数据库登记。删除过程中通过 `game-uninstall://progress` 事件上报进度。
#[tauri::command]
pub async fn game_installation_uninstall(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  installation_id: String,
) -> Result<GameUninstallSummary, String> {
  if super::package::is_game_running() {
    return Err("游戏正在运行，请先退出游戏再卸载".to_string());
  }
  if journal::list(&game_task_root(&app_handle)?, Some(&installation_id))?
    .iter()
    .any(|task| task.state.blocks_launch())
  {
    return Err("该游戏安装存在进行中或等待恢复的资源提交，暂时不能卸载".to_string());
  }
  let pool = sqlite_pool(&db_instances).await?;
  let root_path =
    sqlx::query_scalar::<_, String>("SELECT rootPath FROM GameInstallation WHERE id = ? LIMIT 1")
      .bind(&installation_id)
      .fetch_optional(&pool)
      .await
      .map_err(|error| error.to_string())?
      .ok_or_else(|| "未找到已登记的游戏安装".to_string())?;
  let summary = tauri::async_runtime::spawn_blocking(move || {
    uninstall_game_root(&app_handle, Path::new(&root_path))
  })
  .await
  .map_err(|error| format!("卸载任务异常退出：{error}"))??;
  sqlx::query("DELETE FROM GameInstallation WHERE id = ?")
    .bind(&installation_id)
    .execute(&pool)
    .await
    .map_err(|error| format!("删除安装登记失败：{error}"))?;
  Ok(summary)
}

/// 删除游戏根目录的全部内容，保留根目录本身为空目录。
fn uninstall_game_root(
  app_handle: &AppHandle,
  root: &Path,
) -> Result<GameUninstallSummary, String> {
  if !root.is_absolute() || root.parent().is_none() || root.parent() == Some(root) {
    return Err("卸载目标不是安全的本地目录".to_string());
  }
  let metadata =
    fs::symlink_metadata(root).map_err(|error| format!("读取卸载目标失败：{error}"))?;
  if metadata.file_type().is_symlink()
    || installer::is_reparse_point(&metadata)
    || !metadata.is_dir()
  {
    return Err("卸载目标不是安全的普通目录".to_string());
  }
  let app_data =
    app_handle.path().app_data_dir().map_err(|error| format!("读取应用数据目录失败：{error}"))?;
  if paths_overlap(root, &app_data) {
    return Err("卸载目标与应用数据目录冲突，拒绝卸载".to_string());
  }
  let total = count_tree_entries(root)?;
  let mut removed_files = 0_usize;
  let mut removed_dirs = 0_usize;
  let mut completed = 0_usize;
  let mut last_emit = Instant::now() - Duration::from_millis(300);
  delete_tree_contents(
    root,
    app_handle,
    total,
    &mut completed,
    &mut last_emit,
    &mut removed_files,
    &mut removed_dirs,
  )?;
  emit_uninstall_progress(app_handle, completed, total, None);
  Ok(GameUninstallSummary { removed_files, removed_dirs })
}

fn count_tree_entries(root: &Path) -> Result<usize, String> {
  let mut count = 0_usize;
  count_tree_entries_inner(root, &mut count)?;
  Ok(count)
}

fn count_tree_entries_inner(path: &Path, count: &mut usize) -> Result<(), String> {
  for entry in fs::read_dir(path).map_err(|error| format!("读取卸载目录失败：{error}"))? {
    let entry = entry.map_err(|error| format!("读取卸载目录条目失败：{error}"))?;
    let child = entry.path();
    let metadata =
      fs::symlink_metadata(&child).map_err(|error| format!("读取卸载条目状态失败：{error}"))?;
    if metadata.file_type().is_symlink() || installer::is_reparse_point(&metadata) {
      return Err(format!("卸载目录包含符号链接或重解析点：{}", child.display()));
    }
    *count = count.saturating_add(1);
    if metadata.is_dir() {
      count_tree_entries_inner(&child, count)?;
    }
  }
  Ok(())
}

fn delete_tree_contents(
  path: &Path,
  app_handle: &AppHandle,
  total: usize,
  completed: &mut usize,
  last_emit: &mut Instant,
  removed_files: &mut usize,
  removed_dirs: &mut usize,
) -> Result<(), String> {
  for entry in fs::read_dir(path).map_err(|error| format!("读取卸载目录失败：{error}"))? {
    let entry = entry.map_err(|error| format!("读取卸载目录条目失败：{error}"))?;
    let child = entry.path();
    let metadata =
      fs::symlink_metadata(&child).map_err(|error| format!("读取卸载条目状态失败：{error}"))?;
    if metadata.file_type().is_symlink() || installer::is_reparse_point(&metadata) {
      return Err(format!("卸载目录包含符号链接或重解析点：{}", child.display()));
    }
    if metadata.is_dir() {
      delete_tree_contents(
        &child,
        app_handle,
        total,
        completed,
        last_emit,
        removed_files,
        removed_dirs,
      )?;
      fs::remove_dir(&child).map_err(|error| format!("删除卸载子目录失败：{error}"))?;
      *removed_dirs = removed_dirs.saturating_add(1);
    } else {
      fs::remove_file(&child).map_err(|error| format!("删除卸载文件失败：{error}"))?;
      *removed_files = removed_files.saturating_add(1);
    }
    *completed = completed.saturating_add(1);
    if last_emit.elapsed() >= Duration::from_millis(120) {
      emit_uninstall_progress(app_handle, *completed, total, Some(child.display().to_string()));
      *last_emit = Instant::now();
    }
  }
  Ok(())
}

fn emit_uninstall_progress(
  app_handle: &AppHandle,
  completed: usize,
  total: usize,
  current: Option<String>,
) {
  let _ = app_handle
    .emit("game-uninstall://progress", GameUninstallProgress { completed, total, current });
}

fn paths_overlap(left: &Path, right: &Path) -> bool {
  let left_key = path_key(left);
  let right_key = path_key(right);
  left_key == right_key
    || left_key.starts_with(&format!("{right_key}\\"))
    || right_key.starts_with(&format!("{left_key}\\"))
}

fn path_key(path: &Path) -> String {
  path.to_string_lossy().replace('/', "\\").to_ascii_lowercase()
}

/// 创建未登记的全新安装草稿；最终游戏目录和 staging 路径均由 Rust 派生。
#[tauri::command]
pub async fn game_install_draft_create(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  install_root: String,
  scheme: SchemeId,
  audio_languages: Vec<String>,
) -> Result<installer::InstallDraftSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let app_data_dir =
    app_handle.path().app_data_dir().map_err(|error| format!("读取应用数据目录失败：{error}"))?;
  let pool = sqlite_pool(&db_instances).await?;
  let rows = sqlx::query("SELECT rootPath FROM GameInstallation")
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("读取已登记游戏目录失败：{error}"))?;
  let mut protected_roots = vec![app_data_dir, task_root.clone()];
  protected_roots
    .extend(rows.into_iter().map(|row| PathBuf::from(row.get::<String, _>("rootPath"))));
  installer::create_draft(
    &task_root,
    &install_root,
    scheme,
    audio_languages,
    &read_machine_uid(&app_handle)?,
    &protected_roots,
  )
}

/// 读取所有仍需恢复或取消的全新安装草稿。
#[tauri::command]
pub fn game_install_draft_list(
  app_handle: AppHandle,
) -> Result<Vec<installer::InstallDraftSummary>, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  installer::list_draft_summaries(&task_root)
}

/// 校验新安装向导选择的直接安装目录，并识别空目录或已有游戏目录。
#[tauri::command]
pub async fn game_install_location_inspect(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  install_root: String,
) -> Result<installer::InstallLocationSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let app_data_dir =
    app_handle.path().app_data_dir().map_err(|error| format!("读取应用数据目录失败：{error}"))?;
  let pool = sqlite_pool(&db_instances).await?;
  let rows = sqlx::query("SELECT rootPath FROM GameInstallation")
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("读取已登记游戏目录失败：{error}"))?;
  let registered_roots =
    rows.into_iter().map(|row| PathBuf::from(row.get::<String, _>("rootPath"))).collect::<Vec<_>>();
  let protected_roots = vec![app_data_dir, task_root];
  installer::inspect_install_location(
    &install_root,
    &read_machine_uid(&app_handle)?,
    &protected_roots,
    &registered_roots,
  )
}

/// 为安装草稿请求 main 分支、语音资源和渠道 SDK，并持久化 Full 计划。
#[tauri::command]
pub async fn game_install_plan(
  app_handle: AppHandle,
  install_id: String,
  on_progress: Channel<PackagePlanProgress>,
) -> Result<PackagePlanSummary, String> {
  report_plan_progress(&on_progress, 1, "正在读取本地安装草稿");
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  let draft_id = installer::find_draft_id(&task_root, &install_id)?;
  let draft = installer::load_draft(&task_root, &draft_id)?;
  let client = create_http_client()?;
  report_plan_progress(&on_progress, 2, "正在读取远端分支");
  let branches = get_game_branches(&client, draft.scheme).await?;
  let overlay = installer::overlay_for_draft(&draft, &branches.main.tag);
  let summary = create_and_persist_install_plan(
    &client,
    &draft.install_id,
    draft.scheme,
    &draft.audio_languages,
    overlay,
    &branches,
    &task_root,
    on_progress,
  )
  .await?;
  let plan = load_persisted_plan(&task_root, &summary.plan_id)?;
  installer::mark_draft_plan(&task_root, &draft_id, &plan)?;
  Ok(summary)
}

/// 取消仅完成评估、尚未启动任务的安装草稿。
#[tauri::command]
pub fn game_install_draft_cancel(
  app_handle: AppHandle,
  install_id: String,
) -> Result<installer::InstallDraftSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  let draft_id = installer::find_draft_id(&task_root, &install_id)?;
  if journal::list(&task_root, Some(&install_id))?.iter().any(|task| {
    task.operation == "install"
      && !matches!(
        task.state,
        PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
      )
  }) {
    return Err("该安装已有未完成任务，请先取消或恢复原任务".to_string());
  }
  installer::cancel_draft(&task_root, &draft_id)
}

/// 启动全新安装下载；资源下载完成后自动进入 staging、发布和最终登记。
#[tauri::command]
pub async fn game_install_start(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  install_id: String,
  plan_id: String,
  options: Option<PackageTaskOptions>,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  let draft_id = installer::find_draft_id(&task_root, &install_id)?;
  let draft = installer::load_draft(&task_root, &draft_id)?;
  let plan = load_persisted_plan(&task_root, &plan_id)?;
  if plan.installation_id != draft.install_id {
    return Err("安装计划与草稿不匹配".to_string());
  }
  let client = create_http_client()?;
  let branches = get_game_branches(&client, draft.scheme).await?;
  let plan = hydrate_and_validate_install_plan(
    &draft.install_id,
    draft.scheme,
    &draft.audio_languages,
    &branches,
    plan,
  )
  .await?;
  persist_validated_plan(&task_root, &plan)?;
  let pool = sqlite_pool(&db_instances).await?;
  let context =
    super::package::InstallContext { pool, machine_uid: read_machine_uid(&app_handle)?, draft_id };
  manager.start_install(
    app_handle,
    task_root,
    plan,
    context.draft_id.clone(),
    options.unwrap_or_default(),
    context,
    false,
  )
}

/// 读取尚未登记安装的任务投影。
#[tauri::command]
pub async fn game_install_status(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  install_id: String,
) -> Result<Option<PackageTaskSummary>, String> {
  Ok(
    manager
      .list(&game_task_root(&app_handle)?, Some(&install_id))
      .await?
      .into_iter()
      .find(|summary| summary.target == PackagePlanTarget::Install),
  )
}

/// 恢复全新安装的下载、发布或最终登记阶段。
#[tauri::command]
pub async fn game_install_recover(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
  install_id: String,
  action: PackageRecoveryAction,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  let draft_id = installer::find_recovery_draft_id(&task_root, &install_id)?;
  let journal_path = journal::journal_path(&task_root, &task_id);
  let mut journal_value = journal::load(&journal_path)?;
  if journal_value.operation != "install" {
    return Err("该任务不是全新安装任务".to_string());
  }
  let plan = load_persisted_plan(&task_root, &journal_value.plan_id)?;
  let draft = installer::load_draft(&task_root, &draft_id)?;
  if plan.installation_id != draft.install_id || journal_value.installation_id != draft.install_id {
    return Err("安装恢复身份不匹配".to_string());
  }
  if matches!(action, PackageRecoveryAction::Resume)
    && manager.is_task_running(&task_id, &install_id)?
  {
    if journal_value.state.is_active() {
      return Ok(journal_value.summary());
    }
    manager.wait_for_task_idle(&task_id).await?;
    journal_value = journal::load(&journal_path)?;
  }
  if journal_value.state == PackageTaskState::Paused {
    manager.wait_for_task_idle(&task_id).await?;
    journal_value = journal::load(&journal_path)?;
  }
  let published = installer::has_published_installation(&draft)?;
  if matches!(action, PackageRecoveryAction::Rollback) {
    if journal_value.state == PackageTaskState::RecoveryRequired {
      return Err("RecoveryRequired 状态禁止删除暂存目录，请先完成安全复验".to_string());
    }
    if journal_value.state.is_active() {
      manager.cancel(&app_handle, &task_root, &task_id)?;
      return Ok(journal_value.summary());
    }
    if published {
      let machine_uid = read_machine_uid(&app_handle)?;
      installer::verify_published_installation(&task_root, &plan, &machine_uid)?;
      let _ = installer::abandon_published_draft(&task_root, &draft_id)?;
    } else {
      let _ = installer::cancel_draft(&task_root, &draft_id)?;
    }
    let mut canceled = journal_value;
    canceled.state = PackageTaskState::Canceled;
    canceled.error_message = None;
    canceled.touch();
    journal::persist(&task_root, &canceled)?;
    return Ok(canceled.summary());
  }
  if published {
    return complete_install_registration(
      &app_handle,
      &db_instances,
      &task_root,
      &task_id,
      &draft_id,
      &plan,
    )
    .await;
  }
  let client = create_http_client()?;
  let staging_path = Path::new(&draft.staging_root);
  let staging_exists = installer::path_occupied(staging_path)?;
  let marker_exists = installer::path_occupied(&staging_path.join(installer::MARKER_FILE_NAME))?;
  if !staging_exists && journal_value.state.requires_recovery() {
    return Err("安装暂存目录与最终目录均不存在，需要人工恢复".to_string());
  }
  if staging_exists && journal_value.state.requires_recovery() && !marker_exists {
    return Err("安装提交阶段缺少 marker，需要人工恢复".to_string());
  }
  let branches = get_game_branches(&client, draft.scheme).await?;
  let plan = hydrate_and_validate_install_plan(
    &draft.install_id,
    draft.scheme,
    &draft.audio_languages,
    &branches,
    plan,
  )
  .await?;
  persist_validated_plan(&task_root, &plan)?;
  let context = super::package::InstallContext {
    pool: sqlite_pool(&db_instances).await?,
    machine_uid: read_machine_uid(&app_handle)?,
    draft_id: draft_id.clone(),
  };
  manager.start_install(
    app_handle,
    task_root,
    plan,
    draft_id,
    PackageTaskOptions::default(),
    context,
    true,
  )
}

/// 请求取消未发布的全新安装任务，并在安全边界外清理草稿暂存目录。
#[tauri::command]
pub fn game_install_cancel(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
  install_id: String,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  let draft_id = installer::find_draft_id(&task_root, &install_id)?;
  manager.cancel(&app_handle, &task_root, &task_id)?;
  let journal_path = journal::journal_path(&task_root, &task_id);
  let journal_value = journal::load(&journal_path)?;
  if journal_value.state.is_active() || journal_value.state.blocks_launch() {
    return Ok(journal_value.summary());
  }
  let _ = installer::cancel_draft(&task_root, &draft_id)?;
  Ok(journal_value.summary())
}

/// 暂停全新安装的资源下载，保留安装草稿以便继续安装。
#[tauri::command]
pub async fn game_install_pause(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
  install_id: String,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  installer::ensure_windows_install_platform()?;
  manager.pause_install(&app_handle, &task_root, &task_id, &install_id).await
}

async fn complete_install_registration(
  app_handle: &AppHandle,
  db_instances: &DbInstances,
  task_root: &Path,
  task_id: &str,
  draft_id: &str,
  plan: &super::planner::PersistedPlan,
) -> Result<PackageTaskSummary, String> {
  let pool = sqlite_pool(db_instances).await?;
  let installation =
    installer::verify_published_installation(task_root, plan, &read_machine_uid(app_handle)?)?;
  installer::register_installation(&pool, &installation).await?;
  let path = journal::journal_path(task_root, task_id);
  let mut journal_value = journal::load(&path)?;
  journal_value.state = PackageTaskState::Completed;
  journal_value.error_message = None;
  journal_value.current_file = None;
  journal_value.touch();
  journal::persist(task_root, &journal_value)?;
  installer::set_draft_state(task_root, draft_id, installer::InstallDraftState::Completed)?;
  Ok(journal_value.summary())
}

/// 校验已登记安装的身份和渠道状态，然后使用对应参数启动客户端。
#[tauri::command]
pub async fn game_launch(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: String,
  ticket: Option<String>,
) -> Result<(), String> {
  let _reservation = manager.reserve_installation(&installation_id)?;
  if journal::list(&game_task_root(&app_handle)?, Some(&installation_id))?
    .iter()
    .any(|task| task.state.blocks_launch())
  {
    return Err("该游戏安装存在进行中或等待恢复的资源提交，暂时不能启动".to_string());
  }
  let pool = sqlite_pool(&db_instances).await?;
  let executable_path = sqlx::query_scalar::<_, String>(
    "SELECT executablePath FROM GameInstallation WHERE id = ? LIMIT 1",
  )
  .bind(&installation_id)
  .fetch_optional(&pool)
  .await
  .map_err(|error| error.to_string())?
  .ok_or_else(|| "未找到已登记的游戏安装".to_string())?;
  let machine_uid = read_machine_uid(&app_handle)?;
  let installation = inspect_executable(&executable_path, &machine_uid)?;
  if installation.id != installation_id
    || installation_id != derive_installation_id(&executable_path, &machine_uid)
  {
    return Err("游戏安装身份校验失败，请重新登记安装".to_string());
  }
  if installation.status != InstallationStatus::Known {
    return Err(installation.status_message);
  }
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  launch::launch(Path::new(&installation.executable_path), scheme, ticket)?;
  sqlx::query("UPDATE GameInstallation SET lastSeen = ? WHERE id = ?")
    .bind(Utc::now().to_rfc3339())
    .bind(&installation_id)
    .execute(&pool)
    .await
    .map_err(|error| error.to_string())?;
  Ok(())
}

/// 检测国服客户端 YuanShen.exe 是否仍在运行。
#[tauri::command]
pub fn game_is_running() -> bool {
  super::package::is_game_running()
}

/// 结束国服客户端进程；未在运行时直接成功。
#[tauri::command]
pub fn game_stop() -> Result<(), String> {
  super::package::stop_game()
}

/// 返回本地、主分支和预下载分支的只读版本快照。
#[tauri::command]
pub async fn game_package_snapshot(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  installation_id: String,
) -> Result<PackageSnapshot, String> {
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  Ok(create_snapshot(installation.id, installation.version, &branches))
}

/// 生成可执行的 manifest-diff 不可变资源计划；patch 策略仍可读取既有计划，但不能作为新的执行入口。
#[tauri::command]
pub async fn game_package_plan(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  installation_id: String,
  target: PackagePlanTarget,
  on_progress: Channel<PackagePlanProgress>,
) -> Result<PackagePlanSummary, String> {
  report_plan_progress(&on_progress, 1, "正在读取本地安装信息");
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  report_plan_progress(&on_progress, 2, "正在读取远端分支");
  let branches = get_game_branches(&client, scheme).await?;
  let app_data_dir =
    app_handle.path().app_data_dir().map_err(|error| format!("读取应用数据目录失败：{error}"))?;
  create_and_persist_plan(&installation, &branches, target, &app_data_dir, &on_progress).await
}

/// 评估官服与 B 服之间的同资源家族渠道转换；只生成计划，不修改游戏目录。
#[tauri::command]
pub async fn game_package_switch_plan(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  installation_id: String,
) -> Result<PackageSwitchSummary, String> {
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let task_root = game_task_root(&app_handle)?;
  create_and_persist_switch_plan(&installation, &branches, &task_root).await
}

/// 执行已评估的官服 ↔ B 服渠道转换：先缓存 SDK，再写前 journal 提交，最后改渠道配置。
#[tauri::command]
pub async fn game_package_switch(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  plan_id: String,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let plan = switch::load_persisted_switch_plan(&task_root, &plan_id)?;
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, plan.installation_id()).await?;
  manager.start_switch(app_handle, task_root, installation, plan, false)
}

/// 统计应用数据目录中的资源分片与渠道 SDK 缓存占用。
#[tauri::command]
pub async fn game_package_cache_status(
  app_handle: AppHandle,
) -> Result<PackageCacheSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  tauri::async_runtime::spawn_blocking(move || cache::status(&task_root))
    .await
    .map_err(|error| format!("缓存占用统计任务异常退出：{error}"))?
}

/// 清理资源分片与渠道 SDK 缓存；进行中或待恢复任务会阻止删除。
#[tauri::command]
pub async fn game_package_cache_clear(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  target: cache::CacheClearTarget,
) -> Result<PackageCacheSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let has_running_tasks =
    manager.has_running_tasks().map_err(|error| format!("读取缓存清理任务状态失败：{error}"))?;
  let app = app_handle.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let mut last_emit = Instant::now() - Duration::from_millis(300);
    let mut progress = move |completed: usize, total: usize, current: &str| {
      if last_emit.elapsed() >= Duration::from_millis(120) {
        let _ = app.emit(
          "game-cache://progress",
          GameCacheClearProgress { completed, total, current: Some(current.to_string()) },
        );
        last_emit = Instant::now();
      }
    };
    cache::clear_with_progress(&task_root, has_running_tasks, target, &mut progress)
  })
  .await
  .map_err(|error| format!("缓存清理任务异常退出：{error}"))?
}

/// 启动或恢复安装完整性校验；扫描在后台继续，页面刷新后可重连进度。
#[tauri::command]
pub async fn game_package_verify(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: String,
) -> Result<PackageVerifySummary, String> {
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let task_root = game_task_root(&app_handle)?;
  manager.start_verify(app_handle, task_root, installation, branches)
}

/// 读取已持久化或正在运行的完整性校验进度。
#[tauri::command]
pub async fn game_package_verify_status(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: String,
) -> Result<Option<PackageVerifySummary>, String> {
  manager.verify_status(&game_task_root(&app_handle)?, &installation_id)
}

/// 请求停止正在运行的完整性校验；已完成的文件进度会保留。
#[tauri::command]
pub fn game_package_verify_cancel(
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: String,
) -> Result<(), String> {
  manager.cancel_verify(&installation_id)
}

/// 清除完整性校验进度：停止正在运行的扫描，并删除可恢复会话。
#[tauri::command]
pub fn game_package_verify_clear(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: String,
) -> Result<(), String> {
  manager.clear_verify(&game_task_root(&app_handle)?, &installation_id)
}

/// 按不可变计划启动只写应用缓存的可恢复资源下载任务；支持正式更新与预下载。
#[tauri::command]
pub async fn game_package_start(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  plan_id: String,
  options: Option<PackageTaskOptions>,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let plan = load_persisted_plan(&task_root, &plan_id)?;
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let plan = hydrate_and_validate_plan(&installation, &branches, plan).await?;
  manager.start(app_handle, task_root, plan, options.unwrap_or_default(), false)
}

/// 消费 ReadyToApply 的正式更新或已转正预下载，完整校验后最后提交版本号。
#[tauri::command]
pub async fn game_package_apply(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let plan = load_persisted_plan(&task_root, &task_id)?;
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let plan = hydrate_and_validate_apply_plan(&installation, &branches, plan).await?;
  persist_validated_plan(&task_root, &plan)?;
  manager.apply(app_handle, task_root, installation, plan)
}

/// 在下一个下载安全边界请求取消资源任务；无活动 worker 时收尸空转日志。
#[tauri::command]
pub fn game_package_cancel(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
) -> Result<(), String> {
  manager.cancel(&app_handle, &game_task_root(&app_handle)?, &task_id)
}

/// 从 journal 重新读取当前资源任务，供页面重新挂载恢复投影。
#[tauri::command]
pub async fn game_package_task_list(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
  installation_id: Option<String>,
) -> Result<Vec<PackageTaskSummary>, String> {
  let task_root = game_task_root(&app_handle)?;
  manager
    .cleanup_tasks(&task_root, Some(ChronoDuration::days(7)))
    .map_err(|error| format!("自动清理过期游戏资源任务失败：{error}"))?;
  manager.list(&task_root, installation_id.as_deref()).await
}

/// 清理所有已结束且不再运行的资源任务日志，不触碰缓存内容或未完成任务。
#[tauri::command]
pub fn game_package_task_cleanup(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
) -> Result<PackageTaskCleanupSummary, String> {
  manager.cleanup_tasks(&game_task_root(&app_handle)?, None)
}

/// 恢复中断的下载/提交，或安全回滚任务拥有的临时文件与游戏备份。
#[tauri::command]
pub async fn game_package_recover(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  task_id: String,
  action: PackageRecoveryAction,
) -> Result<PackageTaskSummary, String> {
  let task_root = game_task_root(&app_handle)?;
  let journal_value = journal::load(&journal::journal_path(&task_root, &task_id))?;
  if journal_value.operation == "install" {
    return game_install_recover(
      app_handle,
      db_instances,
      manager,
      task_id,
      journal_value.installation_id,
      action,
    )
    .await;
  }
  if journal_value.operation == "switch" {
    return recover_switch_task(
      app_handle,
      db_instances,
      manager,
      task_root,
      journal_value,
      action,
    )
    .await;
  }
  if journal_value.repair.is_some() {
    let plan = load_persisted_plan(&task_root, &task_id)?;
    let pool = sqlite_pool(&db_instances).await?;
    let installation = load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
    if matches!(action, PackageRecoveryAction::Rollback) {
      let repair_plan =
        if journal_value.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
          let files = journal_value
            .repair
            .as_ref()
            .ok_or_else(|| "资源任务缺少修复清单".to_string())?
            .files
            .clone();
          let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
          let client = create_http_client()?;
          let branches = get_game_branches(&client, scheme).await?;
          Some(
            hydrate_and_validate_repair_plan(&installation, &branches, plan.clone(), &files)
              .await?,
          )
        } else {
          None
        };
      return manager.rollback_apply(
        &app_handle,
        &task_root,
        Path::new(&installation.root_path),
        &plan,
        repair_plan.as_ref(),
        false,
      );
    }
    let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
    let client = create_http_client()?;
    let branches = get_game_branches(&client, scheme).await?;
    let plan = hydrate_and_validate_apply_plan(&installation, &branches, plan).await?;
    persist_validated_plan(&task_root, &plan)?;
    return manager.apply(app_handle, task_root, installation, plan);
  }
  if journal_value.state.requires_recovery() {
    let plan = load_persisted_plan(&task_root, &task_id)?;
    let pool = sqlite_pool(&db_instances).await?;
    let installation = load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
    let retry = matches!(action, PackageRecoveryAction::Resume);
    let rolled_back = manager.rollback_apply(
      &app_handle,
      &task_root,
      Path::new(&installation.root_path),
      &plan,
      None,
      retry,
    )?;
    if !retry {
      return Ok(rolled_back);
    }
    let installation = load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
    let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
    let client = create_http_client()?;
    let branches = get_game_branches(&client, scheme).await?;
    let plan = hydrate_and_validate_apply_plan(&installation, &branches, plan).await?;
    persist_validated_plan(&task_root, &plan)?;
    return manager.apply(app_handle, task_root, installation, plan);
  }
  match action {
    PackageRecoveryAction::Resume => {
      let plan = load_persisted_plan(&task_root, &task_id)?;
      let pool = sqlite_pool(&db_instances).await?;
      let installation =
        load_trusted_installation(&app_handle, &pool, &plan.installation_id).await?;
      let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
      let client = create_http_client()?;
      let branches = get_game_branches(&client, scheme).await?;
      let plan = hydrate_and_validate_plan(&installation, &branches, plan).await?;
      manager.start(app_handle, task_root, plan, PackageTaskOptions::default(), true)
    }
    PackageRecoveryAction::Rollback => manager.rollback_download(&task_root, &task_id),
  }
}

/// 仅通过数据库中的安装 ID 解析路径，并重新验证磁盘身份与渠道状态。
async fn load_trusted_installation(
  app_handle: &AppHandle,
  pool: &sqlx::SqlitePool,
  installation_id: &str,
) -> Result<GameInstallation, String> {
  let executable_path = sqlx::query_scalar::<_, String>(
    "SELECT executablePath FROM GameInstallation WHERE id = ? LIMIT 1",
  )
  .bind(installation_id)
  .fetch_optional(pool)
  .await
  .map_err(|error| error.to_string())?
  .ok_or_else(|| "未找到已登记的游戏安装".to_string())?;
  let machine_uid = read_machine_uid(app_handle)?;
  let installation = inspect_executable(&executable_path, &machine_uid)?;
  if installation.id != installation_id
    || installation_id != derive_installation_id(&executable_path, &machine_uid)
  {
    return Err("游戏安装身份校验失败，请重新登记安装".to_string());
  }
  if installation.status != InstallationStatus::Known {
    return Err(installation.status_message);
  }
  Ok(installation)
}

async fn recover_switch_task(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  manager: tauri::State<'_, GamePackageManager>,
  task_root: PathBuf,
  journal_value: crate::game::journal::TaskJournal,
  action: PackageRecoveryAction,
) -> Result<PackageTaskSummary, String> {
  if journal_value.state.requires_recovery() || journal_value.apply.is_some() {
    let pool = sqlite_pool(&db_instances).await?;
    let installation =
      load_trusted_installation(&app_handle, &pool, &journal_value.installation_id).await?;
    let game_root = PathBuf::from(&installation.root_path);
    let request = switch::load_switch_commit(
      &task_root,
      &journal_value.plan_id,
      &journal_value.installation_id,
    )?;
    let retry = matches!(action, PackageRecoveryAction::Resume);
    let rolled_back =
      manager.rollback_switch(&app_handle, &task_root, &game_root, &request, retry)?;
    if !retry {
      return Ok(rolled_back);
    }
    let plan = switch::load_persisted_switch_plan(&task_root, &journal_value.plan_id)?;
    let installation =
      load_trusted_installation(&app_handle, &pool, plan.installation_id()).await?;
    return manager.start_switch(app_handle, task_root, installation, plan, true);
  }
  match action {
    PackageRecoveryAction::Resume => {
      let plan = switch::load_persisted_switch_plan(&task_root, &journal_value.plan_id)?;
      let pool = sqlite_pool(&db_instances).await?;
      let installation =
        load_trusted_installation(&app_handle, &pool, plan.installation_id()).await?;
      manager.start_switch(app_handle, task_root, installation, plan, true)
    }
    PackageRecoveryAction::Rollback => {
      manager.rollback_download(&task_root, &journal_value.plan_id)
    }
  }
}

fn game_task_root(app_handle: &AppHandle) -> Result<std::path::PathBuf, String> {
  app_handle
    .path()
    .app_data_dir()
    .map(|path| path.join("game-tasks"))
    .map_err(|error| format!("读取应用数据目录失败：{error}"))
}

/// 读取当前设备的稳定标识，用于派生仅在本机有效的安装 ID。
fn read_machine_uid(app_handle: &AppHandle) -> Result<String, String> {
  app_handle
    .machine_uid()
    .get_machine_uid()
    .map_err(|error| format!("读取设备标识失败：{error}"))?
    .id
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "读取设备标识失败：返回值为空".to_string())
}

/// 从 Tauri SQL 插件实例中取得游戏安装表所在的 SQLite 连接池。
async fn sqlite_pool(db_instances: &DbInstances) -> Result<sqlx::SqlitePool, String> {
  let instances = db_instances.0.read().await;
  match instances.get(DATABASE_URL) {
    Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
    #[allow(unreachable_patterns)]
    Some(_) => Err("游戏安装只支持 SQLite 数据库".to_string()),
    None => Err("数据库尚未加载，无法读取游戏安装".to_string()),
  }
}
