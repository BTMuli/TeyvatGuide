//! Yae 成就信息的 Protobuf 定义
//! @since Beta v0.9.0

use prost::Message;
use std::collections::HashMap;

#[derive(Clone, PartialEq, Message)]
pub struct AchievementProtoFieldInfo {
  #[prost(uint32, tag = "1")]
  pub id: u32,

  #[prost(uint32, tag = "2")]
  pub status: u32,

  #[prost(uint32, tag = "3")]
  pub total_progress: u32,

  #[prost(uint32, tag = "4")]
  pub current_progress: u32,

  #[prost(uint32, tag = "5")]
  pub finish_timestamp: u32,
}

#[derive(Clone, PartialEq, Message)]
pub struct AchievementItem {
  #[prost(uint32, tag = "1")]
  pub pre: u32,

  #[prost(uint32, tag = "2")]
  pub group: u32,

  #[prost(string, tag = "3")]
  pub name: String,

  #[prost(string, tag = "4")]
  pub description: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct MethodRvaConfig {
  #[prost(uint32, tag = "1")]
  pub do_cmd: u32,

  #[prost(uint32, tag = "3")]
  pub update_normal_prop: u32,

  #[prost(uint32, tag = "4")]
  pub new_string: u32,

  #[prost(uint32, tag = "5")]
  pub find_game_object: u32,

  #[prost(uint32, tag = "6")]
  pub event_system_update: u32,

  #[prost(uint32, tag = "7")]
  pub simulate_pointer_click: u32,

  #[prost(uint32, tag = "8")]
  pub to_int32: u32,

  #[prost(uint32, tag = "9")]
  pub tcp_state_ptr: u32,

  #[prost(uint32, tag = "10")]
  pub shared_info_ptr: u32,

  #[prost(uint32, tag = "11")]
  pub decompress: u32,
}

#[derive(Clone, PartialEq, Message)]
pub struct NativeLibConfig {
  #[prost(uint32, tag = "1")]
  pub store_cmd_id: u32,

  #[prost(uint32, tag = "2")]
  pub achievement_cmd_id: u32,

  #[prost(map = "uint32, message", tag = "10")]
  pub method_rva: HashMap<u32, MethodRvaConfig>,
}

#[derive(Clone, PartialEq, Message)]
pub struct AchievementInfo {
  #[prost(string, tag = "1")]
  pub version: String,

  #[prost(map = "uint32, string", tag = "2")]
  pub group: HashMap<u32, String>,

  #[prost(map = "uint32, message", tag = "3")]
  pub items: HashMap<u32, AchievementItem>,

  #[prost(message, tag = "4")]
  pub pb_info: Option<AchievementProtoFieldInfo>,

  #[prost(message, tag = "5")]
  pub native_config: Option<NativeLibConfig>,
}
