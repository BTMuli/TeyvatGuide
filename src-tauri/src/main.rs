// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauri
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

#[tauri::command]
async fn mys_login(handle: AppHandle) {
    // 创建新窗口
    let mys_window = WindowBuilder::new(
        &handle,
        "mys-login", /* the unique window label */
        WindowUrl::External("https://user.mihoyo.com".parse().unwrap()),
    )
    .build()
    .unwrap();
    // 执行 js 代码
    let js_code = "
        const cookie = document.cookie;
        if(cookie === null || cookie.includes('login_ticket') === false) {
            alert('请在该网页登录后关闭窗口再试');
        } else {
            prompt('请复制以下内容后手动输入', cookie);
        }
    ";
    mys_window.eval(js_code).ok().unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![mys_login])
        .setup(|_app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = _app.get_window("tauri-genshin").unwrap();
                window.open_devtools(); // open the devtools on startup
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
