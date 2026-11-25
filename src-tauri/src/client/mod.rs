//! 客户端模块，负责操作米游社客户端
//! @since Beta v0.14.1

mod account_cookies;
#[cfg(windows)]
mod cookies_windows;
mod menu;
mod utils;

use crate::commands::with_window_label_lock;
use account_cookies::{WebAccountCookies, is_bridge_url_allowed};
#[cfg(not(windows))]
use account_cookies::{should_delete_cookie, web_cookie_specs};
use std::{thread::sleep, time::Duration};
use tauri::{AppHandle, Manager, WebviewWindow, WebviewWindowBuilder};
use tauri_utils::config::WebviewUrl;
use url::Url;

const BBS_VERSION: &str = "2.119.0";
const MHY_CLIENT_LABEL: &str = "mhy_client";

/// 创建米游社客户端窗口，并在首次导航前绑定账号会话。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `handle`: Tauri 应用句柄。
/// - `func`: 要打开的功能名。
/// - `url`: 可选的自定义 URL。
/// - `session_id`: 本次客户端窗口会话 ID。
/// - `cookies`: 可选的六项网页 V2 Cookie。
///
/// # 返回
/// - `Ok(())`: 窗口已完成账号会话初始化。
/// - `Err(String)`: 链接无效或窗口操作失败的错误描述。
#[tauri::command]
pub async fn create_mhy_client(
  handle: AppHandle,
  func: String,
  url: String,
  session_id: String,
  cookies: Option<WebAccountCookies>,
) -> Result<(), String> {
  let mut win_width = 400.0;
  let mut win_height = 800.0;
  let win_ua = format!("Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/{BBS_VERSION}");
  let target_url: Url = if !url.is_empty() {
    url.parse().map_err(|error| format!("米游社链接无效：{error}"))?
  } else {
    menu::get_mhy_client_url(&func)?
  };
  if func == "birthday"
    || func == "web_act"
    || url.starts_with("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html")
  {
    win_width = 1280.0;
    win_height = 720.0;
  }

  let initialization_script = build_bridge_initialization_script(&session_id)?;
  let about_blank =
    "about:blank".parse().map_err(|error| format!("初始化米游社页面失败：{error}"))?;
  tauri::async_runtime::spawn_blocking(move || {
    tauri::async_runtime::block_on(with_window_label_lock(MHY_CLIENT_LABEL, || {
      create_mhy_client_locked(
        handle,
        target_url,
        about_blank,
        initialization_script,
        cookies,
        win_width,
        win_height,
        win_ua,
      )
    }))
  })
  .await
  .map_err(|error| error.to_string())?
}

/// 在米游社窗口锁内销毁旧窗口、轮换 Cookie 并创建新页面。
///
/// @since Beta v0.14.1
fn create_mhy_client_locked(
  handle: AppHandle,
  target_url: Url,
  about_blank: Url,
  initialization_script: String,
  cookies: Option<WebAccountCookies>,
  win_width: f64,
  win_height: f64,
  win_ua: String,
) -> Result<(), String> {
  destroy_mhy_client_window(&handle)?;

  let trans_size = utils::get_window_size(&handle, win_width, win_height);
  let window = WebviewWindowBuilder::new(&handle, MHY_CLIENT_LABEL, WebviewUrl::External(about_blank))
    .inner_size(trans_size.0, trans_size.1)
    .visible(false)
    .title("米游社")
    .center()
    .user_agent(&win_ua)
    .initialization_script(initialization_script)
    .additional_browser_args(
      "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required",
    )
    // todo mac环境下没看到menu
    .menu(menu::create_mhy_menu(handle.clone())?)
    .on_menu_event(move |app, event| menu::handle_menu_event(app, event))
    .build()
    .map_err(|error| error.to_string())?;

  let write_cookies = is_bridge_url_allowed(&target_url);
  let navigation_result = rotate_web_account_cookies(&window, cookies.as_ref(), write_cookies)
    .and_then(|()| window.navigate(target_url).map_err(|error| error.to_string()));
  if let Err(error) = navigation_result {
    return fail_mhy_client_initialization(&handle, error);
  }

  if let Err(error) = window.center().map_err(|error| error.to_string()) {
    return fail_mhy_client_initialization(&handle, error);
  }
  if let Err(error) = window.show().map_err(|error| error.to_string()) {
    return fail_mhy_client_initialization(&handle, error);
  }
  if let Err(error) = window.set_focus().map_err(|error| error.to_string()) {
    return fail_mhy_client_initialization(&handle, error);
  }
  Ok(())
}

/// 构造受域名和顶层页面限制的米游社桥接初始化脚本。
///
/// @since Beta v0.14.1
fn build_bridge_initialization_script(session_id: &str) -> Result<String, String> {
  let session_id = serde_json::to_string(session_id).map_err(|error| error.to_string())?;
  Ok(format!(
    r#"(() => {{
  const sessionId = {session_id};
  const hostname = window.location.hostname.toLowerCase();
  const isAllowedDomain = hostname === "mihoyo.com" || hostname.endsWith(".mihoyo.com") ||
    hostname === "miyoushe.com" || hostname.endsWith(".miyoushe.com");
  if (window.top !== window || window.location.protocol !== "https:" || !isAllowedDomain) return;
  Object.defineProperty(window, "__teyvatSessionId", {{
    value: sessionId,
    writable: false,
    configurable: false,
  }});
  window.MiHoYoJSInterface = {{
    postMessage: function(arg) {{
      let request;
      try {{
        request = typeof arg === "string" ? JSON.parse(arg) : arg;
      }} catch (_) {{
        return;
      }}
      window.__TAURI__.event.emit("post_mhy_client", JSON.stringify({{ sessionId, request }}));
    }},
    closePage: function() {{ this.postMessage('{{"method":"closePage"}}'); }},
  }};
}})();"#,
  ))
}

/// 销毁米游社窗口并等待 Tauri 实际移除窗口。
///
/// @since Beta v0.14.1
fn destroy_mhy_client_window(handle: &AppHandle) -> Result<(), String> {
  let Some(window) = handle.get_webview_window(MHY_CLIENT_LABEL) else {
    return Ok(());
  };
  window.destroy().map_err(|error| error.to_string())?;
  for _ in 0..500 {
    if handle.get_webview_window(MHY_CLIENT_LABEL).is_none() {
      return Ok(());
    }
    sleep(Duration::from_millis(10));
  }
  Err(format!("等待窗口 {MHY_CLIENT_LABEL} 销毁超时"))
}

/// 初始化失败时尽力销毁刚创建的隐藏窗口，避免半初始化状态残留。
///
/// @since Beta v0.14.1
fn fail_mhy_client_initialization(handle: &AppHandle, error: String) -> Result<(), String> {
  if let Err(cleanup_error) = destroy_mhy_client_window(handle) {
    log::warn!("[mhy_client] 初始化失败后的窗口清理失败：{cleanup_error}");
  }
  Err(error)
}

#[cfg(windows)]
fn rotate_web_account_cookies(
  webview: &WebviewWindow,
  cookies: Option<&WebAccountCookies>,
  write_cookies: bool,
) -> Result<(), String> {
  cookies_windows::rotate_web_account_cookies(webview, cookies, write_cookies)
}

#[cfg(not(windows))]
fn rotate_web_account_cookies(
  webview: &WebviewWindow,
  cookies: Option<&WebAccountCookies>,
  write_cookies: bool,
) -> Result<(), String> {
  let existing = webview.cookies().map_err(|error| format!("读取网页 Cookie 失败：{error}"))?;
  for cookie in existing.into_iter().filter(|cookie| {
    let domain = cookie.domain().unwrap_or_default();
    should_delete_cookie(cookie.name(), domain)
  }) {
    webview.delete_cookie(cookie).map_err(|error| format!("删除网页 Cookie 失败：{error}"))?;
  }

  let specs = web_cookie_specs(if write_cookies { cookies } else { None });
  for spec in &specs {
    let cookie = tauri::webview::Cookie::build((spec.name, spec.value.as_str()))
      .domain(spec.domain)
      .path(spec.path)
      .secure(spec.secure)
      .build();
    webview.set_cookie(cookie).map_err(|error| format!("写入网页 Cookie 失败：{error}"))?;
  }

  let stored = webview.cookies().map_err(|error| format!("复查网页 Cookie 失败：{error}"))?;
  let matches_spec = |cookie: &tauri::webview::Cookie<'_>,
                      spec: &account_cookies::WebCookieSpec| {
    cookie.name() == spec.name
      && cookie.value() == spec.value
      && cookie.path() == Some(spec.path)
      && cookie.secure() == Some(spec.secure)
      && cookie.http_only() != Some(true)
      && cookie.domain().is_some_and(|domain| {
        domain.trim_start_matches('.').eq_ignore_ascii_case(spec.domain.trim_start_matches('.'))
      })
  };
  if specs.iter().any(|spec| !stored.iter().any(|cookie| matches_spec(cookie, spec))) {
    return Err("写入网页 Cookie 后未能确认保存完成".into());
  }
  if stored
    .iter()
    .filter(|cookie| {
      let domain = cookie.domain().unwrap_or_default();
      should_delete_cookie(cookie.name(), domain)
    })
    .any(|cookie| !specs.iter().any(|spec| matches_spec(cookie, spec)))
  {
    return Err("清理网页认证 Cookie 后仍有残留".into());
  }
  Ok(())
}
