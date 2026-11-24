//! WebDAV 快照传输：先写入并读回不可变的快照和独立清单，再条件发布 current。
//!
//! 条件写入不保证任意 WebDAV 实现原子替换 current；已知历史 ID 可绕开损坏的 current。
//!
//! HTTP 必须由调用方显式允许；它会泄露凭证和数据，也无法抵御篡改。
//! 本模块不保存凭证、不删除远程对象，也不将 URL、凭证或响应体写入错误或日志。
//! @since Beta v0.14.1

use reqwest::{
  Client, Method, Response, StatusCode,
  header::{
    ACCEPT_ENCODING, CACHE_CONTROL, CONTENT_TYPE, ETAG, HeaderMap, HeaderName, HeaderValue,
    IF_MATCH, IF_NONE_MATCH,
  },
  redirect::Policy,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{future::Future, time::Duration};
use url::Url;
use uuid::Uuid;

const MAX_SNAPSHOT_BYTES: usize = 16 * 1024 * 1024;
const MAX_METADATA_BYTES: usize = 8 * 1024;
const CURRENT_FILE: &str = "teyvatguide-sync-current.json";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(120);
const OPERATION_TIMEOUT: Duration = Duration::from_secs(300);

const INVALID_URL: &str = "WEBDAV_INVALID_URL：请输入不含凭证、查询或片段的 HTTP(S) 目录地址";
const INSECURE_HTTP: &str = "WEBDAV_HTTP_INSECURE：明文 HTTP 会暴露账号、密码和数据，必须明确允许";
const INVALID_CREDENTIALS: &str = "WEBDAV_INVALID_CREDENTIALS：用户名或密码格式无效";
const TOO_LARGE: &str = "WEBDAV_TOO_LARGE：快照超过 16 MiB 上限，未上传";
const RESPONSE_TOO_LARGE: &str =
  "WEBDAV_RESPONSE_TOO_LARGE：远程响应超过安全上限；当前快照不可用时，可尝试用之前的快照 ID 恢复";
const CLIENT_ERROR: &str = "WEBDAV_CLIENT_ERROR：无法创建网络客户端";
const NETWORK: &str = "WEBDAV_NETWORK：连接失败或响应读取失败";
const TIMEOUT: &str = "WEBDAV_TIMEOUT：传输超时，请先拉取核对发布结果";
const AUTH: &str = "WEBDAV_AUTH：认证失败或无访问权限";
const REDIRECT: &str = "WEBDAV_REDIRECT：服务器重定向不受支持";
const HTTP_ERROR: &str = "WEBDAV_HTTP_ERROR：服务器请求失败，请检查目录和服务状态";
const DIRECTORY_NOT_FOUND: &str = "WEBDAV_DIRECTORY_NOT_FOUND：远程目录不存在，请检查目录地址";
const NOT_FOUND: &str = "WEBDAV_NOT_FOUND：找不到当前快照；已有快照时，可尝试用之前的快照 ID 恢复";
const HISTORY_NOT_FOUND: &str = "WEBDAV_NOT_FOUND：找不到指定快照 ID 的历史清单";
const INVALID_SNAPSHOT_ID: &str = "WEBDAV_INVALID_SNAPSHOT_ID：历史快照 ID 格式无效";
const INVALID_METADATA: &str = "WEBDAV_INVALID_METADATA：远程快照元数据无效或版本不受支持；当前快照不可用时，可尝试用之前的快照 ID 恢复";
const INTEGRITY: &str =
  "WEBDAV_INTEGRITY：远程快照缺失或完整性校验失败；当前快照不可用时，可尝试用之前的快照 ID 恢复";
const UNSUPPORTED: &str = "WEBDAV_UNSUPPORTED：服务器未正确支持强 ETag 和条件写入";
const CONFLICT: &str = "WEBDAV_CONFLICT：远程快照已被其他设备更新，请先拉取后重试";
const PUBLISH_UNKNOWN: &str = "WEBDAV_PUBLISH_UNKNOWN：发布结果未知，请先拉取核对；当前快照不可用时，可尝试用之前的快照 ID 恢复";

type SyncResult<T> = Result<T, &'static str>;

/// current 和独立历史清单共用的信封；业务 JSON 由数据层验证。
///
/// @since Beta v0.14.1
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SnapshotMetadata {
  format_version: u32,
  snapshot_id: String,
  snapshot_file: String,
  byte_length: u64,
  sha256: String,
}

/// 已限制长度的 HTTP 响应及其强 ETag 候选值。
///
/// @since Beta v0.14.1
struct Resource {
  bytes: Vec<u8>,
  etag: Option<HeaderValue>,
}

/// 仅在一次操作期间持有连接信息和认证凭证。
///
/// @since Beta v0.14.1
struct Webdav {
  base: Url,
  client: Client,
  username: String,
  password: String,
}

/// 校验目录地址，拒绝所有 URL 内认证信息、查询、片段及未明确允许的 HTTP。
///
/// @since Beta v0.14.1
fn parse_directory(address: &str, unsafe_http: bool) -> SyncResult<Url> {
  if address.is_empty()
    || address.len() > 4096
    || address != address.trim()
    || address.bytes().any(|byte| byte.is_ascii_control())
  {
    return Err(INVALID_URL);
  }
  // URL 解析器会将空 userinfo 规范化掉，故也检查原始 authority 中的 @。
  let authority = address
    .split_once("://")
    .map(|(_, rest)| rest.split(['/', '?', '#']).next().unwrap_or(""))
    .ok_or(INVALID_URL)?;
  if authority.contains('@') {
    return Err(INVALID_URL);
  }
  let url = Url::parse(address).map_err(|_| INVALID_URL)?;
  if !matches!(url.scheme(), "http" | "https")
    || !url.has_host()
    || !url.username().is_empty()
    || url.password().is_some()
    || url.query().is_some()
    || url.fragment().is_some()
    || url.cannot_be_a_base()
  {
    return Err(INVALID_URL);
  }
  if url.scheme() == "http" && !unsafe_http {
    return Err(INSECURE_HTTP);
  }
  Ok(url)
}

/// 创建不跟随重定向、启用正常证书校验且有超时的客户端。
///
/// @since Beta v0.14.1
fn create_webdav(
  address: &str,
  username: String,
  password: String,
  use_proxy: bool,
  unsafe_http: bool,
) -> SyncResult<Webdav> {
  let base = parse_directory(address, unsafe_http)?;
  if username.is_empty()
    || username.len() > 1024
    || username.contains(':')
    || username.bytes().any(|byte| byte.is_ascii_control())
    || password.len() > 4096
    || password.bytes().any(|byte| byte.is_ascii_control())
  {
    return Err(INVALID_CREDENTIALS);
  }
  let mut builder = Client::builder()
    .redirect(Policy::none())
    .connect_timeout(Duration::from_secs(15))
    .timeout(REQUEST_TIMEOUT);
  if !use_proxy {
    builder = builder.no_proxy();
  }
  let client = builder.build().map_err(|_| CLIENT_ERROR)?;
  Ok(Webdav { base, client, username, password })
}

impl Webdav {
  /// 把受控文件名作为单一路径段添加；空文件名返回以 `/` 结尾的目录 URL。
  /// 不接受服务器提供的 URL。
  ///
  /// @since Beta v0.14.1
  fn resource_url(&self, filename: &str) -> SyncResult<Url> {
    let mut url = self.base.clone();
    url.path_segments_mut().map_err(|_| INVALID_URL)?.pop_if_empty().push(filename);
    Ok(url)
  }

  /// 构造不缓存、不重定向的带认证请求。
  ///
  /// @since Beta v0.14.1
  fn request(&self, method: Method, filename: &str) -> SyncResult<reqwest::RequestBuilder> {
    Ok(
      self
        .client
        .request(method, self.resource_url(filename)?)
        .basic_auth(&self.username, Some(&self.password))
        .header(ACCEPT_ENCODING, "identity")
        .header(CACHE_CONTROL, "no-cache, no-store"),
    )
  }

  /// 首次发布时只检查目录的 HTTP 状态，不读响应体，也不据此判断写入能力。
  ///
  /// @since Beta v0.14.1
  async fn check_directory(&self) -> SyncResult<()> {
    let method = Method::from_bytes(b"PROPFIND").map_err(|_| CLIENT_ERROR)?;
    let response =
      self.request(method, "")?.header("depth", "0").send().await.map_err(network_error)?;
    match response.status() {
      StatusCode::MULTI_STATUS | StatusCode::METHOD_NOT_ALLOWED | StatusCode::NOT_IMPLEMENTED => {
        Ok(())
      }
      StatusCode::NOT_FOUND | StatusCode::GONE => Err(DIRECTORY_NOT_FOUND),
      status => Err(status_error(status)),
    }
  }

  /// 读取一个文件；404 与其他错误明确区分，响应大小受到限制。
  ///
  /// @since Beta v0.14.1
  async fn get(&self, filename: &str, limit: usize) -> SyncResult<Option<Resource>> {
    let response = self.request(Method::GET, filename)?.send().await.map_err(network_error)?;
    if response.status() == StatusCode::NOT_FOUND {
      return Ok(None);
    }
    if response.status() != StatusCode::OK {
      return Err(status_error(response.status()));
    }
    let etag = strong_etag(response.headers());
    let bytes = read_limited(response, limit).await?;
    Ok(Some(Resource { bytes, etag }))
  }

  /// 仅请求创建 UUID 对象；冲突时不重试，也不降级为无条件写入。
  ///
  /// @since Beta v0.14.1
  async fn put_new(&self, filename: &str, body: Vec<u8>) -> SyncResult<()> {
    let status = self.put(filename, body, (IF_NONE_MATCH, HeaderValue::from_static("*"))).await?;
    if put_succeeded(status) {
      Ok(())
    } else if status == StatusCode::PRECONDITION_FAILED {
      Err(CONFLICT)
    } else {
      Err(status_error(status))
    }
  }

  /// 使用指定条件发送 PUT；只读取状态，丢弃服务端响应体。
  /// 调用方根据阶段解释请求失败是否意味着发布结果未知。
  ///
  /// @since Beta v0.14.1
  async fn put(
    &self,
    filename: &str,
    body: Vec<u8>,
    condition: (HeaderName, HeaderValue),
  ) -> SyncResult<StatusCode> {
    let response = self
      .request(Method::PUT, filename)?
      .header(condition.0, condition.1)
      .header(CONTENT_TYPE, "application/json")
      .body(body)
      .send()
      .await
      .map_err(network_error)?;
    Ok(response.status())
  }
}

/// 返回不包含 URL 或底层错误文本的网络错误。
///
/// @since Beta v0.14.1
fn network_error(error: reqwest::Error) -> &'static str {
  if error.is_timeout() { TIMEOUT } else { NETWORK }
}

/// 把 HTTP 状态映射为不含地址和响应正文的固定错误。
///
/// @since Beta v0.14.1
fn status_error(status: StatusCode) -> &'static str {
  if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
    AUTH
  } else if status.is_redirection() {
    REDIRECT
  } else {
    HTTP_ERROR
  }
}

/// 限制实际读取的响应大小，也拒绝声明长度过大的响应。
///
/// @since Beta v0.14.1
async fn read_limited(mut response: Response, limit: usize) -> SyncResult<Vec<u8>> {
  if response.content_length().is_some_and(|length| length > limit as u64) {
    return Err(RESPONSE_TOO_LARGE);
  }
  let mut bytes = Vec::new();
  while let Some(chunk) = response.chunk().await.map_err(network_error)? {
    if bytes.len().saturating_add(chunk.len()) > limit {
      return Err(RESPONSE_TOO_LARGE);
    }
    bytes.extend_from_slice(&chunk);
  }
  Ok(bytes)
}

/// 仅接受单个、合法的强 ETag；弱 ETag 不可用于并发写入保护。
///
/// @since Beta v0.14.1
fn strong_etag(headers: &HeaderMap) -> Option<HeaderValue> {
  let all_values = headers.get_all(ETAG);
  let mut values = all_values.iter();
  let value = values.next()?;
  if values.next().is_some() {
    return None;
  }
  let bytes = value.as_bytes();
  if bytes.len() < 2 || bytes[0] != b'"' || bytes[bytes.len() - 1] != b'"' {
    return None;
  }
  if !bytes[1..bytes.len() - 1]
    .iter()
    .all(|byte| *byte == 0x21 || (0x23..=0x7e).contains(byte) || *byte >= 0x80)
  {
    return None;
  }
  Some(value.clone())
}

/// 判断 PUT 成功状态，拒绝其他状态和所有重定向。
///
/// @since Beta v0.14.1
fn put_succeeded(status: StatusCode) -> bool {
  matches!(status, StatusCode::OK | StatusCode::CREATED | StatusCode::NO_CONTENT)
}

/// 计算小写 SHA-256 摘要。
///
/// @since Beta v0.14.1
fn digest(bytes: &[u8]) -> String {
  hex::encode(Sha256::digest(bytes))
}

/// 只允许标准小写 UUIDv4 标识作为输入，不接受路径、编码别名或其他 UUID 版本。
///
/// @since Beta v0.14.1
fn parse_snapshot_id(id: &str) -> Option<Uuid> {
  if id.len() != 36 {
    return None;
  }
  let uuid = Uuid::parse_str(id).ok()?;
  (uuid.get_version_num() == 4
    && uuid.get_variant() == uuid::Variant::RFC4122
    && uuid.to_string() == id)
    .then_some(uuid)
}

/// 由已生成或验证的 UUID 构造数据文件名。
///
/// @since Beta v0.14.1
fn snapshot_filename(id: Uuid) -> String {
  format!("teyvatguide-sync-{id}.json")
}

/// 由已生成或验证的 UUID 构造与数据同 ID 的独立历史清单名。
///
/// @since Beta v0.14.1
fn manifest_filename(id: Uuid) -> String {
  format!("teyvatguide-sync-{id}.manifest.json")
}

/// 检查信封版本、ID、受控文件名、字节长度与摘要；历史清单还必须绑定请求的 ID。
///
/// @since Beta v0.14.1
fn parse_metadata(bytes: &[u8], expected_id: Option<Uuid>) -> SyncResult<SnapshotMetadata> {
  let metadata: SnapshotMetadata = serde_json::from_slice(bytes).map_err(|_| INVALID_METADATA)?;
  let id = parse_snapshot_id(&metadata.snapshot_id).ok_or(INVALID_METADATA)?;
  if metadata.format_version != 1
    || expected_id.is_some_and(|expected| expected != id)
    || metadata.snapshot_file != snapshot_filename(id)
    || metadata.byte_length > MAX_SNAPSHOT_BYTES as u64
    || metadata.sha256.len() != 64
    || !metadata.sha256.bytes().all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
  {
    return Err(INVALID_METADATA);
  }
  Ok(metadata)
}

/// 从受限文件名读取快照并验证字节数和摘要后返回。
///
/// @since Beta v0.14.1
async fn verified_snapshot(webdav: &Webdav, metadata: &SnapshotMetadata) -> SyncResult<Vec<u8>> {
  let resource = webdav.get(&metadata.snapshot_file, MAX_SNAPSHOT_BYTES).await?.ok_or(INTEGRITY)?;
  if resource.bytes.len() as u64 != metadata.byte_length
    || digest(&resource.bytes) != metadata.sha256
  {
    return Err(INTEGRITY);
  }
  Ok(resource.bytes)
}

/// 用唯一小探针核验条件创建、条件更新和强 ETag；探针不含用户数据且不会删除。
///
/// 探测只能发现本次请求中可观察到的协议错误，不能证明恶意服务器或不同资源上的行为。
///
/// @since Beta v0.14.1
async fn probe_conditions(webdav: &Webdav) -> SyncResult<()> {
  let id = Uuid::new_v4();
  let filename = format!("teyvatguide-sync-probe-{id}.json");
  let original = br#"{"probe":1}"#.to_vec();
  let replacement = br#"{"probe":2}"#.to_vec();
  let any = HeaderValue::from_static("*");
  let status = webdav.put(&filename, original.clone(), (IF_NONE_MATCH, any.clone())).await?;
  if !put_succeeded(status) {
    return Err(if status == StatusCode::PRECONDITION_FAILED {
      UNSUPPORTED
    } else {
      status_error(status)
    });
  }
  let first = webdav.get(&filename, MAX_METADATA_BYTES).await?.ok_or(UNSUPPORTED)?;
  let first_etag = first.etag.ok_or(UNSUPPORTED)?;
  if first.bytes != original {
    return Err(UNSUPPORTED);
  }

  let status = webdav.put(&filename, replacement.clone(), (IF_NONE_MATCH, any)).await?;
  if status != StatusCode::PRECONDITION_FAILED {
    return Err(UNSUPPORTED);
  }
  let after_none = webdav.get(&filename, MAX_METADATA_BYTES).await?.ok_or(UNSUPPORTED)?;
  if after_none.bytes != original || after_none.etag.as_ref() != Some(&first_etag) {
    return Err(UNSUPPORTED);
  }

  let stale =
    HeaderValue::from_str(&format!("\"teyvatguide-invalid-{id}\"")).map_err(|_| UNSUPPORTED)?;
  if stale == first_etag {
    return Err(UNSUPPORTED);
  }
  let status = webdav.put(&filename, replacement.clone(), (IF_MATCH, stale)).await?;
  if status != StatusCode::PRECONDITION_FAILED {
    return Err(UNSUPPORTED);
  }
  let after_stale = webdav.get(&filename, MAX_METADATA_BYTES).await?.ok_or(UNSUPPORTED)?;
  if after_stale.bytes != original || after_stale.etag.as_ref() != Some(&first_etag) {
    return Err(UNSUPPORTED);
  }

  let status = webdav.put(&filename, replacement.clone(), (IF_MATCH, first_etag.clone())).await?;
  if !put_succeeded(status) {
    return Err(UNSUPPORTED);
  }
  let changed = webdav.get(&filename, MAX_METADATA_BYTES).await?.ok_or(UNSUPPORTED)?;
  if changed.bytes != replacement || changed.etag.is_none() || changed.etag == Some(first_etag) {
    return Err(UNSUPPORTED);
  }
  Ok(())
}

/// 只读预检：校验已有快照并保留其 ETag；仅首次发布时检查目录。
///
/// @since Beta v0.14.1
async fn preflight_publish(webdav: &Webdav) -> SyncResult<Option<HeaderValue>> {
  if let Some(resource) = webdav.get(CURRENT_FILE, MAX_METADATA_BYTES).await? {
    let metadata = parse_metadata(&resource.bytes, None)?;
    let etag = resource.etag.ok_or(UNSUPPORTED)?;
    // 保持失败关闭：已有快照损坏时不覆盖其指针，也不尝试修复。
    verified_snapshot(webdav, &metadata).await?;
    Ok(Some(etag))
  } else {
    webdav.check_directory().await?;
    Ok(None)
  }
}

/// 创建并读回数据和独立清单，再按预检所得 ETag 条件发布 current；只在发布验证后返回 ID。
///
/// @since Beta v0.14.1
async fn upload_inner(
  webdav: Webdav,
  snapshot: String,
  previous_etag: Option<HeaderValue>,
) -> SyncResult<String> {
  probe_conditions(&webdav).await?;

  let id = Uuid::new_v4();
  let metadata = SnapshotMetadata {
    format_version: 1,
    snapshot_id: id.to_string(),
    snapshot_file: snapshot_filename(id),
    byte_length: snapshot.len() as u64,
    sha256: digest(snapshot.as_bytes()),
  };
  let pointer = serde_json::to_vec(&metadata).map_err(|_| INVALID_METADATA)?;
  let manifest = manifest_filename(id);
  webdav.put_new(&metadata.snapshot_file, snapshot.into_bytes()).await?;
  verified_snapshot(&webdav, &metadata).await?;
  webdav.put_new(&manifest, pointer.clone()).await?;
  let stored_manifest = webdav.get(&manifest, MAX_METADATA_BYTES).await?.ok_or(INTEGRITY)?;
  if stored_manifest.bytes != pointer {
    return Err(INTEGRITY);
  }

  let condition = match &previous_etag {
    Some(etag) => (IF_MATCH, etag.clone()),
    None => (IF_NONE_MATCH, HeaderValue::from_static("*")),
  };
  // 除明确的条件冲突外，失败也可能发生在服务端已修改 current 后，不能盲重试或回滚。
  let status =
    webdav.put(CURRENT_FILE, pointer.clone(), condition).await.map_err(|_| PUBLISH_UNKNOWN)?;
  if status == StatusCode::PRECONDITION_FAILED {
    return Err(CONFLICT);
  }
  if !put_succeeded(status) {
    return Err(PUBLISH_UNKNOWN);
  }
  let published =
    webdav.get(CURRENT_FILE, MAX_METADATA_BYTES).await.map_err(|_| PUBLISH_UNKNOWN)?;
  let published = published.ok_or(PUBLISH_UNKNOWN)?;
  if published.bytes != pointer || published.etag.is_none() || published.etag == previous_etag {
    return Err(PUBLISH_UNKNOWN);
  }
  Ok(metadata.snapshot_id)
}

/// 已知历史 ID 时只读取独立清单；否则保留从 current 拉取的路径。两者均不写入远端。
///
/// @since Beta v0.14.1
async fn download_inner(webdav: Webdav, id: Option<Uuid>) -> SyncResult<String> {
  let (filename, not_found) = match id {
    Some(id) => (manifest_filename(id), HISTORY_NOT_FOUND),
    None => (CURRENT_FILE.to_string(), NOT_FOUND),
  };
  let resource = webdav.get(&filename, MAX_METADATA_BYTES).await?.ok_or(not_found)?;
  let metadata = parse_metadata(&resource.bytes, id)?;
  let snapshot = verified_snapshot(&webdav, &metadata).await?;
  String::from_utf8(snapshot).map_err(|_| INTEGRITY)
}

/// 连接预检成功后才导出并上传快照，返回已确认发布的 ID。明文 HTTP 必须显式允许。
///
/// @since Beta v0.14.1
pub(crate) async fn upload_snapshot(
  address: &str,
  username: String,
  password: String,
  use_proxy: bool,
  unsafe_http: bool,
  load_snapshot: impl Future<Output = Result<String, String>>,
) -> Result<String, String> {
  let webdav =
    create_webdav(address, username, password, use_proxy, unsafe_http).map_err(str::to_string)?;
  tokio::time::timeout(OPERATION_TIMEOUT, async {
    let previous_etag = preflight_publish(&webdav).await.map_err(str::to_string)?;
    let snapshot = load_snapshot.await?;
    if snapshot.len() > MAX_SNAPSHOT_BYTES {
      return Err(TOO_LARGE.to_string());
    }
    upload_inner(webdav, snapshot, previous_etag).await.map_err(str::to_string)
  })
  .await
  .map_err(|_| TIMEOUT.to_string())?
}

/// 拉取当前或指定 ID 的快照；只有元数据、长度、摘要和 UTF-8 全部通过才返回内容。
///
/// @since Beta v0.14.1
pub(crate) async fn download_snapshot(
  address: &str,
  username: String,
  password: String,
  use_proxy: bool,
  unsafe_http: bool,
  snapshot_id: Option<String>,
) -> Result<String, String> {
  let id = match snapshot_id {
    Some(id) => Some(parse_snapshot_id(&id).ok_or(INVALID_SNAPSHOT_ID)?),
    None => None,
  };
  let webdav =
    create_webdav(address, username, password, use_proxy, unsafe_http).map_err(str::to_string)?;
  tokio::time::timeout(OPERATION_TIMEOUT, download_inner(webdav, id))
    .await
    .map_err(|_| TIMEOUT.to_string())?
    .map_err(str::to_string)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::{
    collections::HashMap,
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    sync::{
      Arc, Mutex,
      atomic::{AtomicBool, Ordering},
    },
    thread::{self, JoinHandle},
  };

  /// 仅用于回环测试服务器的内存对象。
  ///
  /// @since Beta v0.14.1
  #[derive(Clone)]
  struct Object {
    bytes: Vec<u8>,
    revision: u64,
  }

  /// current 写入时模拟连接在不同持久化阶段断开。
  ///
  /// @since Beta v0.14.1
  #[derive(Clone, Copy)]
  enum Disconnect {
    BeforeWrite,
    AfterCommit,
    AfterTruncate,
  }

  /// 回环服务可使用长度头、连接结束或分块对响应定界。
  ///
  /// @since Beta v0.14.1
  #[derive(Clone, Copy, Default)]
  enum ResponseFraming {
    #[default]
    ContentLength,
    CloseDelimited,
    Chunked,
  }

  /// 本地合成 WebDAV 状态；不访问用户数据或外部服务。
  ///
  /// @since Beta v0.14.1
  #[derive(Default)]
  struct ServerState {
    objects: HashMap<String, Object>,
    next_revision: u64,
    directory_status: Option<u16>,
    disconnect_current_get: bool,
    requests: Vec<(String, String)>,
    saw_authenticated_directory_probe: bool,
    ignore_conditions: bool,
    weak_etag: bool,
    race_pointer: bool,
    fail_snapshot_put: bool,
    damage_manifest_write: bool,
    disconnect_pointer: Option<Disconnect>,
    current_framing: ResponseFraming,
    status_override: Option<u16>,
    request_count: usize,
    saw_basic_auth: bool,
  }

  /// 使用回环端口运行的最小合成 HTTP 服务。
  ///
  /// @since Beta v0.14.1
  struct FakeServer {
    address: SocketAddr,
    state: Arc<Mutex<ServerState>>,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
  }

  impl FakeServer {
    /// 启动一个仅监听本机回环地址的服务。
    ///
    /// @since Beta v0.14.1
    fn new() -> Self {
      let listener = TcpListener::bind("127.0.0.1:0").unwrap();
      let address = listener.local_addr().unwrap();
      let state = Arc::new(Mutex::new(ServerState::default()));
      let stop = Arc::new(AtomicBool::new(false));
      let thread_state = Arc::clone(&state);
      let thread_stop = Arc::clone(&stop);
      let thread = thread::spawn(move || {
        while let Ok((stream, _)) = listener.accept() {
          if thread_stop.load(Ordering::SeqCst) {
            break;
          }
          handle_connection(stream, &thread_state);
        }
      });
      Self { address, state, stop, thread: Some(thread) }
    }

    /// 返回临时服务上的测试目录地址。
    ///
    /// @since Beta v0.14.1
    fn url(&self) -> String {
      format!("http://{}/dav/", self.address)
    }
  }

  impl Drop for FakeServer {
    /// 唤醒并关闭测试服务线程。
    ///
    /// @since Beta v0.14.1
    fn drop(&mut self) {
      self.stop.store(true, Ordering::SeqCst);
      let _ = TcpStream::connect(self.address);
      if let Some(thread) = self.thread.take() {
        thread.join().unwrap();
      }
    }
  }

  /// 为合成对象生成强 ETag。
  ///
  /// @since Beta v0.14.1
  fn object_etag(object: &Object) -> String {
    format!("\"revision-{}\"", object.revision)
  }

  /// 处理合成的 GET、PROPFIND 和条件 PUT；所有远程内容均为测试数据。
  ///
  /// @since Beta v0.14.1
  fn handle_connection(mut stream: TcpStream, state: &Arc<Mutex<ServerState>>) {
    stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
    let mut received = Vec::new();
    let mut buffer = [0u8; 8192];
    let header_end = loop {
      let count = match stream.read(&mut buffer) {
        Ok(0) | Err(_) => return,
        Ok(count) => count,
      };
      received.extend_from_slice(&buffer[..count]);
      if let Some(index) = received.windows(4).position(|part| part == b"\r\n\r\n") {
        break index + 4;
      }
      if received.len() > 64 * 1024 {
        return;
      }
    };
    let text = String::from_utf8_lossy(&received[..header_end]);
    let mut lines = text.split("\r\n");
    let mut request_line = lines.next().unwrap().split_whitespace();
    let method = request_line.next().unwrap_or("").to_string();
    let path = request_line.next().unwrap_or("").to_string();
    let name = path.rsplit('/').next().unwrap_or("").to_string();
    let mut headers = HashMap::new();
    for line in lines {
      if let Some((name, value)) = line.split_once(':') {
        headers.insert(name.to_ascii_lowercase(), value.trim().to_string());
      }
    }
    let body_length =
      headers.get("content-length").and_then(|value| value.parse::<usize>().ok()).unwrap_or(0);
    while received.len() - header_end < body_length {
      let count = match stream.read(&mut buffer) {
        Ok(0) | Err(_) => return,
        Ok(count) => count,
      };
      received.extend_from_slice(&buffer[..count]);
    }
    let mut body = received[header_end..header_end + body_length].to_vec();
    let (status, output, etag) = {
      let mut state = state.lock().unwrap();
      state.request_count += 1;
      state.requests.push((method.clone(), path));
      let has_test_auth =
        headers.get("authorization").is_some_and(|value| value == "Basic dXNlcjpzZWNyZXQ=");
      state.saw_basic_auth |= has_test_auth;
      if let Some(status) = state.status_override {
        (status, b"private-response-user-secret".to_vec(), None)
      } else if method == "PROPFIND" {
        state.saw_authenticated_directory_probe |=
          has_test_auth && headers.get("depth").is_some_and(|value| value == "0");
        (state.directory_status.unwrap_or(405), b"private-response-user-secret".to_vec(), None)
      } else if method == "GET" {
        if name == CURRENT_FILE && state.disconnect_current_get {
          return;
        }
        match state.objects.get(&name) {
          Some(object) => {
            let tag = object_etag(object);
            let tag = if state.weak_etag { format!("W/{tag}") } else { tag };
            (200, object.bytes.clone(), Some(tag))
          }
          None => (404, Vec::new(), None),
        }
      } else if method == "PUT" {
        let disconnect = if name == CURRENT_FILE { state.disconnect_pointer.take() } else { None };
        if matches!(disconnect, Some(Disconnect::BeforeWrite)) {
          return;
        }
        if name == CURRENT_FILE && state.race_pointer {
          state.race_pointer = false;
          state.next_revision += 1;
          let revision = state.next_revision;
          if let Some(object) = state.objects.get_mut(&name) {
            object.revision = revision;
          }
        }
        let is_snapshot = name.starts_with("teyvatguide-sync-")
          && !name.starts_with("teyvatguide-sync-probe-")
          && !name.ends_with(".manifest.json")
          && name != CURRENT_FILE;
        if is_snapshot && state.fail_snapshot_put {
          (507, Vec::new(), None)
        } else {
          let existing = state.objects.get(&name);
          let none_failed =
            headers.get("if-none-match").is_some_and(|value| value == "*" && existing.is_some());
          let match_failed = headers
            .get("if-match")
            .is_some_and(|value| existing.is_none_or(|object| value != &object_etag(object)));
          if !state.ignore_conditions && (none_failed || match_failed) {
            (412, Vec::new(), None)
          } else {
            let created = existing.is_none();
            state.next_revision += 1;
            let revision = state.next_revision;
            if matches!(disconnect, Some(Disconnect::AfterTruncate))
              || (state.damage_manifest_write && name.ends_with(".manifest.json"))
            {
              body.truncate(body.len() / 2);
            }
            state.objects.insert(name.clone(), Object { bytes: body, revision });
            if disconnect.is_some() {
              return;
            }
            (if created { 201 } else { 204 }, Vec::new(), None)
          }
        }
      } else {
        (405, Vec::new(), None)
      }
    };
    let framing = if method == "GET" && name == CURRENT_FILE && status == 200 {
      state.lock().unwrap().current_framing
    } else {
      ResponseFraming::ContentLength
    };
    let mut response = format!("HTTP/1.1 {status} Test\r\nConnection: close\r\n");
    match framing {
      ResponseFraming::ContentLength => {
        response.push_str(&format!("Content-Length: {}\r\n", output.len()));
      }
      ResponseFraming::Chunked => response.push_str("Transfer-Encoding: chunked\r\n"),
      ResponseFraming::CloseDelimited => (),
    }
    if let Some(etag) = etag {
      response.push_str(&format!("ETag: {etag}\r\n"));
    }
    if status == 302 {
      response.push_str("Location: /should-not-follow\r\n");
    }
    response.push_str("\r\n");
    if stream.write_all(response.as_bytes()).is_err() {
      return;
    }
    if matches!(framing, ResponseFraming::Chunked) {
      for chunk in output.chunks(512) {
        if write!(stream, "{:x}\r\n", chunk.len()).is_err()
          || stream.write_all(chunk).is_err()
          || stream.write_all(b"\r\n").is_err()
        {
          return;
        }
      }
      let _ = stream.write_all(b"0\r\n\r\n");
    } else {
      let _ = stream.write_all(&output);
    }
  }

  /// 在 Tauri 运行时执行单个异步测试步骤。
  ///
  /// @since Beta v0.14.1
  fn run<T>(future: impl Future<Output = T>) -> T {
    tauri::async_runtime::block_on(future)
  }

  /// 使用合成账号上传到本机测试服务。
  ///
  /// @since Beta v0.14.1
  fn upload(server: &FakeServer, snapshot: &str) -> Result<String, String> {
    run(upload_snapshot(&server.url(), "user".into(), "secret".into(), false, true, async {
      Ok(snapshot.into())
    }))
  }

  /// 测试连接失败分支；若意外轮询快照导出则立即失败。
  ///
  /// @since Beta v0.14.1
  async fn unexpected_snapshot_loader() -> Result<String, String> {
    panic!("连接预检失败时不应轮询导出")
  }

  /// 使用合成账号从本机测试服务下载 current。
  ///
  /// @since Beta v0.14.1
  fn download(server: &FakeServer) -> Result<String, String> {
    run(download_snapshot(&server.url(), "user".into(), "secret".into(), false, true, None))
  }

  /// 使用合成账号直接从独立清单恢复指定快照。
  ///
  /// @since Beta v0.14.1
  fn download_history(server: &FakeServer, id: &str) -> Result<String, String> {
    run(download_snapshot(
      &server.url(),
      "user".into(),
      "secret".into(),
      false,
      true,
      Some(id.into()),
    ))
  }

  /// 地址认证边界和明文授权不允许被隐式绕过。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn directory_and_transport_validation() {
    assert!(parse_directory("https://example.test/dav", false).is_ok());
    assert_eq!(parse_directory("http://127.0.0.1:8080/dav/", false).unwrap_err(), INSECURE_HTTP);
    assert!(parse_directory("http://127.0.0.1:8080/dav/", true).is_ok());
    for value in [
      "https://user:pass@example.test/dav",
      "https://@example.test/dav",
      "https://example.test/dav?token=x",
      "https://example.test/dav#fragment",
      "file:///tmp/dav",
      "https://example.test/\npath",
    ] {
      assert_eq!(parse_directory(value, true).unwrap_err(), INVALID_URL);
    }
  }

  /// 强 ETag 必须是唯一的合法实体标签。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn only_single_strong_etag_is_accepted() {
    let mut headers = HeaderMap::new();
    headers.insert(ETAG, HeaderValue::from_static("\"valid\""));
    assert!(strong_etag(&headers).is_some());
    headers.insert(ETAG, HeaderValue::from_static("W/\"weak\""));
    assert!(strong_etag(&headers).is_none());
    headers.insert(ETAG, HeaderValue::from_static("\"one\", \"two\""));
    assert!(strong_etag(&headers).is_none());
    headers.insert(ETAG, HeaderValue::from_static("\"first\""));
    headers.append(ETAG, HeaderValue::from_static("\"second\""));
    assert!(strong_etag(&headers).is_none());
  }

  /// 完成两次发布后，current 返回新快照，旧 ID 仍可恢复原内容。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn upload_download_and_previous_snapshot_remains() {
    let server = FakeServer::new();
    let old = r#"{"from":"windows","value":1}"#;
    let new = r#"{"from":"windows","value":2}"#;
    assert_eq!(download(&server).unwrap_err(), NOT_FOUND);
    let old_id = upload(&server, old).unwrap();
    assert_eq!(download(&server).unwrap(), old);
    let new_id = upload(&server, new).unwrap();
    assert_ne!(new_id, old_id);
    assert_eq!(download(&server).unwrap(), new);
    assert_eq!(download_history(&server, &old_id).unwrap(), old);
    assert_eq!(download_history(&server, &new_id).unwrap(), new);
    let state = server.state.lock().unwrap();
    assert!(state.objects.contains_key(&format!("teyvatguide-sync-{old_id}.manifest.json")));
    assert!(state.saw_basic_auth);
  }

  /// 服务端不遵循条件写入或只提供弱 ETag 时不得修改旧指针。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn unsafe_servers_are_rejected_without_replacing_previous_pointer() {
    for weak in [false, true] {
      let server = FakeServer::new();
      upload(&server, "old").unwrap();
      let old_pointer =
        server.state.lock().unwrap().objects.get(CURRENT_FILE).unwrap().bytes.clone();
      {
        let mut state = server.state.lock().unwrap();
        state.weak_etag = weak;
        state.ignore_conditions = !weak;
      }
      assert_eq!(upload(&server, "new").unwrap_err(), UNSUPPORTED);
      assert_eq!(
        server.state.lock().unwrap().objects.get(CURRENT_FILE).unwrap().bytes,
        old_pointer
      );
    }
  }

  /// 创建快照失败或并发指针更新不得覆盖旧快照。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn failed_upload_and_conflict_preserve_previous_snapshot() {
    let server = FakeServer::new();
    let old_id = upload(&server, "old").unwrap();
    server.state.lock().unwrap().fail_snapshot_put = true;
    assert_eq!(upload(&server, "new").unwrap_err(), HTTP_ERROR);
    assert_eq!(download(&server).unwrap(), "old");
    {
      let mut state = server.state.lock().unwrap();
      state.fail_snapshot_put = false;
      state.race_pointer = true;
    }
    assert_eq!(upload(&server, "new").unwrap_err(), CONFLICT);
    assert_eq!(download(&server).unwrap(), "old");
    assert_eq!(download_history(&server, &old_id).unwrap(), "old");
  }

  /// 确认独立清单的写入结果之前，不得变更 current。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn damaged_manifest_prevents_publish() {
    let server = FakeServer::new();
    let old_id = upload(&server, "old").unwrap();
    server.state.lock().unwrap().damage_manifest_write = true;
    assert_eq!(upload(&server, "new").unwrap_err(), INTEGRITY);
    assert_eq!(download(&server).unwrap(), "old");
    assert_eq!(download_history(&server, &old_id).unwrap(), "old");
  }

  /// 指针提交前后断线都报告未知状态，既不回滚也不删除历史快照。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn disconnect_before_or_after_publish_reports_unknown() {
    let server = FakeServer::new();
    let old_id = upload(&server, "old").unwrap();
    server.state.lock().unwrap().disconnect_pointer = Some(Disconnect::BeforeWrite);
    assert_eq!(upload(&server, "uncommitted").unwrap_err(), PUBLISH_UNKNOWN);
    assert_eq!(download(&server).unwrap(), "old");
    server.state.lock().unwrap().disconnect_pointer = Some(Disconnect::AfterCommit);
    assert_eq!(upload(&server, "committed").unwrap_err(), PUBLISH_UNKNOWN);
    assert_eq!(download(&server).unwrap(), "committed");
    assert_eq!(download_history(&server, &old_id).unwrap(), "old");
  }

  /// 模拟服务端在断线后留下半个 current，旧 ID 仍能直接恢复且不尝试修复指针。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn truncated_current_after_disconnect_is_recoverable_by_old_id() {
    let server = FakeServer::new();
    let old_id = upload(&server, "old").unwrap();
    server.state.lock().unwrap().disconnect_pointer = Some(Disconnect::AfterTruncate);
    assert_eq!(upload(&server, "interrupted").unwrap_err(), PUBLISH_UNKNOWN);
    let error = download(&server).unwrap_err();
    assert_eq!(error, INVALID_METADATA);
    assert!(error.contains("之前的快照 ID"));
    assert_eq!(upload(&server, "replacement").unwrap_err(), INVALID_METADATA);
    let (truncated, request_count) = {
      let state = server.state.lock().unwrap();
      (state.objects[CURRENT_FILE].bytes.clone(), state.request_count)
    };
    assert_eq!(download_history(&server, &old_id).unwrap(), "old");
    let state = server.state.lock().unwrap();
    assert_eq!(state.request_count, request_count + 2);
    assert_eq!(state.objects[CURRENT_FILE].bytes, truncated);
  }

  /// 快照被破坏或信封试图引用其他路径时绝不返回数据。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn corrupted_snapshot_and_untrusted_metadata_are_rejected() {
    let server = FakeServer::new();
    let id = upload(&server, "original").unwrap();
    let name = format!("teyvatguide-sync-{id}.json");
    server.state.lock().unwrap().objects.get_mut(&name).unwrap().bytes = b"tampered".to_vec();
    // 数据同长度但哈希不匹配；current 与历史下载都必须拒绝。
    assert_eq!(download(&server).unwrap_err(), INTEGRITY);
    assert_eq!(download_history(&server, &id).unwrap_err(), INTEGRITY);
    assert_eq!(upload(&server, "replacement").unwrap_err(), INTEGRITY);
    {
      let mut state = server.state.lock().unwrap();
      let pointer = &mut state.objects.get_mut(CURRENT_FILE).unwrap().bytes;
      let mut value: serde_json::Value = serde_json::from_slice(pointer).unwrap();
      value["snapshot_file"] = serde_json::Value::String("../other.json".into());
      *pointer = serde_json::to_vec(&value).unwrap();
    }
    assert_eq!(download(&server).unwrap_err(), INVALID_METADATA);
  }

  /// 历史 ID 须为规范 UUID，清单须绑定请求 ID，并通过版本、长度与摘要格式校验。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn invalid_history_ids_and_manifests_are_rejected() {
    let server = FakeServer::new();
    for invalid in ["../current.json", "%2f", "00000000-0000-4000-0000-000000000000"] {
      assert_eq!(download_history(&server, invalid).unwrap_err(), INVALID_SNAPSHOT_ID);
    }
    assert_eq!(server.state.lock().unwrap().request_count, 0);
    let absent = Uuid::new_v4().to_string();
    assert_eq!(download_history(&server, &absent).unwrap_err(), HISTORY_NOT_FOUND);
    let id = upload(&server, "original").unwrap();
    let name = format!("teyvatguide-sync-{id}.manifest.json");
    let original: serde_json::Value =
      serde_json::from_slice(&server.state.lock().unwrap().objects[&name].bytes).unwrap();
    for (field, replacement) in [
      ("format_version", serde_json::json!(2)),
      ("byte_length", serde_json::json!(MAX_SNAPSHOT_BYTES + 1)),
      ("sha256", serde_json::json!("g".repeat(64))),
      ("snapshot_file", serde_json::json!("../other.json")),
    ] {
      let mut metadata = original.clone();
      metadata[field] = replacement;
      server.state.lock().unwrap().objects.get_mut(&name).unwrap().bytes =
        serde_json::to_vec(&metadata).unwrap();
      assert_eq!(download_history(&server, &id).unwrap_err(), INVALID_METADATA);
    }
    // 即使是另一份完全有效的清单，也不能用来回答此 ID 的请求。
    let other = upload(&server, "other").unwrap();
    {
      let mut state = server.state.lock().unwrap();
      let wrong_manifest =
        state.objects[&format!("teyvatguide-sync-{other}.manifest.json")].bytes.clone();
      state.objects.get_mut(&name).unwrap().bytes = wrong_manifest;
    }
    assert_eq!(download_history(&server, &id).unwrap_err(), INVALID_METADATA);
    assert_eq!(download(&server).unwrap(), "other");
  }

  /// 认证和重定向时只返回脱敏错误，且不跟随跳转。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn errors_are_redacted_and_redirects_are_not_followed() {
    let server = FakeServer::new();
    server.state.lock().unwrap().status_override = Some(401);
    let error = download(&server).unwrap_err();
    assert_eq!(error, AUTH);
    for secret in ["user", "secret", "private-response", &server.url()] {
      assert!(!error.contains(secret));
    }
    {
      let mut state = server.state.lock().unwrap();
      state.status_override = Some(302);
      state.request_count = 0;
    }
    assert_eq!(download(&server).unwrap_err(), REDIRECT);
    assert_eq!(server.state.lock().unwrap().request_count, 1);
  }

  /// 即使响应不声明 Content-Length，也要按实际流量检查上限。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn response_limits_cover_declared_close_delimited_and_chunked_bodies() {
    let server = FakeServer::new();
    upload(&server, "original").unwrap();
    for framing in [ResponseFraming::CloseDelimited, ResponseFraming::Chunked] {
      server.state.lock().unwrap().current_framing = framing;
      assert_eq!(download(&server).unwrap(), "original");
    }
    server.state.lock().unwrap().objects.get_mut(CURRENT_FILE).unwrap().bytes =
      vec![b'x'; MAX_METADATA_BYTES + 1];
    for framing in
      [ResponseFraming::ContentLength, ResponseFraming::CloseDelimited, ResponseFraming::Chunked]
    {
      server.state.lock().unwrap().current_framing = framing;
      assert_eq!(download(&server).unwrap_err(), RESPONSE_TOO_LARGE);
    }
  }

  /// 本地连接参数不合法时，既不发送请求也不轮询导出。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn invalid_upload_connection_does_not_poll_snapshot_loader() {
    let server = FakeServer::new();
    let http_address = server.url();
    for (address, error) in [("invalid-url", INVALID_URL), (http_address.as_str(), INSECURE_HTTP)] {
      assert_eq!(
        run(upload_snapshot(
          address,
          "user".into(),
          "secret".into(),
          false,
          false,
          unexpected_snapshot_loader(),
        ))
        .unwrap_err(),
        error
      );
    }
    assert_eq!(server.state.lock().unwrap().request_count, 0);
  }

  /// current 读取失败时不检查目录也不轮询导出，并且只返回脱敏错误。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn current_request_failure_does_not_poll_snapshot_loader() {
    for (status, expected) in [(None, NETWORK), (Some(401), AUTH), (Some(403), AUTH)] {
      let server = FakeServer::new();
      {
        let mut state = server.state.lock().unwrap();
        state.status_override = status;
        state.disconnect_current_get = status.is_none();
      }
      let error = run(upload_snapshot(
        &server.url(),
        "user".into(),
        "secret".into(),
        false,
        true,
        unexpected_snapshot_loader(),
      ))
      .unwrap_err();
      assert_eq!(error, expected);
      let state = server.state.lock().unwrap();
      assert_eq!(state.requests, [("GET".to_string(), format!("/dav/{CURRENT_FILE}"))]);
      assert!(state.objects.is_empty());
    }
  }

  /// 目录探测错误不得触发导出或写入，不把响应体、地址或凭证带入错误。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn directory_probe_failure_does_not_poll_snapshot_loader() {
    for (status, expected) in [
      (404, DIRECTORY_NOT_FOUND),
      (410, DIRECTORY_NOT_FOUND),
      (401, AUTH),
      (403, AUTH),
      (302, REDIRECT),
      (500, HTTP_ERROR),
    ] {
      let server = FakeServer::new();
      server.state.lock().unwrap().directory_status = Some(status);
      let address = format!("http://{}/dav", server.address);
      let error = run(upload_snapshot(
        &address,
        "user".into(),
        "secret".into(),
        false,
        true,
        unexpected_snapshot_loader(),
      ))
      .unwrap_err();
      assert_eq!(error, expected);
      for private in [address.as_str(), "user", "secret", "private-response"] {
        assert!(!error.contains(private));
      }
      let state = server.state.lock().unwrap();
      assert_eq!(
        state.requests,
        [
          ("GET".to_string(), format!("/dav/{CURRENT_FILE}")),
          ("PROPFIND".to_string(), "/dav/".to_string()),
        ]
      );
      assert!(state.saw_authenticated_directory_probe);
      assert!(state.objects.is_empty());
    }
  }

  /// 首次发布允许 207 和明确未实现的状态，但不在导出成功前执行写入探针。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn first_publish_loader_failure_leaves_remote_untouched() {
    const EXPORT_ERROR: &str = "SYNC_INVALID：合成导出错误";
    for status in [207, 405, 501] {
      let server = FakeServer::new();
      server.state.lock().unwrap().directory_status = Some(status);
      let error =
        run(upload_snapshot(&server.url(), "user".into(), "secret".into(), false, true, async {
          assert_eq!(server.state.lock().unwrap().request_count, 2);
          Err(EXPORT_ERROR.to_string())
        }))
        .unwrap_err();
      assert_eq!(error, EXPORT_ERROR);
      let state = server.state.lock().unwrap();
      assert_eq!(
        state.requests,
        [
          ("GET".to_string(), format!("/dav/{CURRENT_FILE}")),
          ("PROPFIND".to_string(), "/dav/".to_string()),
        ]
      );
      assert!(state.saw_authenticated_directory_probe);
      assert!(state.objects.is_empty());
    }
  }

  /// 已有 current 只预检一次，发布必须使用导出前读到的 ETag。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn existing_current_uses_etag_from_before_snapshot_loader() {
    let server = FakeServer::new();
    let old_id = upload(&server, "old").unwrap();
    server.state.lock().unwrap().requests.clear();
    let current_path = format!("/dav/{CURRENT_FILE}");
    let snapshot_path = format!("/dav/teyvatguide-sync-{old_id}.json");
    let address = server.url();
    let result =
      run(upload_snapshot(&address, "user".into(), "secret".into(), false, true, async {
        let mut state = server.state.lock().unwrap();
        assert_eq!(
          state.requests,
          [("GET".to_string(), current_path.clone()), ("GET".to_string(), snapshot_path)]
        );
        state.next_revision += 1;
        let revision = state.next_revision;
        state.objects.get_mut(CURRENT_FILE).unwrap().revision = revision;
        Ok("new".to_string())
      }));
    assert_eq!(result.unwrap_err(), CONFLICT);
    let state = server.state.lock().unwrap();
    assert_eq!(
      state
        .requests
        .iter()
        .filter(|(method, path)| method == "GET" && path == &current_path)
        .count(),
      1
    );
    assert!(!state.requests.iter().any(|(method, _)| method == "PROPFIND"));
  }

  /// 输入超过上限时在只读预检之后、任何写入之前失败，不截断数据。
  ///
  /// @since Beta v0.14.1
  #[test]
  fn snapshot_size_limit_is_enforced_before_writes() {
    let server = FakeServer::new();
    let too_large = "x".repeat(MAX_SNAPSHOT_BYTES + 1);
    assert_eq!(upload(&server, &too_large).unwrap_err(), TOO_LARGE);
    let state = server.state.lock().unwrap();
    assert_eq!(state.request_count, 2);
    assert!(state.objects.is_empty());
  }
}
