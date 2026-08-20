//! 游戏安装检测、列表读取与可信启动命令。
//! @since Beta v0.11.5

use super::{
  cache,
  hoyoplay::{create_http_client, create_snapshot, get_game_branches},
  installation::{derive_installation_id, inspect_executable, locate_executables},
  journal, launch,
  model::{
    GameInstallation, InstallationStatus, PackageCacheSummary, PackagePlanSummary,
    PackagePlanTarget, PackageRecoveryAction, PackageSnapshot, PackageSwitchSummary,
    PackageTaskOptions, PackageTaskSummary, PackageVerifySummary, SchemeId,
  },
  package::GamePackageManager,
  planner::{
    create_and_persist_plan, hydrate_and_validate_apply_plan, hydrate_and_validate_plan,
    hydrate_and_validate_repair_plan, load_persisted_plan, persist_validated_plan,
  },
  switch::{self, create_and_persist_switch_plan},
};
use chrono::Utc;
use sqlx::Row;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tauri_plugin_machine_uid::MachineUidExt;
use tauri_plugin_sql::{DbInstances, DbPool};

const DATABASE_URL: &str = "sqlite:TeyvatGuide.db";

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
) -> Result<PackagePlanSummary, String> {
  let pool = sqlite_pool(&db_instances).await?;
  let installation = load_trusted_installation(&app_handle, &pool, &installation_id).await?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let app_data_dir =
    app_handle.path().app_data_dir().map_err(|error| format!("读取应用数据目录失败：{error}"))?;
  create_and_persist_plan(&installation, &branches, target, &app_data_dir).await
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
pub fn game_package_cache_status(app_handle: AppHandle) -> Result<PackageCacheSummary, String> {
  cache::status(&game_task_root(&app_handle)?)
}

/// 清理资源分片与渠道 SDK 缓存；进行中或待恢复任务会阻止删除。
#[tauri::command]
pub fn game_package_cache_clear(
  app_handle: AppHandle,
  manager: tauri::State<'_, GamePackageManager>,
) -> Result<PackageCacheSummary, String> {
  cache::clear(&game_task_root(&app_handle)?, manager.has_running_tasks()?)
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
  manager.list(&game_task_root(&app_handle)?, installation_id.as_deref()).await
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
