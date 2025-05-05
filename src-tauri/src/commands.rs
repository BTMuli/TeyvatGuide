//! @file src/commands.rs
//! @desc 命令模块，负责处理命令
//! @since Beta v0.7.4

use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};
use tauri_utils::config::{WebviewUrl, WindowConfig};

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
  app_handle.emit("initApp", ()).unwrap();
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
) {
  let window_find = app_handle.get_webview_window(&label);
  if window_find.is_some() {
    window_find.unwrap().destroy().unwrap();
    return;
  }
  let url_parse = WebviewUrl::App(url.parse().unwrap());
  WebviewWindowBuilder::new(&app_handle, &label, url_parse)
    .inner_size(option.width, option.height)
    .resizable(option.resizable)
    .visible(option.visible)
    .title(option.title)
    .center()
    .additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required")
    .build()
    .unwrap();
}

// 执行 js
#[tauri::command]
pub async fn execute_js(app_handle: AppHandle, label: String, js: String) {
  let window = app_handle.get_webview_window(&label);
  if window.is_some() {
    window.unwrap().eval(js).unwrap();
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
