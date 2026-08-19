//! 国服官服与哔哩哔哩服渠道方案解析规则。
//! @since Beta v0.11.5

use super::model::SchemeId;

/// HoyoPlay 中与一个受支持客户端渠道绑定的固定标识。
pub struct SchemeRegistryEntry {
  pub launcher_id: &'static str,
  pub game_id: &'static str,
}

const CN_OFFICIAL: SchemeRegistryEntry =
  SchemeRegistryEntry { launcher_id: "jGHBHlcOq1", game_id: "1Z8W5NHUQb" };
const CN_BILIBILI: SchemeRegistryEntry =
  SchemeRegistryEntry { launcher_id: "umfgRO5gh5", game_id: "T2S0Gz4Dr2" };

/// 返回受支持方案的固定 HoyoPlay 标识，远端响应不能覆盖这些值。
pub fn registry_entry(scheme: SchemeId) -> &'static SchemeRegistryEntry {
  match scheme {
    SchemeId::CnOfficial => &CN_OFFICIAL,
    SchemeId::CnBilibili => &CN_BILIBILI,
  }
}

/// 根据 `config.ini` 中的渠道字段解析受支持的国服客户端方案。
pub fn resolve_scheme(channel: u32, sub_channel: u32) -> Option<SchemeId> {
  match (channel, sub_channel) {
    (1, 0..=2) => Some(SchemeId::CnOfficial),
    (14, 0) => Some(SchemeId::CnBilibili),
    _ => None,
  }
}

/// 判断渠道 SDK 的存在状态是否符合官服无 SDK、哔哩哔哩服有 SDK 的规则。
pub fn sdk_is_consistent(scheme: SchemeId, has_channel_sdk: bool) -> bool {
  match scheme {
    SchemeId::CnOfficial => !has_channel_sdk,
    SchemeId::CnBilibili => has_channel_sdk,
  }
}
