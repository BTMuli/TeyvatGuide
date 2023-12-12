//! @file src/main.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.3.4

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowBuilder};
use tauri_utils::config::WindowConfig;
mod client;

// 放一个常数，用来判断应用是否初始化
static mut APP_INITIALIZED: bool = false;
static mut DEEP_LINK_REGISTERED: bool = false;

#[tauri::command]
async fn init_app(app_handle: tauri::AppHandle) {
  dbg!("init_app");
  unsafe {
    if APP_INITIALIZED == true && DEEP_LINK_REGISTERED == true {
      return;
    }
  }
  app_handle.emit_all("initApp", ()).unwrap();
  unsafe {
    APP_INITIALIZED = true;
  }
}

#[tauri::command]
async fn register_deep_link(app_handle: tauri::AppHandle) {
  dbg!("register_deep_link");
  unsafe {
    if DEEP_LINK_REGISTERED == true {
      return;
    }
  }
  tauri_plugin_deep_link::register("teyvatguide", move |request| {
    dbg!(&request);
    app_handle.emit_all("active_deep_link", request).unwrap();
  })
  .unwrap();
  unsafe {
    DEEP_LINK_REGISTERED = true;
  }
}

// 执行 js
#[tauri::command]
async fn execute_js(app_handle: tauri::AppHandle, label: String, js: String) {
  let window = app_handle.get_window(&label).unwrap();
  dbg!(&js);
  window.eval(&js).ok().unwrap();
}

// 创建窗口
#[tauri::command]
async fn create_window(app_handle: tauri::AppHandle, label: String, mut option: WindowConfig) {
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

// 读取目录大小
#[tauri::command]
async fn get_dir_size(path: String) -> u64 {
  dbg!(&path);
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

fn main() {
  tauri_plugin_deep_link::prepare("teyvatguide");
  tauri::Builder::default()
    .on_window_event(|event| {
      match event.event() {
        tauri::WindowEvent::CloseRequested { api, .. } => {
          api.prevent_close();
          let window = event.window().clone();
          if window.label() == "TeyvatGuide" {
            // 子窗口 label 的数组
            const SUB_WINDOW_LABELS: [&str; 3] = ["Sub_window", "Dev_JSON", "mhy_client"];
            for label in SUB_WINDOW_LABELS.iter() {
              let sub = window.get_window(label);
              if sub.is_some() {
                sub.unwrap().close().unwrap();
              }
            }
          }
          window.close().unwrap();
        }
        _ => {}
      }
    })
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      register_deep_link,
      init_app,
      execute_js,
      create_window,
      get_dir_size,
      client::create_mhy_client,
    ])
    .setup(|_app| {
      let _window = _app.get_window("TeyvatGuide").unwrap();
      let _mhy = _app.get_window("mhy_client");
      if _mhy.is_some() {
        std::thread::spawn(move || {
          std::thread::sleep(std::time::Duration::from_secs(2));
          dbg!("close mhy_client");
          _mhy.unwrap().close().unwrap();
        });
      }
      #[cfg(debug_assertions)] // only include this code on debug builds
      _window.open_devtools(); // open the devtools on startup
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
