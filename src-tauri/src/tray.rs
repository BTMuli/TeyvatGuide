// 系统托盘模块，负责创建和管理系统托盘图标
// @since Beta v0.12.1

#[cfg(target_os = "windows")]
use tauri::Emitter;
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

/// 显示主窗口（带最小化判断）
fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
  if let Some(window) = app.get_webview_window("TeyvatGuide") {
    // 如果窗口处于最小化状态，则恢复
    if let Ok(true) = window.is_minimized() {
      let _ = window.unminimize();
    }
    let _ = window.show();
    let _ = window.set_focus();
  }
}

/// 创建系统托盘图标
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
  // 创建托盘菜单
  #[cfg(target_os = "windows")]
  let launch_item = MenuItemBuilder::with_id("launch", "启动游戏").build(app)?;
  let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
  let separator = PredefinedMenuItem::separator(app)?;
  let quit_item = MenuItemBuilder::with_id("quit", "退出应用").build(app)?;
  // TODO: 窗口回正&最大化

  let menu = MenuBuilder::new(app);
  #[cfg(target_os = "windows")]
  let menu = menu.item(&launch_item);
  let menu = menu.item(&show_item).item(&separator).item(&quit_item).build()?;

  // 加载托盘图标
  let icon_bytes = include_bytes!("../icons/icon.ico");
  let img = image::load_from_memory(icon_bytes).map_err(|e| {
    tauri::Error::InvalidIcon(std::io::Error::new(std::io::ErrorKind::InvalidData, e))
  })?;
  let rgba = img.to_rgba8();
  let (width, height) = rgba.dimensions();
  let icon = Image::new_owned(rgba.into_raw(), width, height);

  // 创建托盘图标并设置事件处理
  let _tray = TrayIconBuilder::new()
    .icon(icon)
    .tooltip("Teyvat Guide")
    .menu(&menu)
    .on_menu_event(|app, event| match event.id.as_ref() {
      #[cfg(target_os = "windows")]
      "launch" => {
        if let Err(error) = app.emit("tray://launch-game", ()) {
          log::warn!("[tray] 发送启动游戏事件失败：{error}");
        }
      }
      "show" => {
        show_main_window(app);
      }
      "quit" => {
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
          if let Err(error) = crate::commands::destroy_sub_windows(app_handle.clone()).await {
            log::warn!("[tray] 销毁子窗口失败：{error}");
          }
          app_handle.exit(0);
        });
      }
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        let app = tray.app_handle();
        show_main_window(&app);
      }
    })
    .build(app)?;

  Ok(())
}
