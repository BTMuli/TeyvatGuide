//! 游戏安装检测、列表读取与可信启动命令。
//! @since Beta v0.11.5

use super::{
  hoyoplay::{create_http_client, create_snapshot, get_game_branches},
  installation::{derive_installation_id, inspect_executable},
  launch,
  model::{
    GameInstallation, InstallationStatus, PackagePlanSummary, PackagePlanTarget, PackageSnapshot,
    SchemeId,
  },
  planner::create_and_persist_plan,
};
use chrono::Utc;
use sqlx::Row;
use std::path::Path;
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

/// 校验已登记安装的身份和渠道状态，然后使用对应参数启动客户端。
#[tauri::command]
pub async fn game_launch(
  app_handle: AppHandle,
  db_instances: tauri::State<'_, DbInstances>,
  installation_id: String,
  ticket: Option<String>,
) -> Result<(), String> {
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

/// 生成 patch 优先、manifest diff 回退的不可变资源计划。
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
