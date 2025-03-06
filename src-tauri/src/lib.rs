//! @file src/lib.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.7.2

mod client;
mod commands;
mod plugins;
mod utils;

use crate::client::create_mhy_client;
use crate::commands::{create_window, execute_js, get_dir_size, init_app};
use crate::plugins::{build_log_plugin, build_si_plugin};
use tauri::{generate_context, generate_handler, Builder, Manager, Window, WindowEvent};

// 窗口事件处理
fn window_event_handler(app: &Window, event: &WindowEvent) {
  match event {
    WindowEvent::CloseRequested { api, .. } => {
      api.prevent_close();
      if app.label() == "TeyvatGuide" {
        // 子窗口 label 的数组
        const SUB_WINDOW_LABELS: [&str; 3] = ["Sub_window", "Dev_JSON", "mhy_client"];
        for label in SUB_WINDOW_LABELS.iter() {
          let sub = app.get_webview_window(label);
          if sub.is_some() {
            sub.unwrap().destroy().unwrap();
          }
        }
      }
      app.destroy().unwrap();
    }
    _ => {}
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  Builder::default()
    .on_window_event(move |app, event| window_event_handler(app, event))
    .plugin(build_si_plugin())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(build_log_plugin())
    .setup(|_app| {
      let _window = _app.get_webview_window("TeyvatGuide");
      #[cfg(debug_assertions)]
      if _window.is_some() {
        _window.unwrap().open_devtools();
      }
      Ok(())
    })
    .invoke_handler(generate_handler![
      init_app,
      create_window,
      execute_js,
      get_dir_size,
      create_mhy_client
    ])
    .run(generate_context!())
    .expect("error while running tauri application");
}
