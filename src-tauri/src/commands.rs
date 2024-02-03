//! @file src/commands.rs
//! @desc 命令模块，负责处理命令
//! @since Beta v0.4.3

use tauri::{Manager, WindowBuilder};
use tauri_utils::config::WindowConfig;

// 放一个常数，用来判断应用是否初始化
static mut APP_INITIALIZED: bool = false;
static mut DEEP_LINK_REGISTERED: bool = false;

// 初始化应用
#[tauri::command]
pub async fn init_app(app_handle: tauri::AppHandle) {
  unsafe {
    if APP_INITIALIZED == true && DEEP_LINK_REGISTERED == true {
      return;
    }
  }
  dbg!("init_app");
  let _mhy = app_handle.get_window("mhy_client");
  if _mhy.is_some() {
    std::thread::sleep(std::time::Duration::from_millis(1000));
    _mhy.unwrap().close().unwrap();
  }
  app_handle.emit_all("initApp", ()).unwrap();
  unsafe {
    APP_INITIALIZED = true;
  }
}

// 注册deep link
#[tauri::command]
pub async fn register_deep_link(app_handle: tauri::AppHandle) {
  unsafe {
    if DEEP_LINK_REGISTERED == true {
      return;
    }
  }
  dbg!("register_deep_link");
  tauri_plugin_deep_link::register("teyvatguide", move |request| {
    dbg!(&request);
    app_handle.emit_all("active_deep_link", request).unwrap();
  })
  .unwrap();
  unsafe {
    DEEP_LINK_REGISTERED = true;
  }
}

// 创建窗口
#[tauri::command]
pub async fn create_window(app_handle: tauri::AppHandle, label: String, mut option: WindowConfig) {
  let window_old = app_handle.get_window(&label);
  option.label = label.clone();
  if window_old.is_some() {
    dbg!("window exists");
    window_old.unwrap().close().unwrap();
    return;
  }
  let window_new =
    Some(WindowBuilder::from_config(&app_handle, option).build().expect("failed to create window"));
  window_new.unwrap();
}

// 执行 js
#[tauri::command]
pub async fn execute_js(app_handle: tauri::AppHandle, label: String, js: String) {
  let window = app_handle.get_window(&label);
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
