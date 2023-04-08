// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
async fn mys_login(handle: AppHandle) {
    // 创建新窗口
    let mys_window = WindowBuilder::new(
        &handle,
        "mys-login", /* the unique window label */
        WindowUrl::External("https://bbs.mihoyo.com/ys/".parse().unwrap()),
    )
    .build()
    .unwrap();
    // 执行 js 代码
    let js_code = "
        var cookie = document.cookie;
        if(cookie == null || cookie == ''){
            alert('请在该网页登录后关闭窗口再试');
        } else {
            prompt('请复制以下内容', `mys-login:${cookie}`);
        }
    ";
    mys_window.eval(js_code).ok().unwrap();
}

use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![mys_login])
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_window("tauri-genshin").unwrap();
                window.open_devtools(); // open the devtools on startup
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
