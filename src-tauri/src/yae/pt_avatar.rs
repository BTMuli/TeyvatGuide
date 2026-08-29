//! Yae 角色信息的 Protobuf 定义&解析
//! @since Beta v0.12.0
#![cfg(target_os = "windows")]

use prost::Message;
use prost::encoding::{WireType, decode_key, decode_varint};
use serde::{Serialize, Serializer};
use std::collections::{HashMap, HashSet};
use std::io::{Cursor, Read};

fn serialize_u64_as_string<S>(value: &u64, serializer: S) -> Result<S::Ok, S::Error>
where
  S: Serializer,
{
  serializer.serialize_str(&value.to_string())
}

fn serialize_u64s_as_strings<S>(values: &[u64], serializer: S) -> Result<S::Ok, S::Error>
where
  S: Serializer,
{
  let strs: Vec<String> = values.iter().map(|v| v.to_string()).collect();
  strs.serialize(serializer)
}

/// PropValue 子消息
#[derive(Clone, PartialEq, Message, Serialize)]
pub struct PropValue {
  #[prost(int64, optional, tag = "2")]
  pub ival: Option<i64>,
  #[prost(float, optional, tag = "3")]
  pub fval: Option<f32>,
  #[prost(int64, tag = "4")]
  pub val: i64,
}

/// AvatarInfo 子消息，只保留常用字段，其余字段解码时自动跳过
#[derive(Clone, PartialEq, Message, Serialize)]
pub struct AvatarInfo {
  #[prost(uint32, tag = "1")]
  pub avatar_id: u32,
  #[serde(serialize_with = "serialize_u64_as_string")]
  #[prost(uint64, tag = "2")]
  pub guid: u64,
  #[prost(map = "uint32, message", tag = "3")]
  pub prop_map: HashMap<u32, PropValue>,
  #[prost(uint32, tag = "4")]
  pub life_state: u32,
  #[serde(serialize_with = "serialize_u64s_as_strings")]
  #[prost(uint64, repeated, tag = "5")]
  pub equip_guid_list: Vec<u64>,
  #[prost(uint32, repeated, tag = "6")]
  pub talent_id_list: Vec<u32>,
  #[prost(map = "uint32, float", tag = "7")]
  pub fight_prop_map: HashMap<u32, f32>,
  #[prost(uint32, tag = "11")]
  pub skill_depot_id: u32,
  #[prost(uint32, tag = "13")]
  pub core_proud_skill_level: u32,
  #[prost(uint32, repeated, tag = "14")]
  pub inherent_proud_skill_list: Vec<u32>,
  #[prost(map = "uint32, uint32", tag = "15")]
  pub skill_level_map: HashMap<u32, u32>,
  #[prost(map = "uint32, uint32", tag = "17")]
  pub proud_skill_extra_level_map: HashMap<u32, u32>,
  #[prost(uint32, tag = "19")]
  pub avatar_type: u32,
  #[prost(uint32, tag = "21")]
  pub wearing_flycloak_id: u32,
  #[prost(uint32, tag = "23")]
  pub born_time: u32,
  #[prost(uint32, tag = "25")]
  pub costume_id: u32,
}

/// 判断元素是否像 AvatarInfo：字段 1/2 均为 varint，且去重字段数 >= 4
fn looks_like_avatar_info(element: &[u8]) -> bool {
  let mut seen = HashSet::new();
  let mut has_field1 = false;
  let mut has_field2 = false;
  let mut cursor = Cursor::new(element);
  loop {
    let (field, wire_type) = match decode_key(&mut cursor) {
      Ok(value) => value,
      Err(_) => break,
    };
    seen.insert(field);
    match wire_type {
      WireType::Varint => {
        if decode_varint(&mut cursor).is_err() {
          return false;
        }
        if field == 1 {
          has_field1 = true;
        } else if field == 2 {
          has_field2 = true;
        }
      }
      WireType::SixtyFourBit => {
        let mut tmp = [0u8; 8];
        if cursor.read_exact(&mut tmp).is_err() {
          return false;
        }
      }
      WireType::LengthDelimited => {
        let len = match decode_varint(&mut cursor) {
          Ok(length) => length as usize,
          Err(_) => return false,
        };
        let mut buf = vec![0u8; len];
        if cursor.read_exact(&mut buf).is_err() {
          return false;
        }
      }
      WireType::ThirtyTwoBit => {
        let mut tmp = [0u8; 4];
        if cursor.read_exact(&mut tmp).is_err() {
          return false;
        }
      }
      _ => return false,
    }
  }
  has_field1 && has_field2 && seen.len() >= 4
}

/// 解析 AvatarDataNotify，只取 avatar_list 字段。
/// 由于每个版本 avatar_list 的字段号会变，这里对所有顶层 wire=2 字段
/// 按元素是否像 AvatarInfo 打分，取最高分字段进行解析。
pub fn parse_avatar_list(bytes: &[u8]) -> Result<Vec<AvatarInfo>, String> {
  let mut cursor = Cursor::new(bytes);
  let mut candidates: HashMap<u32, Vec<Vec<u8>>> = HashMap::new();
  loop {
    let (field, wire_type) = match decode_key(&mut cursor) {
      Ok(value) => value,
      Err(_) => break,
    };
    match wire_type {
      WireType::LengthDelimited => {
        let len = match decode_varint(&mut cursor) {
          Ok(length) => length as usize,
          Err(e) => return Err(format!("读取长度失败: {e}")),
        };
        let mut buf = vec![0u8; len];
        if cursor.read_exact(&mut buf).is_err() {
          break;
        }
        candidates.entry(field).or_default().push(buf);
      }
      WireType::Varint => {
        let _ = decode_varint(&mut cursor).map_err(|e| format!("跳过 varint 失败: {e}"))?;
      }
      WireType::SixtyFourBit => {
        let mut tmp = [0u8; 8];
        cursor.read_exact(&mut tmp).map_err(|e| format!("跳过 64 位字段失败: {e}"))?;
      }
      WireType::ThirtyTwoBit => {
        let mut tmp = [0u8; 4];
        cursor.read_exact(&mut tmp).map_err(|e| format!("跳过 32 位字段失败: {e}"))?;
      }
      _ => return Err("顶层存在未知 wire type".to_string()),
    }
  }
  let best_field = candidates
    .iter()
    .max_by_key(|(_, elements)| elements.iter().filter(|e| looks_like_avatar_info(e)).count())
    .map(|(field, _)| *field);
  let Some(field) = best_field else {
    println!("AvatarDataNotify 中未找到 AvatarInfo 字段");
    return Ok(Vec::new());
  };
  let elements = &candidates[&field];
  let mut avatars = Vec::with_capacity(elements.len());
  for element in elements {
    let avatar =
      AvatarInfo::decode(element.as_slice()).map_err(|e| format!("AvatarInfo 解析失败: {e}"))?;
    avatars.push(avatar);
  }
  Ok(avatars)
}
