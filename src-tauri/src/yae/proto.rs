//! @file src/yae/proto.rs
//! @desc Yae JSON 数据转换模块
//! @since Beta v0.8.7

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UiafData {
  pub info: UiafInfo,
  pub list: Vec<UiafAchievement>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UiafInfo {
  pub export_app: String,
  pub export_timestamp: i64,
  pub export_app_version: String,
  pub uiaf_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UiafAchievement {
  pub id: u32,
  pub timestamp: i64,
  pub current: u32,
  pub status: u32,
}

/// Parse Yae JSON data to UIAF format
pub fn parse_yae_data(data: &[u8]) -> Result<UiafData, Box<dyn std::error::Error>> {
  let json_str = std::str::from_utf8(data)?;
  let uiaf_data: UiafData = serde_json::from_str(json_str)?;
  Ok(uiaf_data)
}
