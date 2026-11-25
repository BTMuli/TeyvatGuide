//! 米游社网页会话 Cookie 的筛选与轮换规则。
//! @since Beta v0.14.1

use serde::Deserialize;
use url::Url;

const MIHOYO_DOMAIN: &str = "mihoyo.com";
const MIYOUSHE_DOMAIN: &str = "miyoushe.com";
const COOKIE_PATH: &str = "/";

/// 网页端使用的六项 V2 Cookie。
///
/// 这里只接收网页 Cookie，不接收原生登录凭据，避免凭据通过 Tauri 命令进入 WebView。
///
/// @since Beta v0.14.1
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct WebAccountCookies {
  pub(crate) account_id_v2: String,
  pub(crate) cookie_token_v2: String,
  pub(crate) account_mid_v2: String,
  pub(crate) ltoken_v2: String,
  pub(crate) ltuid_v2: String,
  pub(crate) ltmid_v2: String,
}

/// 要写入浏览器 Cookie 存储的单项 Cookie。
///
/// @since Beta v0.14.1
pub(crate) struct WebCookieSpec {
  pub(crate) name: &'static str,
  pub(crate) value: String,
  pub(crate) domain: &'static str,
  pub(crate) path: &'static str,
  pub(crate) secure: bool,
}

/// 认证 Cookie 名称。清理时只匹配这些名称，保留偏好与分析 Cookie。
///
/// @since Beta v0.14.1
pub(crate) const AUTH_COOKIE_NAMES: [&str; 14] = [
  "account_id_v2",
  "cookie_token_v2",
  "account_mid_v2",
  "ltoken_v2",
  "ltuid_v2",
  "ltmid_v2",
  "account_id",
  "cookie_token",
  "ltoken",
  "ltuid",
  "login_ticket",
  "stoken",
  "stuid",
  "mid",
];

/// 米游社网页的 Cookie 根域。
///
/// @since Beta v0.14.1
pub(crate) const COOKIE_ROOT_DOMAINS: [&str; 2] = [".mihoyo.com", ".miyoushe.com"];

/// 判断 URL 是否允许注入顶层网页桥接。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `url`: 待导航 URL。
///
/// # 返回
/// 仅当 URL 为 HTTPS 且主机位于米哈游或米游社根域下时返回 `true`。
pub(crate) fn is_bridge_url_allowed(url: &Url) -> bool {
  url.scheme() == "https" && url.host_str().is_some_and(is_allowed_domain)
}

/// 判断 Cookie 是否应被认证 Cookie 轮换清理。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `name`: Cookie 名称。
/// - `domain`: Cookie 域名。
///
/// # 返回
/// 名称和域名均在认证范围内时返回 `true`。
pub(crate) fn should_delete_cookie(name: &str, domain: &str) -> bool {
  AUTH_COOKIE_NAMES.contains(&name) && is_allowed_domain(domain)
}

/// 生成两组根域下的六项 V2 Cookie。
///
/// `None` 表示只清理旧认证 Cookie，不写入新凭据。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `cookies`: 当前账号的网页 Cookie。
///
/// # 返回
/// 需要写入浏览器 Cookie 存储的 Cookie 列表。
pub(crate) fn web_cookie_specs(cookies: Option<&WebAccountCookies>) -> Vec<WebCookieSpec> {
  let Some(cookies) = cookies else {
    return Vec::new();
  };

  let fields = [
    ("account_id_v2", cookies.account_id_v2.as_str()),
    ("cookie_token_v2", cookies.cookie_token_v2.as_str()),
    ("account_mid_v2", cookies.account_mid_v2.as_str()),
    ("ltoken_v2", cookies.ltoken_v2.as_str()),
    ("ltuid_v2", cookies.ltuid_v2.as_str()),
    ("ltmid_v2", cookies.ltmid_v2.as_str()),
  ];

  COOKIE_ROOT_DOMAINS
    .into_iter()
    .flat_map(|domain| {
      fields.iter().map(move |(name, value)| WebCookieSpec {
        name,
        value: (*value).to_string(),
        domain,
        path: COOKIE_PATH,
        secure: true,
      })
    })
    .collect()
}

/// 检查规范化后的主机是否匹配米哈游或米游社根域边界。
///
/// @since Beta v0.14.1
///
/// # 参数
/// - `domain`: URL 主机或 Cookie 域。
///
/// # 返回
/// 根域或点边界子域返回 `true`。
fn is_allowed_domain(domain: &str) -> bool {
  let normalized = domain.trim().trim_start_matches('.').trim_end_matches('.').to_ascii_lowercase();
  normalized == MIHOYO_DOMAIN
    || normalized.ends_with(&format!(".{MIHOYO_DOMAIN}"))
    || normalized == MIYOUSHE_DOMAIN
    || normalized.ends_with(&format!(".{MIYOUSHE_DOMAIN}"))
}
