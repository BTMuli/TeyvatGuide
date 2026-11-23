//! 在 Windows WebView2 中清除指定网页的 Cookie。
//! @since Beta v0.14.1

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::sync::mpsc::channel;
use tauri::WebviewWindow;
use url::Url;
use webview2_com::CallDevToolsProtocolMethodCompletedHandler;
use windows_core::HSTRING;

/// WebView2 返回的指定网页 Cookie 列表。
///
/// @since Beta v0.14.1
#[derive(Deserialize)]
struct PageCookies {
  cookies: Vec<CookieKey>,
}

/// 定位 Cookie 所需的字段。删除请求只发送这些字段。
///
/// @since Beta v0.14.1
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CookieKey {
  name: String,
  domain: String,
  path: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  partition_key: Option<Value>,
  #[serde(skip_serializing)]
  partition_key_opaque: Option<bool>,
}

/// 清除用户确认时网页 URL 匹配的 Cookie，并等待每次删除完成。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `webview`: 米游社客户端窗口。
/// - `url`: 用户确认清除 Cookie 的网页地址。
///
/// # 返回
/// 删除完成后返回 `Ok(())`，浏览器查询或删除失败时返回错误描述。
pub(super) fn clear_page_cookies(webview: &WebviewWindow, url: Url) -> Result<(), String> {
  let response =
    call_cookie_protocol(webview, "Network.getCookies", &json!({"urls": [url.as_str()]}))?;
  let page: PageCookies =
    serde_json::from_str(&response).map_err(|_| "无法读取 WebView2 返回的 Cookie 列表")?;

  if page.cookies.iter().any(|cookie| cookie.partition_key_opaque.is_some()) {
    return Err("当前网页含有 WebView2 无法定位的分区 Cookie".into());
  }
  for cookie in page.cookies {
    call_cookie_protocol(webview, "Network.deleteCookies", &cookie)?;
  }
  Ok(())
}

/// 在窗口线程发出 Cookie 协议请求，在调用线程等待 WebView2 回调。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `webview`: 米游社客户端窗口。
/// - `method`: 要调用的浏览器协议方法。
/// - `params`: 方法参数。
///
/// # 返回
/// 浏览器返回的 JSON 或错误描述。
fn call_cookie_protocol(
  webview: &WebviewWindow,
  method: &str,
  params: &impl Serialize,
) -> Result<String, String> {
  let payload = serde_json::to_string(params).map_err(|error| error.to_string())?;
  let method_name = HSTRING::from(method);
  let payload = HSTRING::from(payload);
  let (result_tx, result_rx) = channel();
  webview
    .with_webview(move |platform| {
      let completion_tx = result_tx.clone();
      let handler =
        CallDevToolsProtocolMethodCompletedHandler::create(Box::new(move |status, response| {
          let _ = completion_tx.send(status.map(|_| response));
          Ok(())
        }));
      let result = unsafe {
        platform
          .controller()
          .CoreWebView2()
          .and_then(|core| core.CallDevToolsProtocolMethod(&method_name, &payload, &handler))
      };
      if let Err(error) = result {
        let _ = result_tx.send(Err(error));
      }
    })
    .map_err(|error| format!("访问 WebView2 失败：{error}"))?;
  result_rx
    .recv()
    .map_err(|error| format!("接收 {method} 结果失败：{error}"))?
    .map_err(|error| format!("{method} 失败：{error}"))
}
