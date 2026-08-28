//! 主模块，用于启动应用
//! @since Beta v0.11.5

mod client;
mod commands;
mod game;
#[cfg(target_os = "windows")]
mod loopback;
mod plugins;
mod tray;
mod utils;
#[cfg(target_os = "windows")]
mod watchdog;
#[cfg(target_os = "windows")]
mod yae;

use crate::client::create_mhy_client;
use crate::commands::{
  clear_app_cache, clear_app_logs, create_window, destroy_window, destroy_window_by_label,
  ensure_user_data_dir, execute_js, execute_sql_transaction, get_dir_size, hide_main_window,
  init_app, is_in_admin, is_msix, is_process_running, quit_app, read_text_scale,
};
use crate::game::commands::{
  game_http_proxy_configure, game_install_cancel, game_install_defender_exclude_add,
  game_install_defender_exclude_remove, game_install_defender_exclude_status,
  game_install_draft_cancel, game_install_draft_create, game_install_draft_dirs,
  game_install_draft_list, game_install_location_inspect, game_install_pause, game_install_plan,
  game_install_recover, game_install_start, game_install_status, game_installation_choose,
  game_installation_inspect, game_installation_list, game_installation_locate,
  game_installation_uninstall, game_is_running, game_launch, game_package_apply,
  game_package_audio_plan, game_package_cache_clear, game_package_cache_status,
  game_package_cancel, game_package_pause, game_package_plan, game_package_recover,
  game_package_snapshot, game_package_start, game_package_switch, game_package_switch_plan,
  game_package_task_cleanup, game_package_task_history_list, game_package_task_list,
  game_package_task_remove, game_package_verify, game_package_verify_cancel,
  game_package_verify_clear, game_package_verify_status, game_stop,
};
use crate::game::package::GamePackageManager;
use tauri::{Emitter, Manager, Window, WindowEvent, generate_context, generate_handler};

// 子窗口 label 的数组
pub const SUB_WINDOW_LABELS: [&str; 3] = ["Sub_window", "Dev_JSON", "mhy_client"];

// 窗口事件处理
fn window_event_handler(app: &Window, event: &WindowEvent) {
  match event {
    WindowEvent::CloseRequested { api, .. } => {
      api.prevent_close();
      if app.label() == "TeyvatGuide" {
        // 主窗口：发送事件让前端根据配置决定是隐藏还是退出
        let _ = app.emit("main-window-close-requested", ());
      } else {
        // 子窗口：异步销毁，避免在事件循环内等待 destroy 完成而重入死锁。
        let app_handle = app.app_handle().clone();
        let label = app.label().to_string();
        tauri::async_runtime::spawn(async move {
          if let Err(error) = destroy_window_by_label(&app_handle, &label).await {
            log::warn!("[window] 销毁窗口 {label} 失败：{error}");
          }
        });
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

  #[cfg(debug_assertions)]
  {
    builder = builder.plugin(tauri_plugin_mcp_bridge::init());
  }

  // 只有在正常/管理员实例下才加载单例插件；看门狗不加载
  builder = builder.plugin(tauri_plugin_single_instance::init(move |app, argv, _cwd| {
    if let Err(e) = app.emit("active_deep_link", argv) {
      eprintln!("emit active_deep_link failed: {}", e);
    }
  }));
  builder
    .manage(GamePackageManager::new())
    .on_window_event(move |app, event| window_event_handler(app, event))
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_cli::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_machine_uid::init())
    .plugin(plugins::custom_log::build_log_plugin())
    .setup(|_app| {
      // 创建系统托盘图标
      tray::create_tray(_app.handle())
        .expect("Failed to initialize system tray icon. Please check if the tray icon file exists and the system supports tray icons.");
      let _window = _app.get_webview_window("TeyvatGuide");
      #[cfg(target_os = "windows")]
      plugins::text_scale::init(_app.handle().clone());
      #[cfg(target_os = "windows")]
      plugins::uniwebview::init(_app.handle());
      #[cfg(debug_assertions)]
      if _window.is_some() {
        _window.unwrap().open_devtools();
      }
      Ok(())
    })
    .invoke_handler(generate_handler![
      init_app,
      create_window,
      destroy_window,
      execute_js,
      execute_sql_transaction,
      get_dir_size,
      clear_app_cache,
      clear_app_logs,
      ensure_user_data_dir,
      create_mhy_client,
      is_in_admin,
      hide_main_window,
      quit_app,
      read_text_scale,
      game_http_proxy_configure,
      game_installation_choose,
      game_installation_inspect,
      game_installation_list,
      game_installation_locate,
      game_installation_uninstall,
      #[cfg(target_os = "windows")]
      game_install_draft_create,
      #[cfg(target_os = "windows")]
      game_install_draft_list,
      #[cfg(target_os = "windows")]
      game_install_draft_dirs,
      #[cfg(target_os = "windows")]
      game_install_defender_exclude_add,
      #[cfg(target_os = "windows")]
      game_install_defender_exclude_remove,
      #[cfg(target_os = "windows")]
      game_install_defender_exclude_status,
      #[cfg(target_os = "windows")]
      game_install_location_inspect,
      #[cfg(target_os = "windows")]
      game_install_draft_cancel,
      #[cfg(target_os = "windows")]
      game_install_plan,
      #[cfg(target_os = "windows")]
      game_install_start,
      #[cfg(target_os = "windows")]
      game_install_status,
      #[cfg(target_os = "windows")]
      game_install_recover,
      #[cfg(target_os = "windows")]
      game_install_cancel,
      #[cfg(target_os = "windows")]
      game_install_pause,
      game_is_running,
      game_launch,
      game_stop,
      game_package_snapshot,
      game_package_plan,
      game_package_audio_plan,
      #[cfg(target_os = "windows")]
      game_package_cache_status,
      #[cfg(target_os = "windows")]
      game_package_cache_clear,
      #[cfg(target_os = "windows")]
      game_package_switch_plan,
      #[cfg(target_os = "windows")]
      game_package_switch,
      #[cfg(target_os = "windows")]
      game_package_verify,
      #[cfg(target_os = "windows")]
      game_package_verify_status,
      #[cfg(target_os = "windows")]
      game_package_verify_cancel,
      #[cfg(target_os = "windows")]
      game_package_verify_clear,
      #[cfg(target_os = "windows")]
      game_package_start,
      #[cfg(target_os = "windows")]
      game_package_apply,
      #[cfg(target_os = "windows")]
      game_package_cancel,
      #[cfg(target_os = "windows")]
      game_package_pause,
      #[cfg(target_os = "windows")]
      game_package_recover,
      #[cfg(target_os = "windows")]
      game_package_task_list,
      #[cfg(target_os = "windows")]
      game_package_task_history_list,
      #[cfg(target_os = "windows")]
      game_package_task_remove,
      game_package_task_cleanup,
      is_msix,
      is_process_running,
      #[cfg(target_os = "windows")]
      yae::call_yae_dll,
      #[cfg(target_os = "windows")]
      watchdog::run_with_admin,
      #[cfg(target_os = "windows")]
      loopback::enable_loopback_exemption
    ])
    .run(generate_context!())
    .expect("error while running tauri application");
}
