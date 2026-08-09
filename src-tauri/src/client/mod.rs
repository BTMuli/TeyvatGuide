//! 客户端模块，负责操作米游社客户端
//! @since Beta v0.11.3

mod menu;
mod utils;

use crate::commands::with_window_label_lock;
use tauri::{AppHandle, LogicalSize, Manager, Size, WebviewWindowBuilder};
use tauri_utils::config::WebviewUrl;
use url::Url;

static BBS_VERSION: &'static str = "2.112.0";

#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) -> Result<(), String> {
  let mut win_width = 400.0;
  let mut win_height = 800.0;
  let win_ua = format!("Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/{BBS_VERSION}");
  let target_url: Url = if !url.is_empty() {
    url.parse().map_err(|error| format!("米游社链接无效：{error}"))?
  } else {
    menu::get_mhy_client_url(&func)?
  };
  if func == "birthday"
    || func == "web_act"
    || url.starts_with("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html")
  {
    win_width = 1280.0;
    win_height = 720.0;
  }

  with_window_label_lock("mhy_client", || {
    if let Some(window) = handle.get_webview_window("mhy_client") {
      let trans_size = utils::get_window_size_for_window(&window, win_width, win_height);
      window
        .set_size(Size::Logical(LogicalSize::new(trans_size.0, trans_size.1)))
        .map_err(|error| error.to_string())?;
      window.navigate(target_url.clone()).map_err(|error| error.to_string())?;
      window.center().map_err(|error| error.to_string())?;
      return window.set_focus().map_err(|error| error.to_string());
    }

    let trans_size = utils::get_window_size(&handle, win_width, win_height);
    WebviewWindowBuilder::new(&handle, "mhy_client", WebviewUrl::External(target_url))
      .inner_size(trans_size.0, trans_size.1)
      .title("米游社")
      .center()
      .user_agent(&win_ua)
      .additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required")
      // todo mac环境下没看到menu
      .menu(menu::create_mhy_menu(handle.clone())?)
      .on_menu_event(move |app, event| menu::handle_menu_event(app, event))
      .build()
      .map(|_| ())
      .map_err(|error| error.to_string())
  })
  .await
}
