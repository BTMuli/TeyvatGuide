// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
// todo 后续优化
async fn register_deep_link(app_handle: tauri::AppHandle) {
    tauri_plugin_deep_link::register(
        "teyvatguide",
        move |request| {
            dbg!(&request);
            app_handle.emit_all("active_deep_link", request).unwrap();
        },
    )
    .unwrap();
}

fn main() {
    tauri_plugin_deep_link::prepare("teyvatguide");
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![register_deep_link])
        .setup(|_app| {
            let _window = _app.get_window("TeyvatGuide").unwrap();
            #[cfg(debug_assertions)] // only include this code on debug builds
                _window.open_devtools(); // open the devtools on startup
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
