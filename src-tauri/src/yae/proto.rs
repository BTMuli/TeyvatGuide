//! @file src/yae/proto.rs
//! @desc Yae protobuf 数据转换模块
//! @since Beta v0.8.7

use prost::Message;
use serde::{Deserialize, Serialize};

// Include the generated protobuf code
pub mod yae {
  include!(concat!(env!("OUT_DIR"), "/yae.rs"));
}

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

/// Convert Yae protobuf data to UIAF format
pub fn convert_yae_to_uiaf(data: &[u8]) -> Result<UiafData, Box<dyn std::error::Error>> {
  let achievement_data = yae::AchievementData::decode(data)?;
  
  let achievements: Vec<UiafAchievement> = achievement_data
    .achievements
    .iter()
    .map(|a| UiafAchievement {
      id: a.id,
      timestamp: a.timestamp as i64,
      current: a.current,
      status: a.status,
    })
    .collect();

  Ok(UiafData {
    info: UiafInfo {
      export_app: "Yae".to_string(),
      export_timestamp: chrono::Utc::now().timestamp(),
      export_app_version: "unknown".to_string(),
      uiaf_version: "v1.1".to_string(),
    },
    list: achievements,
  })
}
