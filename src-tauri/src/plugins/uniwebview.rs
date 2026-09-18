// 拦截游戏内公告 iframe 的 uniwebview:// 协议
// @since Beta v0.12.0

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

/// 在 WebView2 上注册导航与外部 URI 协议拦截处理器。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `webview`: 平台 WebView 实例。
/// - `app`: Tauri 应用句柄。
///
/// # 返回
/// - `Ok(())`: 处理器注册成功。
/// - `Err(String)`: 访问 WebView2 或注册失败的错误描述。
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

/// 创建导航起始事件处理器，用于拦截 `uniwebview://` 链接。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `app`: Tauri 应用句柄。
///
/// # 返回
/// WebView2 导航事件处理器。
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

/// 创建外部 URI 协议处理器，用于拦截 `uniwebview://` 外部协议。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `app`: Tauri 应用句柄。
///
/// # 返回
/// WebView2 外部协议事件处理器。
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

/// 判断并处理 `uniwebview://` 协议，拦截后向前端发送事件。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `app`: Tauri 应用句柄。
/// - `uri`: 待处理的 URI。
///
/// # 返回
/// 是否为 `uniwebview://` 协议。
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
