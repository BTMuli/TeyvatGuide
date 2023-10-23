//! @file src/main.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.3.3

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
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
  window.eval(&js).ok().unwrap();
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
              let sub = window.get_window(label).unwrap();
              sub.close().unwrap();
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
      client::create_mhy_client,
    ])
    .setup(|_app| {
      let _window = _app.get_window("TeyvatGuide").unwrap();
      #[cfg(debug_assertions)] // only include this code on debug builds
      _window.open_devtools(); // open the devtools on startup
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
