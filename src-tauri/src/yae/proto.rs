//! Yae 成就信息的 Protobuf 定义
//! @since Beta v0.8.7

use prost::encoding::{decode_key, WireType};
use prost::DecodeError;
use prost::Message;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Cursor, Read};

#[allow(dead_code)]
#[derive(Clone, PartialEq, Message, Serialize)]
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

#[allow(dead_code)]
#[derive(Clone, PartialEq, Message, Serialize)]
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

#[allow(dead_code)]
#[derive(Clone, PartialEq, Message, Serialize)]
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

#[allow(dead_code)]
#[derive(Clone, PartialEq, Message, Serialize)]
pub struct NativeLibConfig {
  #[prost(uint32, tag = "1")]
  pub store_cmd_id: u32,

  #[prost(uint32, tag = "2")]
  pub achievement_cmd_id: u32,

  #[prost(map = "uint32, message", tag = "10")]
  pub method_rva: HashMap<u32, MethodRvaConfig>,
}

#[allow(dead_code)]
#[derive(Clone, PartialEq, Message, Serialize)]
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

#[derive(Debug, Default, Serialize)]
pub struct UiafAchiItem {
  pub id: u32,
  pub current: u32,
  pub timestamp: u32,
  pub status: u32,
}

pub fn parse_achi_list(bytes: &[u8]) -> Result<Vec<UiafAchiItem>, DecodeError> {
  let mut cursor = Cursor::new(bytes);
  let mut dicts: Vec<HashMap<u32, u32>> = Vec::new();

  while let Ok((_, wire_type)) = decode_key(&mut cursor) {
    if wire_type == WireType::LengthDelimited {
      let len = prost::encoding::decode_varint(&mut cursor)? as usize;
      let mut buf = vec![0u8; len];
      if cursor.read_exact(&mut buf).is_err() {
        continue;
      }

      let mut inner = Cursor::new(&buf);
      let mut dict = HashMap::new();

      while let Ok((tag, wire_type)) = decode_key(&mut inner) {
        if wire_type != WireType::Varint {
          break;
        }
        let value = prost::encoding::decode_varint(&mut inner)? as u32;
        dict.insert(tag, value);
      }

      if !dict.is_empty() {
        dicts.push(dict);
      }
    }
  }

  let achievements = dicts
    .into_iter()
    .map(|d| UiafAchiItem {
      id: d.get(&15).copied().unwrap_or(0),
      status: d.get(&11).copied().unwrap_or(0),
      current: d.get(&13).copied().unwrap_or(0),
      timestamp: d.get(&7).copied().unwrap_or(0),
    })
    .filter(|a| a.timestamp != 0)
    .collect();

  Ok(achievements)
}
