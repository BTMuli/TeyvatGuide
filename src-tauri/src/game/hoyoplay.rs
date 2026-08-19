//! 国服 HoyoPlay 分支元数据的只读客户端。
//! @since Beta v0.11.5

use super::{
  model::{PackageSnapshot, RemoteVersionSnapshot, SchemeId},
  scheme::registry_entry,
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
    .timeout(Duration::from_secs(45))
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
  use super::{BranchDescriptor, Category, validate_branch};

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
}
