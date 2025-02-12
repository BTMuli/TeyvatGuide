//! @file src/client/mod.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.6.10

mod menu;
mod utils;

use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tauri_utils::config::WebviewUrl;

static BBS_VERSION: &'static str = "2.81.1";

#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) {
  let mut win_width = 400.0;
  let mut win_height = 800.0;
  let win_ua = format!("Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/{BBS_VERSION}");
  let url_parse;
  if url != "" {
    url_parse = WebviewUrl::External(url.parse().unwrap());
  } else {
    url_parse = menu::get_mhy_client_url(func.clone());
  }
  if func == "birthday"
    || func == "web_act"
    || url.starts_with("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html")
  {
    win_width = 1280.0;
    win_height = 720.0;
  }
  let window_find = handle.get_webview_window("mhy_client");
  if window_find.is_some() {
    window_find.unwrap().destroy().unwrap();
    return;
  }
  let trans_size = utils::get_window_size(handle.clone(), win_width, win_height);
  WebviewWindowBuilder::new(&handle, "mhy_client", url_parse)
    .inner_size(trans_size.0, trans_size.1)
    .title("米游社")
    .center()
    .user_agent(&win_ua)
    // todo mac环境下没看到menu
    .menu(menu::create_mhy_menu(handle.clone()))
    .on_menu_event(move |app, event| menu::handle_menu_event(app, event))
    .build()
    .unwrap();
}
