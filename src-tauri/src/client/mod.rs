//! @file src/client/mod.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.5.0

mod menu;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tauri_utils::config::WebviewUrl;

#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) {
  let mut option = handle.config().app.windows.get(1).unwrap().clone();
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
    option.width = 1280.0;
    option.height = 720.0;
  }
  let window_find = handle.get_webview_window("mhy_client");
  if window_find.is_some() {
    window_find.unwrap().destroy().unwrap();
    return;
  }
  WebviewWindowBuilder::new(&handle, "mhy_client", url_parse)
    .inner_size(option.width, option.height)
    .title(option.title)
    .center()
    .user_agent(option.user_agent.unwrap().as_str())
    .menu(menu::create_mhy_menu(handle.clone()))
    .on_menu_event(move |app, event| menu::handle_menu_event(app, event))
    .build()
    .unwrap();
}
