//! 游戏安装、渠道方案与检测状态数据模型。
//! @since Beta v0.11.5

use serde::{Deserialize, Serialize};

/// TeyvatGuide 支持的国服客户端方案。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SchemeId {
  CnOfficial,
  CnBilibili,
}

impl SchemeId {
  /// 将数据库中的渠道方案字符串解析为受支持的方案枚举。
  pub fn parse(value: &str) -> Option<Self> {
    match value {
      "cn_official" => Some(Self::CnOfficial),
      "cn_bilibili" => Some(Self::CnBilibili),
      _ => None,
    }
  }
}

/// 游戏安装检测结果。
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallationStatus {
  Known,
  Unsupported,
  Inconsistent,
}

/// 已登记游戏安装及其最新磁盘状态。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInstallation {
  pub id: String,
  pub executable_path: String,
  pub root_path: String,
  pub scheme_id: Option<SchemeId>,
  pub preferred_scheme: Option<SchemeId>,
  pub status: InstallationStatus,
  pub status_message: String,
  pub version: Option<String>,
  pub channel: Option<u32>,
  pub sub_channel: Option<u32>,
  pub has_channel_sdk: bool,
  pub audio_languages: Vec<String>,
  pub is_chosen: bool,
  pub last_seen: String,
}
