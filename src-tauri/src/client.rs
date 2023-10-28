//! @file src/client.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.3.4

use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};
use url::Url;

// 获取米游社客户端入口地址
fn get_mhy_client_url(func: String) -> WindowUrl {
  let mut url_res: Url = "https://bbs.mihoyo.com/ys/".parse().unwrap();
  if func == "sign_in" {
    url_res = "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501"
      .parse()
      .unwrap();
  } else if func == "game_record" {
    url_res =
      "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen".parse().unwrap();
  }
  return WindowUrl::External(url_res);
}

// 操作米游社客户端
#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) {
  let mut mhy_window_config = handle.config().tauri.windows.get(1).unwrap().clone();
  // 如果没有传入 url 参数，则使用默认的米游社客户端入口地址
  if url != "" {
    mhy_window_config.url = WindowUrl::External(url.parse().unwrap());
  } else {
    mhy_window_config.url = get_mhy_client_url(func.clone());
  }
  if func == "birthday" {
    mhy_window_config.width = 1280.0;
    mhy_window_config.height = 720.0;
    mhy_window_config.resizable = false;
  }
  let has_mhy_client = handle.get_window("mhy_client").is_some();
  if has_mhy_client {
    dbg!("mhy_client exists");
    return;
  }
  let mhy_client = WindowBuilder::from_config(&handle, mhy_window_config).build().unwrap();
  let js_bridge = r#"
          window.MiHoYoJSInterface = {
            postMessage: function(arg) { window.__TAURI__.event.emit('post_mhy_client', arg) },
            closePage: function() { this.postMessage('{"method":"closePage"}') },
          };
      "#;
  mhy_client.eval(&js_bridge).ok().unwrap();
}
