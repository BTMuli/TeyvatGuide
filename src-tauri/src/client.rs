//! @file src/client.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.3.3

use tauri::{AppHandle, Manager,WindowBuilder};

// 操作米游社客户端
#[tauri::command]
pub async fn operate_mhy(handle: AppHandle, arg: String) {
    let has_mhy_client = handle.get_window("mhy_client").is_some();
    let mhy_client;
    if has_mhy_client {
        mhy_client = handle.get_window("mhy_client").unwrap();
    } else {
        mhy_client = WindowBuilder::from_config(
            &handle,
            handle.config().tauri.windows.get(1).unwrap().clone()
        )
        .build()
        .unwrap();
    }
    if mhy_client.is_visible().unwrap() == false {
        mhy_client.show().unwrap();
    }
    mhy_client.set_focus().unwrap();
    let js_code = r#"
        window.MiHoYoJSInterface = {
          postMessage: function(arg) { chrome.webview.postMessage(arg);console.log(arg) },
          closePage: function() { this.postMessage('{"method":"closePage"}') },
        };"#;
    mhy_client.eval(&js_code).ok().unwrap();
    let js_eval = format!("window.MiHoYoJSInterface.postMessage('{}')", arg);
    handle.emit_all("post_mhy_client", arg).unwrap();
    mhy_client.eval(&js_eval).ok().unwrap();
}