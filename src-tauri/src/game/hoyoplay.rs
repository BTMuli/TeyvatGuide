//! 国服 HoyoPlay 分支元数据的只读客户端。
//! @since Beta v0.11.5

use super::{
  model::{PackageSnapshot, RemoteVersionSnapshot, SchemeId},
  scheme::registry_entry,
  sophon::is_official_download_host,
};
use futures_util::TryStreamExt;
use reqwest::{Client, Response, redirect::Policy};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::time::Duration;
use url::Url;

const API_ORIGIN: &str = "https://hyp-api.mihoyo.com";
const MAX_JSON_BYTES: usize = 4 * 1024 * 1024;

/// HoyoPlay 返回的单个资源分类。
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Category {
  pub category_id: String,
  pub matching_field: String,
}

/// Sophon 请求所需的分支描述。密码不得序列化到前端或日志。
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct BranchDescriptor {
  pub package_id: String,
  pub branch: String,
  pub password: String,
  pub tag: String,
  #[serde(default)]
  pub diff_tags: Vec<String>,
  #[serde(default)]
  pub categories: Vec<Category>,
}

impl BranchDescriptor {
  /// 生成同一主分支上用于读取旧版本 manifest 的临时描述。
  pub fn with_tag(&self, tag: &str) -> Self {
    let mut branch = self.clone();
    branch.tag = tag.to_string();
    branch
  }

  /// 返回不含密码与下载信息的前端投影。
  fn snapshot(&self) -> RemoteVersionSnapshot {
    RemoteVersionSnapshot { tag: self.tag.clone(), diff_tags: self.diff_tags.clone() }
  }
}

/// 一个游戏的主分支和可选预下载分支。
#[derive(Clone, Debug)]
pub struct GameBranches {
  pub main: BranchDescriptor,
  pub pre_download: Option<BranchDescriptor>,
}

#[derive(Deserialize)]
struct ApiResponse<T> {
  retcode: i32,
  message: String,
  data: Option<T>,
}

#[derive(Deserialize)]
struct BranchesData {
  game_branches: Vec<GameBranchResponse>,
}

#[derive(Deserialize)]
struct GameBranchResponse {
  game: GameIdentity,
  main: BranchDescriptor,
  pre_download: Option<BranchDescriptor>,
}

#[derive(Deserialize)]
struct GameIdentity {
  id: String,
}

/// 只允许访问固定国服 API 且不跟随重定向的 HTTP 客户端。
pub fn create_http_client() -> Result<Client, String> {
  Client::builder()
    .connect_timeout(Duration::from_secs(15))
    .read_timeout(Duration::from_secs(45))
    .redirect(Policy::none())
    .user_agent("TeyvatGuide/0.11.5")
    .build()
    .map_err(|error| format!("创建游戏资源 HTTP 客户端失败：{error}"))
}

/// 按严格字节上限读取 JSON 响应，避免无界响应占用内存。
pub async fn read_limited_json<T: DeserializeOwned>(
  response: Response,
  limit: usize,
  context: &str,
) -> Result<T, String> {
  if !response.status().is_success() {
    return Err(format!("{context}请求失败：HTTP {}", response.status().as_u16()));
  }
  if response.content_length().is_some_and(|length| length > limit as u64) {
    return Err(format!("{context}响应超过大小上限"));
  }
  let mut stream = response.bytes_stream();
  let mut bytes = Vec::new();
  while let Some(chunk) =
    stream.try_next().await.map_err(|error| network_error(&format!("读取{context}"), &error))?
  {
    if bytes.len().saturating_add(chunk.len()) > limit {
      return Err(format!("{context}响应超过大小上限"));
    }
    bytes.extend_from_slice(&chunk);
  }
  serde_json::from_slice(&bytes).map_err(|error| format!("解析{context}失败：{error}"))
}

/// 从固定官方 API 读取并校验一个受支持渠道的分支信息。
pub async fn get_game_branches(client: &Client, scheme: SchemeId) -> Result<GameBranches, String> {
  let registry = registry_entry(scheme);
  let mut url = Url::parse(&format!("{API_ORIGIN}/hyp/hyp-connect/api/getGameBranches"))
    .map_err(|error| format!("HoyoPlay API 地址无效：{error}"))?;
  url
    .query_pairs_mut()
    .append_pair("game_ids[]", registry.game_id)
    .append_pair("launcher_id", registry.launcher_id);
  let response =
    client.get(url).send().await.map_err(|error| network_error("请求 HoyoPlay 分支", &error))?;
  let response: ApiResponse<BranchesData> =
    read_limited_json(response, MAX_JSON_BYTES, "HoyoPlay 分支").await?;
  if response.retcode != 0 {
    return Err(format!("HoyoPlay 返回错误 {}：{}", response.retcode, response.message));
  }
  let data = response.data.ok_or_else(|| "HoyoPlay 分支响应缺少 data".to_string())?;
  if data.game_branches.len() > 32 {
    return Err("HoyoPlay 游戏分支数量超过安全上限".to_string());
  }
  let mut matching = data.game_branches.into_iter().filter(|item| item.game.id == registry.game_id);
  let branch = matching.next().ok_or_else(|| "HoyoPlay 未返回目标游戏分支".to_string())?;
  if matching.next().is_some() {
    return Err("HoyoPlay 返回了重复的目标游戏分支".to_string());
  }
  validate_branch(&branch.main, false)?;
  if let Some(pre_download) = &branch.pre_download {
    validate_branch(pre_download, true)?;
  }
  Ok(GameBranches { main: branch.main, pre_download: branch.pre_download })
}

/// 将 reqwest 错误转换成不包含 URL、query 或 branch password 的诊断。
pub fn network_error(context: &str, error: &reqwest::Error) -> String {
  let kind = if error.is_timeout() {
    "请求超时"
  } else if error.is_connect() {
    "连接失败"
  } else if error.is_body() {
    "响应体读取失败"
  } else {
    "网络错误"
  };
  format!("{context}失败：{kind}")
}

const MAX_CHANNEL_SDKS: usize = 8;
const MAX_DEPRECATED_CONFIGS: usize = 8;
const MAX_DEPRECATED_FILES: usize = 256;
const MAX_SDK_PACKAGE_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_SDK_DECOMPRESSED_BYTES: u64 = 2 * 1024 * 1024 * 1024;

/// 目标渠道 SDK 压缩包；URL 仅驻留后端。
#[derive(Clone, Debug)]
pub struct ChannelSdkPackage {
  pub version: String,
  pub pkg_version_file_name: String,
  pub md5: String,
  pub size: u64,
  pub decompressed_size: u64,
  pub url: String,
}

#[derive(Deserialize)]
struct ChannelSdksData {
  game_channel_sdks: Vec<ChannelSdkResponse>,
}

#[derive(Deserialize)]
struct ChannelSdkResponse {
  game: GameIdentity,
  version: String,
  channel_sdk_pkg: ChannelSdkPkg,
  pkg_version_file_name: String,
}

#[derive(Deserialize)]
struct ChannelSdkPkg {
  url: String,
  md5: String,
  #[serde(deserialize_with = "deserialize_u64")]
  size: u64,
  #[serde(deserialize_with = "deserialize_u64")]
  decompressed_size: u64,
}

#[derive(Deserialize)]
struct DeprecatedConfigsData {
  deprecated_file_configs: Vec<DeprecatedConfigResponse>,
}

#[derive(Deserialize)]
struct DeprecatedConfigResponse {
  game: GameIdentity,
  deprecated_files: Vec<DeprecatedFileResponse>,
}

#[derive(Deserialize)]
struct DeprecatedFileResponse {
  name: String,
}

/// 读取目标渠道的 SDK 压缩包；官服通常没有渠道 SDK。
pub async fn get_channel_sdk(
  client: &Client,
  scheme: SchemeId,
) -> Result<Option<ChannelSdkPackage>, String> {
  let registry = registry_entry(scheme);
  let (channel, sub_channel) = super::scheme::canonical_channel(scheme);
  let mut url = Url::parse(&format!("{API_ORIGIN}/hyp/hyp-connect/api/getGameChannelSDKs"))
    .map_err(|error| format!("HoyoPlay API 地址无效：{error}"))?;
  url
    .query_pairs_mut()
    .append_pair("game_ids[]", registry.game_id)
    .append_pair("launcher_id", registry.launcher_id)
    .append_pair("channel", &channel.to_string())
    .append_pair("sub_channel", &sub_channel.to_string());
  let response = client
    .get(url)
    .send()
    .await
    .map_err(|error| network_error("请求 HoyoPlay 渠道 SDK", &error))?;
  let response: ApiResponse<ChannelSdksData> =
    read_limited_json(response, MAX_JSON_BYTES, "HoyoPlay 渠道 SDK").await?;
  if response.retcode != 0 {
    return Err(format!("HoyoPlay 返回错误 {}：{}", response.retcode, response.message));
  }
  let data = response.data.ok_or_else(|| "HoyoPlay 渠道 SDK 响应缺少 data".to_string())?;
  if data.game_channel_sdks.len() > MAX_CHANNEL_SDKS {
    return Err("HoyoPlay 渠道 SDK 数量超过安全上限".to_string());
  }
  let mut matching =
    data.game_channel_sdks.into_iter().filter(|item| item.game.id == registry.game_id);
  let Some(item) = matching.next() else {
    return Ok(None);
  };
  if matching.next().is_some() {
    return Err("HoyoPlay 返回了重复的渠道 SDK".to_string());
  }
  Ok(Some(validate_channel_sdk(item)?))
}

/// 读取目标渠道声明的废弃文件相对路径。
pub async fn get_deprecated_files(
  client: &Client,
  scheme: SchemeId,
) -> Result<Vec<String>, String> {
  let registry = registry_entry(scheme);
  let (channel, sub_channel) = super::scheme::canonical_channel(scheme);
  let mut url =
    Url::parse(&format!("{API_ORIGIN}/hyp/hyp-connect/api/getGameDeprecatedFileConfigs"))
      .map_err(|error| format!("HoyoPlay API 地址无效：{error}"))?;
  url
    .query_pairs_mut()
    .append_pair("game_ids[]", registry.game_id)
    .append_pair("launcher_id", registry.launcher_id)
    .append_pair("channel", &channel.to_string())
    .append_pair("sub_channel", &sub_channel.to_string());
  let response = client
    .get(url)
    .send()
    .await
    .map_err(|error| network_error("请求 HoyoPlay 废弃文件", &error))?;
  let response: ApiResponse<DeprecatedConfigsData> =
    read_limited_json(response, MAX_JSON_BYTES, "HoyoPlay 废弃文件").await?;
  if response.retcode != 0 {
    return Err(format!("HoyoPlay 返回错误 {}：{}", response.retcode, response.message));
  }
  let data = response.data.ok_or_else(|| "HoyoPlay 废弃文件响应缺少 data".to_string())?;
  if data.deprecated_file_configs.len() > MAX_DEPRECATED_CONFIGS {
    return Err("HoyoPlay 废弃文件配置数量超过安全上限".to_string());
  }
  let mut matching =
    data.deprecated_file_configs.into_iter().filter(|item| item.game.id == registry.game_id);
  let Some(item) = matching.next() else {
    return Ok(Vec::new());
  };
  if matching.next().is_some() {
    return Err("HoyoPlay 返回了重复的废弃文件配置".to_string());
  }
  if item.deprecated_files.len() > MAX_DEPRECATED_FILES {
    return Err("HoyoPlay 废弃文件数量超过安全上限".to_string());
  }
  let mut names = Vec::new();
  let mut seen = std::collections::HashSet::new();
  for file in item.deprecated_files {
    let name = super::path_guard::normalize_manifest_path(&file.name)?;
    if !seen.insert(name.clone()) {
      return Err(format!("HoyoPlay 废弃文件包含重复路径：{name}"));
    }
    names.push(name);
  }
  Ok(names)
}

fn validate_channel_sdk(item: ChannelSdkResponse) -> Result<ChannelSdkPackage, String> {
  if item.version.is_empty()
    || item.version.len() > 128
    || item.version.chars().any(char::is_control)
  {
    return Err("HoyoPlay 渠道 SDK 版本无效".to_string());
  }
  let pkg_version_file_name =
    super::path_guard::normalize_manifest_path(&item.pkg_version_file_name)?;
  if !is_hex_md5(&item.channel_sdk_pkg.md5) {
    return Err("HoyoPlay 渠道 SDK 校验值无效".to_string());
  }
  if item.channel_sdk_pkg.size == 0 || item.channel_sdk_pkg.size > MAX_SDK_PACKAGE_BYTES {
    return Err("HoyoPlay 渠道 SDK 压缩包大小无效".to_string());
  }
  if item.channel_sdk_pkg.decompressed_size == 0
    || item.channel_sdk_pkg.decompressed_size > MAX_SDK_DECOMPRESSED_BYTES
    || item.channel_sdk_pkg.decompressed_size < item.channel_sdk_pkg.size
  {
    return Err("HoyoPlay 渠道 SDK 解压大小无效".to_string());
  }
  let url = Url::parse(&item.channel_sdk_pkg.url)
    .map_err(|_| "HoyoPlay 渠道 SDK 下载地址无效".to_string())?;
  if url.scheme() != "https" {
    return Err("HoyoPlay 渠道 SDK 下载地址必须使用 HTTPS".to_string());
  }
  let host = url.host_str().unwrap_or_default();
  if !is_official_download_host(host) {
    return Err("HoyoPlay 渠道 SDK 下载主机不受信任".to_string());
  }
  Ok(ChannelSdkPackage {
    version: item.version,
    pkg_version_file_name,
    md5: item.channel_sdk_pkg.md5.to_ascii_lowercase(),
    size: item.channel_sdk_pkg.size,
    decompressed_size: item.channel_sdk_pkg.decompressed_size,
    url: url.to_string(),
  })
}

fn is_hex_md5(value: &str) -> bool {
  value.len() == 32 && value.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn deserialize_u64<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
  D: serde::Deserializer<'de>,
{
  #[derive(Deserialize)]
  #[serde(untagged)]
  enum Number {
    Integer(u64),
    String(String),
  }
  match Number::deserialize(deserializer)? {
    Number::Integer(value) => Ok(value),
    Number::String(value) => value.parse().map_err(serde::de::Error::custom),
  }
}

/// 将已校验的远端分支转换为不含敏感字段的版本快照。
pub fn create_snapshot(
  installation_id: String,
  local_version: Option<String>,
  branches: &GameBranches,
) -> PackageSnapshot {
  let update_available = local_version.as_deref().is_none_or(|tag| tag != branches.main.tag);
  PackageSnapshot {
    installation_id,
    local_version,
    main: branches.main.snapshot(),
    pre_download: branches.pre_download.as_ref().map(BranchDescriptor::snapshot),
    update_available,
    pre_download_available: branches.pre_download.is_some(),
  }
}

fn validate_branch(branch: &BranchDescriptor, pre_download: bool) -> Result<(), String> {
  for (name, value) in [
    ("package_id", branch.package_id.as_str()),
    ("branch", branch.branch.as_str()),
    ("password", branch.password.as_str()),
    ("tag", branch.tag.as_str()),
  ] {
    if value.is_empty() || value.len() > 512 || value.chars().any(char::is_control) {
      return Err(format!("HoyoPlay 分支字段 {name} 无效"));
    }
  }
  if pre_download && !branch.branch.eq_ignore_ascii_case("PREDOWNLOAD") {
    return Err("HoyoPlay 预下载分支名称无效".to_string());
  }
  if branch.diff_tags.len() > 128 || branch.categories.len() > 16 {
    return Err("HoyoPlay 分支列表超过安全上限".to_string());
  }
  if branch
    .diff_tags
    .iter()
    .any(|tag| tag.is_empty() || tag.len() > 128 || tag.chars().any(char::is_control))
  {
    return Err("HoyoPlay 分支包含无效 diff tag".to_string());
  }
  let mut matching_fields = std::collections::HashSet::new();
  if branch.categories.iter().any(|category| {
    category.category_id.is_empty()
      || !matches!(category.matching_field.as_str(), "game" | "zh-cn" | "en-us" | "ja-jp" | "ko-kr")
      || !matching_fields.insert(category.matching_field.as_str())
  }) {
    return Err("HoyoPlay 分支包含未知资源分类".to_string());
  }
  if !matching_fields.contains("game") {
    return Err("HoyoPlay 分支缺少 game 资源分类".to_string());
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{
    BranchDescriptor, Category, ChannelSdkResponse, validate_branch, validate_channel_sdk,
  };

  fn branch() -> BranchDescriptor {
    BranchDescriptor {
      package_id: "package".to_string(),
      branch: "main".to_string(),
      password: "secret".to_string(),
      tag: "7.0.0".to_string(),
      diff_tags: vec!["6.7.0".to_string()],
      categories: vec![Category {
        category_id: "10017".to_string(),
        matching_field: "game".to_string(),
      }],
    }
  }

  #[test]
  fn rejects_unknown_resource_categories() {
    let mut value = branch();
    value.categories[0].matching_field = "unknown".to_string();
    assert!(validate_branch(&value, false).is_err());
  }

  #[test]
  fn validates_expected_branch_shape() {
    assert!(validate_branch(&branch(), false).is_ok());
  }

  #[test]
  fn accepts_https_mhy_channel_sdk() {
    let item: ChannelSdkResponse = serde_json::from_str(
      r#"{
        "game": {"id": "T2S0Gz4Dr2"},
        "version": "5.0.4",
        "channel_sdk_pkg": {
          "url": "https://launcher-webstatic.mihoyo.com/launcher-public/sdk.zip",
          "md5": "c87f71a619903799d20a9a688977f9f3",
          "size": "84988032",
          "decompressed_size": "169976064"
        },
        "pkg_version_file_name": "sdk_pkg_version"
      }"#,
    )
    .unwrap();
    let package = validate_channel_sdk(item).unwrap();
    assert_eq!(package.version, "5.0.4");
    assert_eq!(package.size, 84_988_032);
  }

  #[test]
  fn rejects_insecure_channel_sdk_url() {
    let item: ChannelSdkResponse = serde_json::from_str(
      r#"{
        "game": {"id": "T2S0Gz4Dr2"},
        "version": "5.0.4",
        "channel_sdk_pkg": {
          "url": "http://launcher-webstatic.mihoyo.com/sdk.zip",
          "md5": "c87f71a619903799d20a9a688977f9f3",
          "size": "10",
          "decompressed_size": "20"
        },
        "pkg_version_file_name": "sdk_pkg_version"
      }"#,
    )
    .unwrap();
    assert!(validate_channel_sdk(item).is_err());
  }
}
