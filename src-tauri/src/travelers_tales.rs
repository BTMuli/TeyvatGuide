//! 游逸旅闻外部 WebView 窗口。
//! @since Beta v0.12.6

use crate::commands::with_window_label_lock;
use tauri::{AppHandle, Manager, WebviewWindowBuilder, webview::NewWindowResponse};
use tauri_utils::config::WebviewUrl;
use url::Url;

const TRAVELERS_TALES_LABEL: &str = "travelers_tales";
const TRAVELERS_TALES_URL: &str = "https://www.bilibili.com/toy/genshin-travelers-tales";

/// 判断导航目标是否属于允许的 HTTPS 哔哩哔哩域名。
///
/// @since Beta v0.12.6
///
/// # 参数
/// - `url`: 待检查的导航目标。
///
/// # 返回值
/// 是否允许导航到该地址。
fn is_allowed_bilibili_url(url: &Url) -> bool {
  // WKWebView also invokes this callback for subframe navigation, so allow the canonical Toy iframe host.
  url.scheme() == "https"
    && url.host_str().is_some_and(|host| {
      host == "bilibili.com" || host.ends_with(".bilibili.com") || host == "www.bilibilitoy.com"
    })
}

/// 创建或复用游逸旅闻 WebView 窗口。
///
/// @since Beta v0.12.6
///
/// # 参数
/// - `handle`: 用于查找与创建 WebView 窗口的应用句柄。
///
/// # 返回值
/// 窗口显示成功时返回空结果，失败时返回错误信息。
#[tauri::command]
pub async fn create_travelers_tales(handle: AppHandle) -> Result<(), String> {
  let target_url: Url =
    TRAVELERS_TALES_URL.parse().map_err(|error| format!("游逸旅闻链接无效：{error}"))?;

  with_window_label_lock(TRAVELERS_TALES_LABEL, || {
    if let Some(window) = handle.get_webview_window(TRAVELERS_TALES_LABEL) {
      if window.is_minimized().map_err(|error| error.to_string())? {
        window.unminimize().map_err(|error| error.to_string())?;
      }
      window.show().map_err(|error| error.to_string())?;
      return window.set_focus().map_err(|error| error.to_string());
    }

    WebviewWindowBuilder::new(&handle, TRAVELERS_TALES_LABEL, WebviewUrl::External(target_url))
      .inner_size(1280.0, 800.0)
      .min_inner_size(800.0, 600.0)
      .resizable(true)
      .visible(true)
      .title("游逸旅闻")
      .center()
      .on_navigation(is_allowed_bilibili_url)
      .on_new_window(|_, _| NewWindowResponse::Deny)
      .build()
      .map(|_| ())
      .map_err(|error| error.to_string())
  })
  .await
}

#[cfg(test)]
mod tests {
  use super::is_allowed_bilibili_url;
  use url::Url;

  /// 验证允许的 HTTPS 哔哩哔哩及嵌套页面域名。
  /// @since Beta v0.12.6
  #[test]
  fn allows_https_bilibili_hosts() {
    for url in [
      "https://bilibili.com/toy/genshin-travelers-tales",
      "https://www.bilibili.com/toy/genshin-travelers-tales",
      "https://passport.bilibili.com/login",
      "https://www.bilibilitoy.com/toy/genshin-travelers-tales/30523418449920-v26616/index.html",
    ] {
      assert!(is_allowed_bilibili_url(&Url::parse(url).unwrap()));
    }
  }

  /// 验证非受信任域名与非 HTTPS 地址被拒绝。
  /// @since Beta v0.12.6
  #[test]
  fn rejects_non_bilibili_or_non_https_urls() {
    for url in [
      "http://www.bilibili.com/",
      "http://www.bilibilitoy.com/",
      "https://bilibili.com.evil.example/",
      "https://evilbilibili.com/",
      "https://bilibilitoy.com/",
      "https://www.bilibilitoy.com.evil.example/",
      "https://evilwww.bilibilitoy.com/",
      "tauri://localhost",
      "https://tauri.localhost",
      "file:///tmp/travelers-tales.html",
      "data:text/html,blocked",
    ] {
      assert!(!is_allowed_bilibili_url(&Url::parse(url).unwrap()));
    }
  }
}
