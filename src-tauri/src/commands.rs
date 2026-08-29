// 命令模块，负责处理命令
// @since Beta v0.12.0

use crate::utils;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Acquire;
use std::{
  collections::HashMap,
  sync::{Arc, LazyLock, Mutex, Weak},
  time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindowBuilder};
use tauri_plugin_sql::{DbInstances, DbPool};
use tauri_utils::config::{WebviewUrl, WindowConfig};

// 放一个常数，用来判断应用是否初始化
static mut APP_INITIALIZED: bool = false;

/// 为每个窗口 label 提供独立的短生命周期互斥锁。
///
/// `Weak` 让不再被使用的 label 自动释放，避免不受信任的 label 参数永久占用全局表。
static WINDOW_LABEL_LOCKS: LazyLock<Mutex<HashMap<String, Weak<tauri::async_runtime::Mutex<()>>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

pub async fn with_window_label_lock<T>(
  label: &str,
  operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
  let lock = get_window_label_lock(label);
  let _guard = lock.lock().await;
  operation()
}

fn get_window_label_lock(label: &str) -> Arc<tauri::async_runtime::Mutex<()>> {
  {
    let mut locks = WINDOW_LABEL_LOCKS.lock().unwrap_or_else(|error| error.into_inner());
    locks.retain(|_, lock| lock.strong_count() > 0);
    match locks.get(label).and_then(Weak::upgrade) {
      Some(lock) => lock,
      None => {
        let lock = Arc::new(tauri::async_runtime::Mutex::new(()));
        locks.insert(label.to_string(), Arc::downgrade(&lock));
        lock
      }
    }
  }
}

pub async fn destroy_window_by_label<R: Runtime>(
  app_handle: &AppHandle<R>,
  label: &str,
) -> Result<(), String> {
  let lock = get_window_label_lock(label);
  let _guard = lock.lock().await;

  let Some(window) = app_handle.get_webview_window(label) else {
    return Ok(());
  };
  window.destroy().map_err(|error| error.to_string())?;

  let app_handle = app_handle.clone();
  let label = label.to_string();
  tauri::async_runtime::spawn_blocking(move || {
    for _ in 0..500 {
      if app_handle.get_webview_window(&label).is_none() {
        return Ok(());
      }
      std::thread::sleep(Duration::from_millis(10));
    }

    Err(format!("等待窗口 {label} 销毁超时"))
  })
  .await
  .map_err(|error| error.to_string())?
}

pub async fn destroy_sub_windows<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
  let mut tasks = Vec::with_capacity(crate::SUB_WINDOW_LABELS.len());
  for label in crate::SUB_WINDOW_LABELS {
    let app_handle = app_handle.clone();
    tasks.push(tauri::async_runtime::spawn(async move {
      destroy_window_by_label(&app_handle, label).await
    }));
  }
  for task in tasks {
    task.await.map_err(|error| error.to_string())??;
  }
  Ok(())
}

#[derive(Deserialize)]
pub struct SqlStatement {
  query: String,
  #[serde(default)]
  values: Vec<Value>,
}

/// 在同一 SQLite 连接中执行一组 SQL 语句。
#[tauri::command]
pub async fn execute_sql_transaction(
  db_instances: tauri::State<'_, DbInstances>,
  db: String,
  statements: Vec<SqlStatement>,
) -> Result<(), String> {
  let pool = {
    let instances = db_instances.0.read().await;
    match instances.get(&db) {
      Some(DbPool::Sqlite(pool)) => pool.clone(),
      #[allow(unreachable_patterns)]
      Some(_) => return Err("仅支持 SQLite 事务".to_string()),
      None => return Err(format!("数据库尚未加载：{db}")),
    }
  };

  let mut connection = pool.acquire().await.map_err(|error| error.to_string())?;
  sqlx::query("PRAGMA busy_timeout = 5000;")
    .execute(&mut *connection)
    .await
    .map_err(|error| error.to_string())?;
  let mut transaction = connection.begin().await.map_err(|error| error.to_string())?;

  let execute_result: Result<(), String> = async {
    for statement in statements {
      let mut query = sqlx::query(&statement.query);
      for value in statement.values {
        query = match value {
          Value::Null => query.bind(None::<String>),
          Value::Bool(value) => query.bind(value),
          Value::Number(value) => {
            if let Some(value) = value.as_i64() {
              query.bind(value)
            } else if let Some(value) = value.as_u64() {
              query.bind(i64::try_from(value).map_err(|error| error.to_string())?)
            } else {
              query.bind(value.as_f64().ok_or_else(|| "无法解析 SQL 数字参数".to_string())?)
            }
          }
          Value::String(value) => query.bind(value),
          Value::Array(_) | Value::Object(_) => {
            return Err("SQL 参数仅支持空值、布尔值、数字与字符串".to_string());
          }
        };
      }
      query.execute(&mut *transaction).await.map_err(|error| error.to_string())?;
    }
    Ok(())
  }
  .await;

  if let Err(error) = execute_result {
    let _ = transaction.rollback().await;
    return Err(error);
  }
  transaction.commit().await.map_err(|error| error.to_string())
}

// 初始化应用
#[tauri::command]
pub async fn init_app(app_handle: AppHandle) {
  unsafe {
    if APP_INITIALIZED == true {
      return;
    }
  }
  app_handle.emit("initApp", ()).unwrap();
  #[cfg(target_os = "windows")]
  {
    let sweep_handle = app_handle.clone();
    tauri::async_runtime::spawn_blocking(move || {
      let Ok(task_root) =
        sweep_handle.path().app_data_dir().map(|directory| directory.join("game-tasks"))
      else {
        return;
      };
      let manager = sweep_handle.state::<crate::game::package::GamePackageManager>();
      match manager.cleanup_expired_plans(&task_root) {
        Ok(summary) if summary.removed_count > 0 => {
          log::info!(
            "[game-package] 启动清理 {} 个失效未启动计划，释放 {} 字节",
            summary.removed_count,
            summary.removed_bytes
          );
        }
        Ok(_) => {}
        Err(error) => log::warn!("[game-package] 启动清理失效计划失败：{error}"),
      }
      if let Err(error) = crate::game::defender::sweep_stale_exclusions(&task_root) {
        log::warn!("[defender] 清理遗留排除失败：{error}");
      }
    });
  }
  unsafe {
    APP_INITIALIZED = true;
  }
}

// 创建窗口
#[tauri::command]
pub async fn create_window(
  app_handle: AppHandle,
  label: String,
  url: String,
  option: WindowConfig,
) -> Result<(), String> {
  with_window_label_lock(&label, || {
    if let Some(window) = app_handle.get_webview_window(&label) {
      let current_url = window.url().map_err(|error| error.to_string())?;
      let target_url = current_url.join(&url).map_err(|error| format!("窗口链接无效：{error}"))?;
      window.navigate(target_url).map_err(|error| error.to_string())?;
      window
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(option.width, option.height)))
        .map_err(|error| error.to_string())?;
      window.set_resizable(option.resizable).map_err(|error| error.to_string())?;
      window.set_title(&option.title).map_err(|error| error.to_string())?;
      if option.visible {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
      } else {
        window.hide().map_err(|error| error.to_string())?;
      }
      return window.center().map_err(|error| error.to_string());
    }

    WebviewWindowBuilder::new(&app_handle, &label, WebviewUrl::App(url.into()))
      .inner_size(option.width, option.height)
      .resizable(option.resizable)
      .visible(option.visible)
      .title(option.title)
      .center()
      .additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required")
      .build()
      .map(|_| ())
      .map_err(|error| error.to_string())
  })
  .await
}

#[tauri::command]
pub async fn destroy_window(app_handle: AppHandle, label: String) -> Result<(), String> {
  destroy_window_by_label(&app_handle, &label).await
}

// 执行 js
#[tauri::command]
pub async fn execute_js(app_handle: AppHandle, label: String, js: String) -> Result<(), String> {
  with_window_label_lock(&label, || {
    let window =
      app_handle.get_webview_window(&label).ok_or_else(|| format!("未找到窗口：{label}"))?;
    window.eval(js).map_err(|error| error.to_string())
  })
  .await
}

// 获取目录大小
#[tauri::command]
pub async fn get_dir_size(path: String) -> Result<u64, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let mut size = 0_u64;
    for entry in walkdir::WalkDir::new(path) {
      let entry = entry.map_err(|error| format!("读取目录内容失败：{error}"))?;
      if entry.file_type().is_file() {
        size = size
          .checked_add(
            entry.metadata().map_err(|error| format!("读取文件大小失败：{error}"))?.len(),
          )
          .ok_or_else(|| "目录大小溢出".to_string())?;
      }
    }
    Ok(size)
  })
  .await
  .map_err(|error| format!("目录大小统计任务异常退出：{error}"))?
}

/// 清除应用内嵌 WebView 的磁盘缓存。
#[tauri::command]
pub async fn clear_app_cache(app_handle: AppHandle) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    return clear_platform_cache(app_handle).await;
  }

  #[cfg(not(target_os = "windows"))]
  {
    clear_platform_cache(app_handle)
  }
}

/// Windows：通过 WebView2 官方接口清除磁盘缓存。
/// 运行中的 WebView 进程会占用缓存文件，直接删除目录会报“文件占用”，故改用 ClearBrowsingData。
#[cfg(target_os = "windows")]
async fn clear_platform_cache(app_handle: AppHandle) -> Result<(), String> {
  use std::time::Duration;
  use webview2_com::ClearBrowsingDataCompletedHandler;
  use webview2_com::Microsoft::Web::WebView2::Win32::{
    COREWEBVIEW2_BROWSING_DATA_KINDS_CACHE_STORAGE, COREWEBVIEW2_BROWSING_DATA_KINDS_DISK_CACHE,
    ICoreWebView2_13, ICoreWebView2Profile2,
  };
  use windows_core::Interface;

  // 主窗口与子窗口共享同一 WebView2 用户数据目录，清除任一窗口的 Profile 即可。
  let window = app_handle
    .get_webview_window("TeyvatGuide")
    .or_else(|| app_handle.get_webview_window("mhy_client"))
    .ok_or_else(|| "未找到可用的 WebView 窗口，无法清除缓存".to_string())?;

  let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
  let tx_handler = tx.clone();

  window
    .with_webview(move |webview| {
      let initiated: Result<(), String> = (|| -> webview2_com::Result<()> {
        unsafe {
          let controller = webview.controller();
          let core_webview = controller.CoreWebView2()?;
          let profile = core_webview.cast::<ICoreWebView2_13>()?.Profile()?;
          let profile2 = profile.cast::<ICoreWebView2Profile2>()?;
          let handler = ClearBrowsingDataCompletedHandler::create(Box::new(move |result| {
            let _ = tx_handler.send(result.map_err(|error| error.to_string()));
            Ok(())
          }));
          profile2.ClearBrowsingData(
            COREWEBVIEW2_BROWSING_DATA_KINDS_CACHE_STORAGE
              | COREWEBVIEW2_BROWSING_DATA_KINDS_DISK_CACHE,
            &handler,
          )?;
          Ok(())
        }
      })()
      .map_err(|error: webview2_com::Error| error.to_string());

      if let Err(error) = initiated {
        let _ = tx.send(Err(error));
      }
    })
    .map_err(|error| error.to_string())?;

  tauri::async_runtime::spawn_blocking(move || {
    rx.recv_timeout(Duration::from_secs(15)).unwrap_or_else(|error| {
      log::warn!("[clear_app_cache] 等待 WebView2 清除缓存完成回调失败：{error:?}");
      Ok(())
    })
  })
  .await
  .map_err(|error| error.to_string())?
}

/// macOS：直接删除 WebKit 缓存目录。
#[cfg(target_os = "macos")]
fn clear_platform_cache(app_handle: AppHandle) -> Result<(), String> {
  let app_cache_dir = app_handle.path().app_cache_dir().map_err(|error| error.to_string())?;
  let cache_dir = app_cache_dir.join("WebKit");
  if cache_dir.exists() {
    std::fs::remove_dir_all(&cache_dir)
      .map_err(|error| format!("清除缓存目录 {} 失败：{error}", cache_dir.display()))?;
  }
  Ok(())
}

/// 清理超过一周的按日切割日志；当前正在写入的文件不会被选中。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearAppLogsResult {
  pub removed: u32,
  pub failed: u32,
}

#[tauri::command]
pub fn clear_app_logs(app_handle: AppHandle) -> Result<ClearAppLogsResult, String> {
  let log_dir =
    app_handle.path().app_log_dir().map_err(|error| format!("读取日志目录失败：{error}"))?;
  if !log_dir.exists() {
    return Ok(ClearAppLogsResult { removed: 0, failed: 0 });
  }
  let today = chrono::Local::now().date_naive();
  let entries =
    std::fs::read_dir(&log_dir).map_err(|error| format!("读取日志目录失败：{error}"))?;
  let mut removed = 0_u32;
  let mut failed = 0_u32;
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取日志项失败：{error}"))?;
    let path = entry.path();
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
      continue;
    };
    if !is_expired_daily_log(name, today) {
      continue;
    }
    match std::fs::remove_file(&path) {
      Ok(()) => removed += 1,
      Err(error) => {
        log::warn!("[clear_app_logs] 删除 {name} 失败：{error}");
        failed += 1;
      }
    }
  }
  Ok(ClearAppLogsResult { removed, failed })
}

/// 确保用户数据目录存在；不走前端 fs 插件作用域。
#[tauri::command]
pub fn ensure_user_data_dir(path: String) -> Result<(), String> {
  let path = path.trim();
  if path.is_empty() {
    return Err("用户数据目录不能为空".to_string());
  }
  std::fs::create_dir_all(path).map_err(|error| format!("创建用户数据目录失败：{error}"))
}

/// 备份/恢复使用的目录项，字段名对齐 `@tauri-apps/plugin-fs` 的 `DirEntry`。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppFsDirEntry {
  pub name: String,
  pub is_directory: bool,
  pub is_file: bool,
  pub is_symlink: bool,
}

fn prepare_app_fs_path(path: &str) -> Result<std::path::PathBuf, String> {
  let trimmed = path.trim();
  if trimmed.is_empty() {
    return Err("路径不能为空".to_string());
  }
  let resolved = std::path::PathBuf::from(trimmed);
  if resolved.components().any(|component| component.as_os_str().eq_ignore_ascii_case("EBWebView"))
  {
    return Err("禁止访问 WebView 数据目录".to_string());
  }
  Ok(resolved)
}

/// 判断路径是否存在；不走前端 fs 插件作用域。
#[tauri::command]
pub fn app_fs_exists(path: String) -> Result<bool, String> {
  let path = prepare_app_fs_path(&path)?;
  Ok(path.exists())
}

/// 创建目录；不走前端 fs 插件作用域。
#[tauri::command]
pub fn app_fs_mkdir(path: String, recursive: Option<bool>) -> Result<(), String> {
  let path = prepare_app_fs_path(&path)?;
  if recursive.unwrap_or(false) {
    std::fs::create_dir_all(&path).map_err(|error| format!("创建目录失败：{error}"))
  } else {
    std::fs::create_dir(&path).map_err(|error| format!("创建目录失败：{error}"))
  }
}

/// 写入文本文件；不走前端 fs 插件作用域。
#[tauri::command]
pub fn app_fs_write_text_file(path: String, contents: String) -> Result<(), String> {
  let path = prepare_app_fs_path(&path)?;
  if let Some(parent) = path.parent() {
    if !parent.as_os_str().is_empty() {
      std::fs::create_dir_all(parent).map_err(|error| format!("创建文件目录失败：{error}"))?;
    }
  }
  std::fs::write(&path, contents).map_err(|error| format!("写入文件失败：{error}"))
}

/// 读取文本文件；不走前端 fs 插件作用域。
#[tauri::command]
pub fn app_fs_read_text_file(path: String) -> Result<String, String> {
  let path = prepare_app_fs_path(&path)?;
  std::fs::read_to_string(&path).map_err(|error| format!("读取文件失败：{error}"))
}

/// 读取目录项；不走前端 fs 插件作用域。
#[tauri::command]
pub fn app_fs_read_dir(path: String) -> Result<Vec<AppFsDirEntry>, String> {
  let path = prepare_app_fs_path(&path)?;
  let entries = std::fs::read_dir(&path).map_err(|error| format!("读取目录失败：{error}"))?;
  let mut result = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取目录项失败：{error}"))?;
    let file_type = entry.file_type().map_err(|error| format!("读取目录项类型失败：{error}"))?;
    result.push(AppFsDirEntry {
      name: entry.file_name().to_string_lossy().into_owned(),
      is_directory: file_type.is_dir(),
      is_file: file_type.is_file(),
      is_symlink: file_type.is_symlink(),
    });
  }
  Ok(result)
}

fn is_expired_daily_log(name: &str, today: chrono::NaiveDate) -> bool {
  let Some(stem) = name.strip_suffix(".log") else {
    return false;
  };
  let Ok(date) = chrono::NaiveDate::parse_from_str(stem, "%Y-%m-%d") else {
    return false;
  };
  today.signed_duration_since(date) >= chrono::TimeDelta::days(7)
}

/// 其它平台暂不支持清除 WebView 缓存。
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn clear_platform_cache(_app_handle: AppHandle) -> Result<(), String> {
  Err("当前平台不支持清除 WebView 缓存".to_string())
}

// 判断是否是管理员权限
#[tauri::command]
pub fn is_in_admin() -> bool {
  #[cfg(not(target_os = "windows"))]
  {
    return false;
  }
  #[cfg(target_os = "windows")]
  {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
      GetTokenInformation, TOKEN_ELEVATION, TOKEN_QUERY, TokenElevation,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
      let mut token_handle: HANDLE = std::ptr::null_mut();
      if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle) == 0 {
        return false;
      }

      let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
      let mut return_length = 0;

      let result = GetTokenInformation(
        token_handle,
        TokenElevation,
        &mut elevation as *mut _ as *mut _,
        std::mem::size_of::<TOKEN_ELEVATION>() as u32,
        &mut return_length,
      );

      CloseHandle(token_handle);

      result != 0 && elevation.TokenIsElevated != 0
    }
  }
}

// 隐藏主窗口到托盘
#[tauri::command]
pub async fn hide_main_window(app_handle: AppHandle) -> Result<(), String> {
  // 关闭所有子窗口
  destroy_sub_windows(app_handle.clone()).await?;
  // 隐藏主窗口
  if let Some(window) = app_handle.get_webview_window("TeyvatGuide") {
    window.hide().map_err(|error| error.to_string())?;
  }
  Ok(())
}

// 退出应用
#[tauri::command]
pub async fn quit_app(app_handle: AppHandle) -> Result<(), String> {
  // 关闭所有子窗口
  destroy_sub_windows(app_handle.clone()).await?;
  // 退出应用
  app_handle.exit(0);
  Ok(())
}

/// 获取当前系统的文本缩放比例（TextScaleFactor）
/// 返回值示例：1.0 表示 100%，1.25 表示 125%
#[tauri::command]
pub fn read_text_scale() -> Result<f64, String> {
  utils::read_text_scale_factor()
}

#[tauri::command]
pub fn is_msix() -> bool {
  #[cfg(not(windows))]
  {
    false
  }
  #[cfg(windows)]
  {
    use std::ptr;
    use widestring::U16CStr;
    use windows_sys::Win32::Foundation::ERROR_INSUFFICIENT_BUFFER;
    use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName;
    unsafe {
      let mut length: u32 = 0;
      let result = GetCurrentPackageFullName(&mut length, ptr::null_mut());
      if result != ERROR_INSUFFICIENT_BUFFER {
        println!("Not running in MSIX package. Error code: {}", result);
        return false;
      }
      let mut buffer = vec![0u16; length as usize];
      let result = GetCurrentPackageFullName(&mut length, buffer.as_mut_ptr());
      if result != 0 {
        println!("Failed to retrieve package full name. Error code: {}", result);
        return false;
      }
      let pkg_name = U16CStr::from_ptr_str(buffer.as_ptr());
      println!("MSIX Package Full Name: {}", pkg_name.to_string_lossy());
      true
    }
  }
}

#[tauri::command]
pub fn is_process_running(process_name: String) -> bool {
  #[cfg(not(target_os = "windows"))]
  {
    false
  }
  #[cfg(target_os = "windows")]
  {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
      CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
      TH32CS_SNAPPROCESS,
    };
    unsafe {
      // 创建进程快照
      let snapshot: HANDLE = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
      if snapshot == INVALID_HANDLE_VALUE {
        return false;
      }

      let mut entry: PROCESSENTRY32W = std::mem::zeroed();
      entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

      // 遍历进程列表
      if Process32FirstW(snapshot, &mut entry) != 0 {
        loop {
          // 将 exe 文件名转为 Rust String
          let exe_name = {
            let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
            String::from_utf16_lossy(&entry.szExeFile[..len])
          };

          if exe_name.eq_ignore_ascii_case(&process_name) {
            CloseHandle(snapshot);
            return true;
          }

          if Process32NextW(snapshot, &mut entry) == 0 {
            break;
          }
        }
      }

      CloseHandle(snapshot);
      false
    }
  }
}
