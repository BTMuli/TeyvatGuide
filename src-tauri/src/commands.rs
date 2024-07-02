//! @file src/commands.rs
//! @desc 命令模块，负责处理命令
//! @since Beta v0.5.0

use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tauri_utils::config::WindowConfig;

// 放一个常数，用来判断应用是否初始化
static mut APP_INITIALIZED: bool = false;

// 初始化应用
#[tauri::command]
pub async fn init_app(app_handle: AppHandle) {
  unsafe {
    if APP_INITIALIZED == true {
      return;
    }
  }
  dbg!("init_app");
  let _mhy = app_handle.get_webview_window("mhy_client");
  if _mhy.is_some() {
    // todo 这里应该延时，否则可能造成 macOS 平台的崩溃
    //  _mhy.unwrap().close().unwrap();
  }
  app_handle.emit("initApp", ()).unwrap();
  unsafe {
    APP_INITIALIZED = true;
  }
}

// 创建窗口
#[tauri::command]
pub async fn create_window(app_handle: tauri::AppHandle, label: String, mut option: WindowConfig) {
  let window_old = app_handle.get_webview_window(&label);
  option.label = label.clone();
  if window_old.is_some() {
    dbg!("window exists");
    window_old.unwrap().close().unwrap();
    return;
  }
  let window_new =
    Some(WebviewWindowBuilder::from_config(&app_handle, &option).expect("failed to create window"));
  window_new.unwrap();
}

// 执行 js
#[tauri::command]
pub async fn execute_js(app_handle: tauri::AppHandle, label: String, js: String) {
  let window = app_handle.get_webview_window(&label);
  if window.is_some() {
    window.unwrap().eval(&js).ok().unwrap();
  }
}

// 获取目录大小
#[tauri::command]
pub async fn get_dir_size(path: String) -> u64 {
  let walk_dir = walkdir::WalkDir::new(path);
  let mut size = 0;
  for entry in walk_dir {
    let entry = entry.unwrap();
    let file_type = entry.file_type();
    if file_type.is_file() {
      size += entry.metadata().unwrap().len();
    }
  }
  size
}
