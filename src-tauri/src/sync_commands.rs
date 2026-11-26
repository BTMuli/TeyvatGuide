//! 主窗口的手动同步和本机凭据命令：快照与已保存的密码不返回 WebView。
//! @since Beta v0.14.2

use crate::sync_credentials::{self, CredentialStatus};
use crate::sync_data::{
  SyncImportStats, export_sync_snapshot_internal, import_sync_snapshot_internal,
};
use crate::sync_webdav::{download_snapshot, upload_snapshot};
use serde::Deserialize;
use std::path::PathBuf;
use tauri::{Manager, Runtime, State, WebviewWindow, async_runtime, generate_handler, plugin};
use tauri_plugin_sql::DbInstances;
use tokio::sync::Mutex;
use zeroize::Zeroizing;

static SYNC_OPERATION: Mutex<()> = Mutex::const_new(());
const SYNC_BUSY: &str = "SYNC_BUSY：已有同步或凭据操作进行中";

/// 单次操作的连接信息。不传密码时只允许使用匹配当前 HTTPS 连接的本机凭据。
/// @since Beta v0.14.2
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Connection {
  address: String,
  username: String,
  password: Option<String>,
  use_proxy: bool,
  unsafe_http: bool,
}

/// 仅 Windows 可发布，Windows 和 macOS 可拉取或操作本机凭据。
/// @since Beta v0.14.2
#[derive(Clone, Copy)]
enum SyncAction {
  Publish,
  Pull,
  Credential,
}

/// 同步命令与应用主窗口绑定，非主窗口和其他平台均不能调用。
/// @since Beta v0.14.2
fn permits_sync(os: &str, window_label: &str, action: SyncAction) -> bool {
  window_label == "TeyvatGuide"
    && match action {
      SyncAction::Publish => os == "windows",
      SyncAction::Pull | SyncAction::Credential => matches!(os, "windows" | "macos"),
    }
}

/// 由后端解析密码存储的固定路径，不采信窗口传入的文件路径。
/// @since Beta v0.14.2
fn credential_path<R: Runtime>(window: &WebviewWindow<R>) -> Result<PathBuf, &'static str> {
  window
    .path()
    .app_local_data_dir()
    .map(|directory| directory.join(sync_credentials::FILE_NAME))
    .map_err(|_| sync_credentials::STORAGE_UNAVAILABLE)
}

/// 操作系统密钥库和本机文件 I/O 不占用异步执行线程。
/// @since Beta v0.14.2
async fn credential_task<T: Send + 'static>(
  operation: impl FnOnce() -> Result<T, &'static str> + Send + 'static,
) -> Result<T, String> {
  async_runtime::spawn_blocking(operation)
    .await
    .map_err(|_| sync_credentials::STORAGE_UNAVAILABLE)?
    .map_err(str::to_owned)
}

/// 沿用同步主窗口边界控制凭据操作，包括只读的状态查询。
/// @since Beta v0.14.2
fn check_credential_permission<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), &'static str> {
  if !permits_sync(std::env::consts::OS, window.label(), SyncAction::Credential) {
    return Err("SYNC_NOT_ALLOWED：只允许在 Windows 或 macOS 主窗口操作本机密码");
  }
  Ok(())
}

/// 只读查询本机凭据状态；不暴露已保存密码。
/// @since Beta v0.14.2
#[tauri::command]
async fn credential_status<R: Runtime>(
  window: WebviewWindow<R>,
) -> Result<CredentialStatus, String> {
  check_credential_permission(&window)?;
  let path = credential_path(&window)?;
  credential_task(move || Ok(sync_credentials::status(&path))).await
}

/// 明确请求后才保存密码，和拉取、上传及忘记操作互斥。
/// @since Beta v0.14.2
#[tauri::command]
async fn save_credential<R: Runtime>(
  window: WebviewWindow<R>,
  address: String,
  username: String,
  password: String,
) -> Result<(), String> {
  let password = Zeroizing::new(password);
  check_credential_permission(&window)?;
  let path = credential_path(&window)?;
  let guard = SYNC_OPERATION.try_lock().map_err(|_| SYNC_BUSY)?;
  credential_task(move || {
    let _guard = guard;
    sync_credentials::save(&path, address, username, &password)
  })
  .await
}

/// 删除本机密码文件和专用硬件密钥；不访问 WebDAV 服务器。
/// @since Beta v0.14.2
#[tauri::command]
async fn forget_credential<R: Runtime>(window: WebviewWindow<R>) -> Result<(), String> {
  check_credential_permission(&window)?;
  let path = credential_path(&window)?;
  let guard = SYNC_OPERATION.try_lock().map_err(|_| SYNC_BUSY)?;
  credential_task(move || {
    let _guard = guard;
    sync_credentials::forget(&path)
  })
  .await
}

/// 显式输入优先；否则由 Rust 后端按 HTTPS 目录及账号检查并解锁，不把密码返回前端。
/// @since Beta v0.14.2
async fn resolve_password<R: Runtime>(
  window: &WebviewWindow<R>,
  address: &str,
  username: &str,
  password: Option<String>,
) -> Result<String, String> {
  if let Some(password) = password {
    return Ok(password);
  }
  let path = credential_path(window)?;
  let (address, username) = (address.to_owned(), username.to_owned());
  credential_task(move || sync_credentials::load(&path, &address, &username)).await
}

/// Windows 主窗口发布；从连接预检到发布成功，整段操作互斥。
/// @since Beta v0.14.2
#[tauri::command]
async fn publish<R: Runtime>(
  window: WebviewWindow<R>,
  db_instances: State<'_, DbInstances>,
  connection: Connection,
) -> Result<String, String> {
  if !permits_sync(std::env::consts::OS, window.label(), SyncAction::Publish) {
    return Err("SYNC_NOT_ALLOWED：只允许在 Windows 主窗口上传记录".into());
  }
  let _guard = SYNC_OPERATION.try_lock().map_err(|_| SYNC_BUSY)?;
  let password =
    resolve_password(&window, &connection.address, &connection.username, connection.password)
      .await?;
  upload_snapshot(
    &connection.address,
    connection.username,
    password,
    connection.use_proxy,
    connection.unsafe_http,
    export_sync_snapshot_internal(&db_instances),
  )
  .await
}

/// Windows 和 macOS 主窗口拉取；网络读取和完整校验完成后才进入 SQLite 写入事务。
/// @since Beta v0.14.2
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
  let _guard = SYNC_OPERATION.try_lock().map_err(|_| SYNC_BUSY)?;
  let password =
    resolve_password(&window, &connection.address, &connection.username, connection.password)
      .await?;
  let snapshot = download_snapshot(
    &connection.address,
    connection.username,
    password,
    connection.use_proxy,
    connection.unsafe_http,
    snapshot_id,
  )
  .await?;
  import_sync_snapshot_internal(&db_instances, &snapshot).await
}

/// 使用独立插件权限；仅本地主窗口获得调用权限，不改变普通应用命令的授权方式。
/// @since Beta v0.14.2
pub(crate) fn init<R: Runtime>() -> plugin::TauriPlugin<R> {
  plugin::Builder::new("record-sync")
    .invoke_handler(generate_handler![
      publish,
      pull,
      credential_status,
      save_credential,
      forget_credential
    ])
    .build()
}

#[cfg(test)]
mod tests {
  use super::*;

  /// 只允许 Windows 和 macOS 主窗口调用凭据命令；macOS 仍不能发布同步快照。
  /// @since Beta v0.14.2
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
      assert_eq!(permits_sync(os, "TeyvatGuide", SyncAction::Credential), pull);
      for label in ["Sub_window", "mhy_client", "Dev_JSON", "", "teyvatguide"] {
        assert!(!permits_sync(os, label, SyncAction::Publish));
        assert!(!permits_sync(os, label, SyncAction::Pull));
        assert!(!permits_sync(os, label, SyncAction::Credential));
      }
    }
  }
}
