//! @file src/client/mod.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.4.10

mod menu;
use tauri::async_runtime::block_on;
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WindowEvent};
use tauri_utils::config::WebviewUrl;

#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) {
  let mut mhy_window_config = handle.config().app.windows.get(1).unwrap().clone();
  mhy_window_config.visible = true;
  if url != "" {
    mhy_window_config.url = WebviewUrl::External(url.parse().unwrap());
  } else {
    mhy_window_config.url = menu::get_mhy_client_url(func.clone());
  }
  if func == "birthday"
    || func == "web_act"
    || url.starts_with("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html")
  {
    mhy_window_config.width = 1280.0;
    mhy_window_config.height = 720.0;
  }
  let window_get = handle.get_webview_window("mhy_client");
  if window_get.is_some() {
    let mhy_client = window_get.unwrap();
    mhy_client.on_window_event(move |e| {
      if let WindowEvent::Destroyed = e {
        let future = create_mhy_client(handle.clone(), func.clone(), url.clone());
        block_on(future);
      }
    });
    mhy_client.close().unwrap();
    return;
  }
  WebviewWindowBuilder::from_config(&handle, &mhy_window_config)
    .expect("failed to create mhy_client")
    .menu(menu::create_mhy_menu(func.clone(), handle.clone()))
    .build()
    .expect("failed to add menu")
    .on_menu_event(move |app, event| menu::handle_menu_event(app, event));
}
