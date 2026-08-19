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

/// 返回写入目标渠道时应使用的规范 channel / sub_channel。
pub fn canonical_channel(scheme: SchemeId) -> (u32, u32) {
  match scheme {
    SchemeId::CnOfficial => (1, 1),
    SchemeId::CnBilibili => (14, 0),
  }
}

/// 返回同资源家族内可转换的另一国服渠道。
pub fn opposite_scheme(scheme: SchemeId) -> SchemeId {
  match scheme {
    SchemeId::CnOfficial => SchemeId::CnBilibili,
    SchemeId::CnBilibili => SchemeId::CnOfficial,
  }
}

/// 判断渠道 SDK 的存在状态是否符合官服无 SDK、哔哩哔哩服有 SDK 的规则。
pub fn sdk_is_consistent(scheme: SchemeId, has_channel_sdk: bool) -> bool {
  match scheme {
    SchemeId::CnOfficial => !has_channel_sdk,
    SchemeId::CnBilibili => has_channel_sdk,
  }
}

#[cfg(test)]
mod tests {
  use super::{canonical_channel, opposite_scheme, resolve_scheme, sdk_is_consistent};
  use crate::game::model::SchemeId;

  #[test]
  fn canonical_pairs_are_supported() {
    let (channel, sub_channel) = canonical_channel(SchemeId::CnOfficial);
    assert_eq!(resolve_scheme(channel, sub_channel), Some(SchemeId::CnOfficial));
    let (channel, sub_channel) = canonical_channel(SchemeId::CnBilibili);
    assert_eq!(resolve_scheme(channel, sub_channel), Some(SchemeId::CnBilibili));
  }

  #[test]
  fn opposite_scheme_stays_in_family() {
    assert_eq!(opposite_scheme(SchemeId::CnOfficial), SchemeId::CnBilibili);
    assert_eq!(opposite_scheme(SchemeId::CnBilibili), SchemeId::CnOfficial);
  }

  #[test]
  fn official_must_not_keep_channel_sdk() {
    assert!(sdk_is_consistent(SchemeId::CnOfficial, false));
    assert!(!sdk_is_consistent(SchemeId::CnOfficial, true));
    assert!(sdk_is_consistent(SchemeId::CnBilibili, true));
  }
}
