//! 主模块，用于启动应用
//! @since Beta v0.8.8

mod client;
mod commands;
mod plugins;
mod tray;
mod utils;
#[cfg(target_os = "windows")]
mod watchdog;
#[cfg(target_os = "windows")]
mod yae;

use crate::client::create_mhy_client;
use crate::commands::{create_window, execute_js, get_dir_size, init_app, is_in_admin};
use crate::plugins::{build_log_plugin, build_si_plugin};
use tauri::{generate_context, generate_handler, Manager, Window, WindowEvent};

// 子窗口 label 的数组
pub const SUB_WINDOW_LABELS: [&str; 3] = ["Sub_window", "Dev_JSON", "mhy_client"];

// 窗口事件处理
fn window_event_handler(app: &Window, event: &WindowEvent) {
  match event {
    WindowEvent::CloseRequested { api, .. } => {
      api.prevent_close();
      if app.label() == "TeyvatGuide" {
        // 主窗口：隐藏到托盘而不是关闭
        app.hide().unwrap();
      } else {
        // 子窗口：直接销毁
        app.destroy().unwrap();
      }
    }
    _ => {}
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "windows")]
  {
    let args: Vec<String> = std::env::args().collect();
    let is_watchdog = args.iter().any(|a| a == "--watchdog");
    // 看门狗模式：不初始化 Tauri，不加载单例，纯等待 + 提权启动
    if is_watchdog {
      // 解析父进程 PID
      let mut ppid: u32 = 0;
      for a in &args {
        if let Some(rest) = a.strip_prefix("--ppid=") {
          if let Ok(v) = rest.parse::<u32>() {
            ppid = v;
          }
        }
      }
      // 等父进程退出后再 runas 启动管理员实例，传入 --elevated 标志
      let _ = watchdog::run_watchdog(ppid, "--elevated");
      // 看门狗退出
      return;
    }
  }

  // 正常应用实例：加载单例插件，防止多实例
  let mut builder = tauri::Builder::default();

  // 只有在正常/管理员实例下才加载单例插件；看门狗不加载
  builder = builder.plugin(build_si_plugin());
  builder
    .on_window_event(move |app, event| window_event_handler(app, event))
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(build_log_plugin())
    .setup(|_app| {
      // 创建系统托盘图标
      tray::create_tray(_app.handle())
        .expect("Failed to initialize system tray icon. Please check if the tray icon file exists and the system supports tray icons.");
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
      create_mhy_client,
      is_in_admin,
      #[cfg(target_os = "windows")]
      yae::call_yae_dll,
      #[cfg(target_os = "windows")]
      watchdog::run_with_admin
    ])
    .run(generate_context!())
    .expect("error while running tauri application");
}
