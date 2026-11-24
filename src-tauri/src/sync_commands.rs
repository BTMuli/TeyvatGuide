//! 主窗口专用的单向同步命令。快照只在 Rust 中流转，不经过 WebView。
//! @since Beta v0.14.1

use crate::sync_data::{
  SyncImportStats, export_sync_snapshot_internal, import_sync_snapshot_internal,
};
use crate::sync_webdav::{download_snapshot, upload_snapshot};
use serde::Deserialize;
use tauri::{Runtime, State, WebviewWindow, generate_handler, plugin};
use tauri_plugin_sql::DbInstances;
use tokio::sync::Mutex;

static SYNC_OPERATION: Mutex<()> = Mutex::const_new(());

/// 单次操作的连接信息；不做跨操作持久化或调试输出。
/// @since Beta v0.14.1
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Connection {
  address: String,
  username: String,
  password: String,
  use_proxy: bool,
  unsafe_http: bool,
}

/// Windows 唯一发布端：从连接预检到发布成功，整段操作互斥。
/// @since Beta v0.14.1
#[tauri::command]
async fn publish<R: Runtime>(
  window: WebviewWindow<R>,
  db_instances: State<'_, DbInstances>,
  connection: Connection,
) -> Result<String, String> {
  if !cfg!(target_os = "windows") || window.label() != "TeyvatGuide" {
    return Err("SYNC_NOT_ALLOWED：只允许在 Windows 主窗口上传记录".into());
  }
  let _guard = SYNC_OPERATION.try_lock().map_err(|_| "SYNC_BUSY：已有同步操作进行中")?;
  upload_snapshot(
    &connection.address,
    connection.username,
    connection.password,
    connection.use_proxy,
    connection.unsafe_http,
    export_sync_snapshot_internal(&db_instances),
  )
  .await
}

/// macOS 仅拉取。在网络读取及校验全部完成后才进入 SQLite 写入事务。
/// @since Beta v0.14.1
#[tauri::command]
async fn pull<R: Runtime>(
  window: WebviewWindow<R>,
  db_instances: State<'_, DbInstances>,
  connection: Connection,
  snapshot_id: Option<String>,
) -> Result<SyncImportStats, String> {
  if !cfg!(target_os = "macos") || window.label() != "TeyvatGuide" {
    return Err("SYNC_NOT_ALLOWED：只允许在 macOS 主窗口拉取记录".into());
  }
  let _guard = SYNC_OPERATION.try_lock().map_err(|_| "SYNC_BUSY：已有同步操作进行中")?;
  let snapshot = download_snapshot(
    &connection.address,
    connection.username,
    connection.password,
    connection.use_proxy,
    connection.unsafe_http,
    snapshot_id,
  )
  .await?;
  import_sync_snapshot_internal(&db_instances, &snapshot).await
}

/// 使用独立插件权限；仅本地主窗口获得调用权限，不改变普通应用命令的授权方式。
/// @since Beta v0.14.1
pub(crate) fn init<R: Runtime>() -> plugin::TauriPlugin<R> {
  plugin::Builder::new("record-sync").invoke_handler(generate_handler![publish, pull]).build()
}
