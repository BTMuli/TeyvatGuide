//! @file src/tray.rs
//! @desc 系统托盘模块，负责创建和管理系统托盘图标
//! @since Beta v0.8.8

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

/// 创建系统托盘图标
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
  // 创建托盘菜单
  let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
  let quit_item = MenuItemBuilder::with_id("quit", "退出应用").build(app)?;
  
  let menu = MenuBuilder::new(app)
    .item(&show_item)
    .item(&quit_item)
    .build()?;

  // 创建托盘图标并设置事件处理
  // Tauri v2 会自动使用配置文件中指定的图标
  let _tray = TrayIconBuilder::new()
    .tooltip("Teyvat Guide")
    .menu(&menu)
    .on_menu_event(|app, event| {
      match event.id.as_ref() {
        "show" => {
          if let Some(window) = app.get_webview_window("TeyvatGuide") {
            let _ = window.show();
            let _ = window.set_focus();
          }
        }
        "quit" => {
          // 关闭所有子窗口
          const SUB_WINDOW_LABELS: [&str; 3] = ["Sub_window", "Dev_JSON", "mhy_client"];
          for label in SUB_WINDOW_LABELS.iter() {
            if let Some(sub) = app.get_webview_window(label) {
              let _ = sub.destroy();
            }
          }
          // 退出应用
          app.exit(0);
        }
        _ => {}
      }
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window("TeyvatGuide") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
    })
    .build(app)?;

  Ok(())
}
