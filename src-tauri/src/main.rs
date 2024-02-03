//! @file src/main.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.4.3

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
mod client;
mod commands;
mod plugins;
mod utils;

// 窗口事件处理
fn window_event_handler(event: tauri::GlobalWindowEvent) -> () {
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
}

fn main() {
  tauri_plugin_deep_link::prepare("teyvatguide");
  tauri::Builder::default()
    .on_window_event(|event| window_event_handler(event))
    .plugin(plugins::build_sql_plugin())
    .plugin(plugins::build_log_plugin())
    .setup(|_app| {
      let _window = _app.get_window("TeyvatGuide");
      #[cfg(debug_assertions)]
      if _window.is_some() {
        _window.unwrap().open_devtools();
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::init_app,
      commands::register_deep_link,
      commands::create_window,
      commands::execute_js,
      commands::get_dir_size,
      client::create_mhy_client,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
