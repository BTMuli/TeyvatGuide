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

/// Parse Yae protobuf data and convert to UIAF format
pub fn parse_yae_protobuf(data: &[u8]) -> Result<UiafData, Box<dyn std::error::Error>> {
  let achievement_export = yae::AchievementExport::decode(data)?;
  
  let info = achievement_export.info.ok_or("Missing export info")?;
  let uiaf_info = UiafInfo {
    export_app: info.export_app,
    export_timestamp: info.export_timestamp,
    export_app_version: info.export_app_version,
    uiaf_version: info.uiaf_version,
  };
  
  let uiaf_achievements: Vec<UiafAchievement> = achievement_export
    .list
    .iter()
    .map(|a| UiafAchievement {
      id: a.id,
      timestamp: a.timestamp,
      current: a.current,
      status: a.status,
    })
    .collect();
  
  Ok(UiafData {
    info: uiaf_info,
    list: uiaf_achievements,
  })
}
