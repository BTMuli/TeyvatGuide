// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauri
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};
// Rocket
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{Request, Response};

#[macro_use]
extern crate rocket;

static mut COOKIE: String = String::new();

// Rocket 接受 get 请求，发来的 cookie 会被打印在控制台
#[rocket::get("/login?<cookie>")]
fn emit_cookie(cookie: String) -> String {
    unsafe {
        COOKIE = cookie.parse().unwrap();
    }
    cookie
}

pub struct Cors;

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "Cross-Origin-Resource-Sharing Fairing",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, PATCH, PUT, DELETE, HEAD, OPTIONS, GET",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

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
        const cookie = document.cookie;
        if(cookie == null || cookie == ''){
            alert('请在该网页登录后关闭窗口再试');
        } else {
            fetch('http://localhost:8000/login?cookie=' + cookie);
            alert('成功获取 cookie!请关闭窗口');
        }
    ";
    mys_window.eval(js_code).ok().unwrap();
}

#[tauri::command]
fn read_cookie() -> String {
    unsafe { COOKIE.clone() }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![mys_login, read_cookie])
        .setup(|app| {
            tauri::async_runtime::spawn(
                rocket::build()
                    .attach(Cors)
                    .mount("/", routes![emit_cookie])
                    .launch(),
            );
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
