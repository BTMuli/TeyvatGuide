//! @file src/tray.rs
//! @desc 系统托盘模块，负责创建和管理系统托盘图标
//! @since Beta v0.8.8

use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

/// 创建系统托盘图标
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
  // 创建托盘菜单
  let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
  let quit_item = MenuItemBuilder::with_id("quit", "退出应用").build(app)?;

  let menu = MenuBuilder::new(app).item(&show_item).item(&quit_item).build()?;

  // 加载托盘图标
  // 在不同操作系统上，托盘图标的显示效果可能有所不同：
  // - Windows: 使用 .ico 格式获得最佳效果
  // - macOS: 支持 .icns 和 .png 格式
  // - Linux: 通常使用 .png 格式
  let icon_bytes = include_bytes!("../icons/32x32.png");

  // 使用 image crate 解码 PNG 图标
  let img = image::load_from_memory(icon_bytes)
    .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to load tray icon: {}", e)))?;
  let rgba = img.to_rgba8();
  let (width, height) = rgba.dimensions();
  let icon = Image::new_owned(rgba.into_raw(), width, height);

  // 创建托盘图标并设置事件处理
  let _tray = TrayIconBuilder::new()
    .icon(icon)
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
          for label in crate::SUB_WINDOW_LABELS.iter() {
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
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
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
