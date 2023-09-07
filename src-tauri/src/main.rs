// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|_app| {
            let _window = _app.get_window("tauri-genshin").unwrap();
            #[cfg(debug_assertions)] // only include this code on debug builds
                _window.open_devtools(); // open the devtools on startup
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
