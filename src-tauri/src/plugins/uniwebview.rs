// 拦截游戏内公告 iframe 的 uniwebview:// 协议
// @since Beta v0.11.5

use tauri::webview::PlatformWebview;
use tauri::{AppHandle, Emitter, Manager};
use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_18;
use webview2_com::{
  LaunchingExternalUriSchemeEventHandler, NavigationStartingEventHandler, take_pwstr,
};
use windows_core::{Interface, PWSTR};

/// 注册主窗口的 uniwebview:// 协议拦截。
pub fn init(app: &AppHandle) {
  let Some(window) = app.get_webview_window("TeyvatGuide") else {
    log::warn!("[uniwebview] 未找到主窗口，跳过协议拦截");
    return;
  };
  let app = app.clone();
  if let Err(error) = window.with_webview(move |webview| {
    if let Err(error) = attach_handlers(webview, app) {
      log::warn!("[uniwebview] 注册协议拦截失败：{error}");
    }
  }) {
    log::warn!("[uniwebview] 访问 WebView 失败：{error}");
  }
}

fn attach_handlers(webview: PlatformWebview, app: AppHandle) -> Result<(), String> {
  unsafe {
    let core = webview.controller().CoreWebView2().map_err(|error| error.to_string())?;
    let mut token = 0i64;

    core
      .add_NavigationStarting(&navigation_handler(app.clone()), &mut token)
      .map_err(|error| error.to_string())?;
    core
      .add_FrameNavigationStarting(&navigation_handler(app.clone()), &mut token)
      .map_err(|error| error.to_string())?;

    match core.cast::<ICoreWebView2_18>() {
      Ok(core18) => {
        core18
          .add_LaunchingExternalUriScheme(&external_scheme_handler(app), &mut token)
          .map_err(|error| error.to_string())?;
      }
      Err(error) => {
        log::warn!("[uniwebview] 当前 WebView2 不支持 LaunchingExternalUriScheme：{error}");
      }
    }
  }
  Ok(())
}

fn navigation_handler(
  app: AppHandle,
) -> webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2NavigationStartingEventHandler {
  NavigationStartingEventHandler::create(Box::new(move |_, args| {
    let Some(args) = args else {
      return Ok(());
    };
    unsafe {
      let uri = {
        let mut uri = PWSTR::null();
        args.Uri(&mut uri)?;
        take_pwstr(uri)
      };
      if handle_uniwebview_uri(&app, &uri) {
        args.SetCancel(true)?;
      }
    }
    Ok(())
  }))
}

fn external_scheme_handler(
  app: AppHandle,
) -> webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2LaunchingExternalUriSchemeEventHandler
{
  LaunchingExternalUriSchemeEventHandler::create(Box::new(move |_, args| {
    let Some(args) = args else {
      return Ok(());
    };
    unsafe {
      let uri = {
        let mut uri = PWSTR::null();
        args.Uri(&mut uri)?;
        take_pwstr(uri)
      };
      if handle_uniwebview_uri(&app, &uri) {
        args.SetCancel(true)?;
      }
    }
    Ok(())
  }))
}

fn handle_uniwebview_uri(app: &AppHandle, uri: &str) -> bool {
  if !uri.to_ascii_lowercase().starts_with("uniwebview:") {
    return false;
  }
  log::info!("[uniwebview] {uri}");
  if let Err(error) = app.emit("uniwebview_scheme", uri) {
    log::warn!("[uniwebview] 发送事件失败：{error}");
  }
  true
}
