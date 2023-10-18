//! @file src/client.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.3.3

use tauri::{AppHandle, Manager,WindowBuilder, WindowUrl};
use url::Url;

// 获取米游社客户端入口地址
fn get_mhy_client_url(func: String) -> WindowUrl {
    let mut url_res: Url = "https://bbs.mihoyo.com/ys/".parse().unwrap();
    if func == "sign_in" {
        url_res = "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501".parse().unwrap();
    } else if func == "game_record" {
        url_res = "https://webstatic.mihoyo.com/app/community-game-records/index.html".parse().unwrap();
    }
    return WindowUrl::External(url_res);
}

// 操作米游社客户端
#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, arg: String) {
    dbg!(&arg);
    let has_mhy_client = handle.get_window("mhy_client").is_some();
    let mut mhy_client_config = handle.config().tauri.windows.get(1).unwrap().clone();
    mhy_client_config.url = get_mhy_client_url(func.clone());
    let mhy_client;
    if has_mhy_client {
        mhy_client = handle.get_window("mhy_client").unwrap();
        mhy_client.close().unwrap();
    } else {
        mhy_client = WindowBuilder::from_config(
                &handle,
                mhy_client_config,
            )
            .build()
            .unwrap();
        mhy_client.show().unwrap();
        mhy_client.set_focus().unwrap();
        let js_code = r#"
            window.MiHoYoJSInterface = {
              postMessage: function(arg) { window.__TAURI__.event.emit('post_mhy_client', arg) },
              closePage: function() { this.postMessage('{"method":"closePage"}') },
            };"#;
        mhy_client.eval(&js_code).ok().unwrap();
    }
}