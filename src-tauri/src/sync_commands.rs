//! 主窗口的手动同步命令：Windows 发布和拉取，macOS 只拉取，快照不经过 WebView。
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

/// 仅 Windows 可发布，Windows 和 macOS 可拉取。
/// @since Beta v0.14.1
#[derive(Clone, Copy)]
enum SyncAction {
  Publish,
  Pull,
}

/// 同步命令与应用主窗口绑定，非主窗口和其他平台均不能调用。
/// @since Beta v0.14.1
fn permits_sync(os: &str, window_label: &str, action: SyncAction) -> bool {
  window_label == "TeyvatGuide"
    && match action {
      SyncAction::Publish => os == "windows",
      SyncAction::Pull => matches!(os, "windows" | "macos"),
    }
}

/// Windows 主窗口发布；从连接预检到发布成功，整段操作互斥。
/// @since Beta v0.14.1
#[tauri::command]
async fn publish<R: Runtime>(
  window: WebviewWindow<R>,
  db_instances: State<'_, DbInstances>,
  connection: Connection,
) -> Result<String, String> {
  if !permits_sync(std::env::consts::OS, window.label(), SyncAction::Publish) {
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

/// Windows 和 macOS 主窗口拉取；网络读取和完整校验完成后才进入 SQLite 写入事务。
/// @since Beta v0.14.1
#[tauri::command]
async fn pull<R: Runtime>(
  window: WebviewWindow<R>,
  db_instances: State<'_, DbInstances>,
  connection: Connection,
  snapshot_id: Option<String>,
) -> Result<SyncImportStats, String> {
  if !permits_sync(std::env::consts::OS, window.label(), SyncAction::Pull) {
    return Err("SYNC_NOT_ALLOWED：只允许在 Windows 或 macOS 主窗口拉取记录".into());
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

#[cfg(test)]
mod tests {
  use super::*;

  /// Windows 新增拉取权限，macOS 保持只读，其他平台和子窗口继续拒绝。
  /// @since Beta v0.14.1
  #[test]
  fn sync_actions_keep_the_platform_and_window_boundary() {
    for (os, publish, pull) in [
      ("windows", true, true),
      ("macos", false, true),
      ("linux", false, false),
      ("android", false, false),
      ("ios", false, false),
      ("", false, false),
    ] {
      assert_eq!(permits_sync(os, "TeyvatGuide", SyncAction::Publish), publish);
      assert_eq!(permits_sync(os, "TeyvatGuide", SyncAction::Pull), pull);
      for label in ["Sub_window", "mhy_client", "Dev_JSON", "", "teyvatguide"] {
        assert!(!permits_sync(os, label, SyncAction::Publish));
        assert!(!permits_sync(os, label, SyncAction::Pull));
      }
    }
  }
}
