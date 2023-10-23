//! @file src/client.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.3.3

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
    url_res = "https://webstatic.mihoyo.com/app/community-game-records/index.html".parse().unwrap();
  }
  return WindowUrl::External(url_res);
}

// 操作米游社客户端
#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String) {
  let mut mhy_window_config = handle.config().tauri.windows.get(1).unwrap().clone();
  mhy_window_config.url = get_mhy_client_url(func.clone());
  let has_mhy_client = handle.get_window("mhy_client").is_some();
  if has_mhy_client {
    return;
  }
  let js_bridge = r#"
          window.MiHoYoJSInterface = {
            postMessage: function(arg) { window.__TAURI__.event.emit('post_mhy_client', arg) },
            closePage: function() { this.postMessage('{"method":"closePage"}') },
          };
      "#;
  let mhy_client = WindowBuilder::from_config(&handle, mhy_window_config).build();
  mhy_client.unwrap().eval(&js_bridge).ok().unwrap();
}
