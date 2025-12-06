//! Yae 背包信息的 Protobuf 定义&解析
//! @since Beta v0.8.9
#![cfg(target_os = "windows")]

use prost::encoding::{decode_key, decode_varint, WireType};
use prost::{DecodeError, Message};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read, Seek};

/// StoreType enum
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, ::prost::Enumeration)]
#[repr(i32)]
pub enum StoreType {
  StoreTypeNone = 0,
  StoreTypePack = 1,
  StoreTypeDepot = 2,
}

/// MaterialDeleteInfo message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct MaterialDeleteInfo {
  #[prost(bool, tag = "1")]
  pub has_delete_config: bool,

  /// oneof delete_info
  #[prost(oneof = "MaterialDeleteInfoDetail", tags = "2, 3, 4")]
  pub delete_info: Option<MaterialDeleteInfoDetail>,
}

/// oneof for MaterialDeleteInfo
#[derive(Clone, PartialEq, ::prost::Oneof)]
pub enum MaterialDeleteInfoDetail {
  #[prost(message, tag = "2")]
  CountDownDelete(CountDownDelete),
  #[prost(message, tag = "3")]
  DateDelete(DateTimeDelete),
  #[prost(message, tag = "4")]
  DelayWeekCountDownDelete(DelayWeekCountDownDelete),
}

/// CountDownDelete message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct CountDownDelete {
  #[prost(map = "uint32, uint32", tag = "1")]
  pub delete_time_num_map: HashMap<u32, u32>,
  #[prost(uint32, tag = "2")]
  pub config_count_down_time: u32,
}

/// DateTimeDelete message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct DateTimeDelete {
  #[prost(uint32, tag = "1")]
  pub delete_time: u32,
}

/// DelayWeekCountDownDelete message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct DelayWeekCountDownDelete {
  #[prost(map = "uint32, uint32", tag = "1")]
  pub delete_time_num_map: HashMap<u32, u32>,
  #[prost(uint32, tag = "2")]
  pub config_delay_week: u32,
  #[prost(uint32, tag = "3")]
  pub config_count_down_time: u32,
}

/// Material message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Material {
  #[prost(uint32, tag = "1")]
  pub count: u32,
  #[prost(message, optional, tag = "2")]
  pub delete_info: Option<MaterialDeleteInfo>,
}

/// Reliquary message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Reliquary {
  #[prost(uint32, tag = "1")]
  pub level: u32,
  #[prost(uint32, tag = "2")]
  pub exp: u32,
  #[prost(uint32, tag = "3")]
  pub promote_level: u32,
  #[prost(uint32, tag = "4")]
  pub main_prop_id: u32,
  #[prost(uint32, repeated, tag = "5")]
  pub append_prop_id_list: Vec<u32>,
  #[prost(bool, tag = "6")]
  pub is_marked: bool,
}

/// Weapon message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Weapon {
  #[prost(uint32, tag = "1")]
  pub level: u32,
  #[prost(uint32, tag = "2")]
  pub exp: u32,
  #[prost(uint32, tag = "3")]
  pub promote_level: u32,
  #[prost(map = "uint32, uint32", tag = "4")]
  pub affix_map: HashMap<u32, u32>,
  #[prost(bool, tag = "5")]
  pub is_arkhe_ousia: bool,
}

/// Equip message (包含一个 oneof: Reliquary | Weapon)
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Equip {
  #[prost(oneof = "EquipDetail", tags = "1, 2")]
  pub detail: Option<EquipDetail>,
  #[prost(bool, tag = "3")]
  pub is_locked: bool,
}

/// oneof for Equip
#[derive(Clone, PartialEq, ::prost::Oneof)]
pub enum EquipDetail {
  #[prost(message, tag = "1")]
  Reliquary(Reliquary),
  #[prost(message, tag = "2")]
  Weapon(Weapon),
}

/// Furniture message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Furniture {
  #[prost(uint32, tag = "1")]
  pub count: u32,
}

/// VirtualItem message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct VirtualItem {
  #[prost(int64, tag = "1")]
  pub count: i64,
}

/// Item message (包含 oneof detail: Material | Equip | Furniture | VirtualItem)
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Item {
  #[prost(uint32, tag = "1")]
  pub item_id: u32,
  #[prost(uint64, tag = "2")]
  pub guid: u64,
  #[prost(oneof = "ItemDetail", tags = "5, 6, 7, 255")]
  pub detail: Option<ItemDetail>,
}

/// oneof for Item
#[derive(Clone, PartialEq, ::prost::Oneof)]
pub enum ItemDetail {
  #[prost(message, tag = "5")]
  Material(Material),
  #[prost(message, tag = "6")]
  Equip(Equip),
  #[prost(message, tag = "7")]
  Furniture(Furniture),
  #[prost(message, tag = "255")]
  VirtualItem(VirtualItem),
}

/// PlayerStoreNotify message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct PlayerStoreNotify {
  #[prost(uint32, tag = "1")]
  pub weight_limit: u32,
  #[prost(enumeration = "StoreType", tag = "2")]
  pub store_type: i32,
  #[prost(message, repeated, tag = "3")]
  pub item_list: Vec<Item>,
}

/// 扁平化的物品种类，便于上层使用
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ItemKind {
  Material {
    count: u32,
  },
  Reliquary {
    level: u32,
    exp: u32,
    promote_level: u32,
    main_prop_id: u32,
    append_prop_id_list: Vec<u32>,
    is_marked: bool,
  },
  Weapon {
    level: u32,
    exp: u32,
    promote_level: u32,
    affix_map: HashMap<u32, u32>,
    is_arkhe_ousia: bool,
  },
  Furniture {
    count: u32,
  },
  VirtualItem {
    count: i64,
  },
  Unknown,
}

/// 扁平化物品数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemData {
  pub item_id: u32,
  pub guid: u64,
  pub kind: ItemKind,
  pub is_locked: Option<bool>,
}

/// 解析顶层 bytes，返回 ItemData 列表（低级解析）
pub fn parse_store_list(bytes: &[u8]) -> Result<Vec<ItemData>, DecodeError> {
  let mut cursor = Cursor::new(bytes);
  let mut out: Vec<ItemData> = Vec::new();

  while let Ok((tag, wire_type)) = decode_key(&mut cursor) {
    match wire_type {
      WireType::LengthDelimited => {
        // 读取 length（varint）
        let len = decode_varint(&mut cursor)? as usize;
        let mut buf = vec![0u8; len];
        if cursor.read_exact(&mut buf).is_err() {
          // 如果读取失败，跳过这个 entry
          continue;
        }

        // 解析单个 Item 子消息
        if let Ok(item) = parse_item_from_buf(&buf) {
          out.push(item);
        }
      }
      // 其他字段：跳过（按 wire type 跳过相应长度）
      WireType::Varint => {
        // 读取 varint 并保存到变量 v（不要用 `_`）
        let v = decode_varint(&mut cursor)?;
        // 输出 tag 与值（以 u64 打印；若需要 u32 可用 v as u32）
        println!("Found field: tag = {}, val = {}", tag, v);
      }
      _ => {
        // 未知 wire type，返回错误
        return Err(DecodeError::new("unknown wire type at top level"));
      }
    }
  }

  Ok(out)
}

/// 解析单个 Item 子消息（buf 为该子消息的完整 bytes）
fn parse_item_from_buf(buf: &[u8]) -> Result<ItemData, DecodeError> {
  let mut inner = Cursor::new(buf);

  // 默认值
  let mut item_id: u32 = 0;
  let mut guid: u64 = 0;
  let mut kind = ItemKind::Unknown;
  let mut is_locked: Option<bool> = None;

  while let Ok((tag, wire_type)) = decode_key(&mut inner) {
    match (tag, wire_type) {
      (1, WireType::Varint) => {
        // item_id: uint32
        item_id = decode_varint(&mut inner)? as u32;
      }
      (2, WireType::Varint) => {
        // guid: uint64 (varint)
        guid = decode_varint(&mut inner)? as u64;
      }
      // oneof detail: Material=5, Equip=6, Furniture=7, VirtualItem=255
      (5, WireType::LengthDelimited) => {
        // Material message: 读取 length 并解析内部 varint count (tag 1)
        let len = decode_varint(&mut inner)? as usize;
        let mut mbuf = vec![0u8; len];
        inner.read_exact(&mut mbuf).map_err(|_| DecodeError::new("read material buf failed"))?;
        if let Ok(m) = parse_material_from_buf(&mbuf) {
          kind = ItemKind::Material { count: m };
        }
      }
      (6, WireType::LengthDelimited) => {
        // Equip message: 读取 length 并解析 Equip（包含 Reliquary/Weapon oneof 与 is_locked）
        let len = decode_varint(&mut inner)? as usize;
        let mut eb = vec![0u8; len];
        inner.read_exact(&mut eb).map_err(|_| DecodeError::new("read equip buf failed"))?;
        if let Ok((k, locked)) = parse_equip_from_buf(&eb) {
          kind = k;
          is_locked = Some(locked);
        }
      }
      (7, WireType::LengthDelimited) => {
        // Furniture
        let len = decode_varint(&mut inner)? as usize;
        let mut fb = vec![0u8; len];
        inner.read_exact(&mut fb).map_err(|_| DecodeError::new("read furniture buf failed"))?;
        if let Ok(cnt) = parse_furniture_from_buf(&fb) {
          kind = ItemKind::Furniture { count: cnt };
        }
      }
      (255, WireType::LengthDelimited) => {
        // VirtualItem (tag 255)
        let len = decode_varint(&mut inner)? as usize;
        let mut vb = vec![0u8; len];
        inner.read_exact(&mut vb).map_err(|_| DecodeError::new("read virtual buf failed"))?;
        if let Ok(cnt) = parse_virtual_from_buf(&vb) {
          kind = ItemKind::VirtualItem { count: cnt };
        }
      }
      // 如果 detail 出现为非 length-delimited（异常），尝试跳过
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        if inner.seek(std::io::SeekFrom::Current(len as i64)).is_err() {
          break;
        }
      }
      (_, WireType::Varint) => {
        // 未知 varint 字段，跳过
        let _ = decode_varint(&mut inner)?;
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        if inner.read_exact(&mut tmp).is_err() {
          break;
        }
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        if inner.read_exact(&mut tmp).is_err() {
          break;
        }
      }
      _ => return Err(DecodeError::new("unknown wire type in item")),
    }
  }

  Ok(ItemData { item_id, guid, kind, is_locked })
}

/// 解析 Material 子消息，返回 count（uint32）
fn parse_material_from_buf(buf: &[u8]) -> Result<u32, DecodeError> {
  let mut cur = Cursor::new(buf);
  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    if tag == 1 && wire_type == WireType::Varint {
      return Ok(decode_varint(&mut cur)? as u32);
    } else {
      // 跳过其他字段
      match wire_type {
        WireType::Varint => {
          let _ = decode_varint(&mut cur)?;
        }
        WireType::SixtyFourBit => {
          let mut tmp = [0u8; 8];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::LengthDelimited => {
          let len = decode_varint(&mut cur)? as usize;
          cur
            .seek(std::io::SeekFrom::Current(len as i64))
            .map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::ThirtyTwoBit => {
          let mut tmp = [0u8; 4];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        _ => return Err(DecodeError::new("unknown wire type in material")),
      }
    }
  }
  Err(DecodeError::new("material count not found"))
}

/// 解析 Furniture 子消息，返回 count（uint32）
fn parse_furniture_from_buf(buf: &[u8]) -> Result<u32, DecodeError> {
  let mut cur = Cursor::new(buf);
  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    if tag == 1 && wire_type == WireType::Varint {
      return Ok(decode_varint(&mut cur)? as u32);
    } else {
      // 跳过
      match wire_type {
        WireType::Varint => {
          let _ = decode_varint(&mut cur)?;
        }
        WireType::SixtyFourBit => {
          let mut tmp = [0u8; 8];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::LengthDelimited => {
          let len = decode_varint(&mut cur)? as usize;
          cur
            .seek(std::io::SeekFrom::Current(len as i64))
            .map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::ThirtyTwoBit => {
          let mut tmp = [0u8; 4];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        _ => return Err(DecodeError::new("unknown wire type in furniture")),
      }
    }
  }
  Err(DecodeError::new("furniture count not found"))
}

/// 解析 VirtualItem 子消息，返回 count（int64）
fn parse_virtual_from_buf(buf: &[u8]) -> Result<i64, DecodeError> {
  let mut cur = Cursor::new(buf);
  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    if tag == 1 && wire_type == WireType::Varint {
      return Ok(decode_varint(&mut cur)? as i64);
    } else {
      // 跳过
      match wire_type {
        WireType::Varint => {
          let _ = decode_varint(&mut cur)?;
        }
        WireType::SixtyFourBit => {
          let mut tmp = [0u8; 8];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::LengthDelimited => {
          let len = decode_varint(&mut cur)? as usize;
          cur
            .seek(std::io::SeekFrom::Current(len as i64))
            .map_err(|_| DecodeError::new("skip failed"))?;
        }
        WireType::ThirtyTwoBit => {
          let mut tmp = [0u8; 4];
          cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
        }
        _ => return Err(DecodeError::new("unknown wire type in virtual")),
      }
    }
  }
  Err(DecodeError::new("virtual count not found"))
}

/// 解析 Equip 子消息，返回 (ItemKind, is_locked)
fn parse_equip_from_buf(buf: &[u8]) -> Result<(ItemKind, bool), DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut kind = ItemKind::Unknown;
  let mut is_locked = false;

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      // Reliquary = 1 (message)
      (1, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut rb = vec![0u8; len];
        cur.read_exact(&mut rb).map_err(|_| DecodeError::new("read reliquary buf failed"))?;
        if let Ok(r) = parse_reliquary_from_buf(&rb) {
          kind = ItemKind::Reliquary {
            level: r.level,
            exp: r.exp,
            promote_level: r.promote_level,
            main_prop_id: r.main_prop_id,
            append_prop_id_list: r.append_prop_id_list,
            is_marked: r.is_marked,
          };
        }
      }
      // Weapon = 2 (message)
      (2, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut wb = vec![0u8; len];
        cur.read_exact(&mut wb).map_err(|_| DecodeError::new("read weapon buf failed"))?;
        if let Ok(w) = parse_weapon_from_buf(&wb) {
          kind = ItemKind::Weapon {
            level: w.level,
            exp: w.exp,
            promote_level: w.promote_level,
            affix_map: w.affix_map,
            is_arkhe_ousia: w.is_arkhe_ousia,
          };
        }
      }
      // is_locked = 3 (bool varint)
      (3, WireType::Varint) => {
        is_locked = decode_varint(&mut cur)? != 0;
      }
      // 跳过未知字段
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur
          .seek(std::io::SeekFrom::Current(len as i64))
          .map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      _ => return Err(DecodeError::new("unknown wire type in equip")),
    }
  }

  Ok((kind, is_locked))
}

/// 简单的 Reliquary 结构用于解析
struct ReliquaryTmp {
  level: u32,
  exp: u32,
  promote_level: u32,
  main_prop_id: u32,
  append_prop_id_list: Vec<u32>,
  is_marked: bool,
}

/// 解析 Reliquary 子消息
fn parse_reliquary_from_buf(buf: &[u8]) -> Result<ReliquaryTmp, DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut r = ReliquaryTmp {
    level: 0,
    exp: 0,
    promote_level: 0,
    main_prop_id: 0,
    append_prop_id_list: Vec::new(),
    is_marked: false,
  };

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      (1, WireType::Varint) => r.level = decode_varint(&mut cur)? as u32,
      (2, WireType::Varint) => r.exp = decode_varint(&mut cur)? as u32,
      (3, WireType::Varint) => r.promote_level = decode_varint(&mut cur)? as u32,
      (4, WireType::Varint) => r.main_prop_id = decode_varint(&mut cur)? as u32,
      (5, WireType::LengthDelimited) => {
        // repeated uint32 append_prop_id_list encoded as packed varints (length-delimited)
        let len = decode_varint(&mut cur)? as usize;
        let mut packed = vec![0u8; len];
        cur.read_exact(&mut packed).map_err(|_| DecodeError::new("read append_prop failed"))?;
        let mut pcur = Cursor::new(&packed);
        while let Ok((tag2, wt2)) = decode_key(&mut pcur) {
          // packed repeated of primitive types usually has no inner tags; but some encoders write raw varints
          // 为兼容性，直接尝试读取 varints直到耗尽
          if wt2 == WireType::Varint {
            let v = decode_varint(&mut pcur)? as u32;
            r.append_prop_id_list.push(v);
          } else {
            break;
          }
        }
        // 如果 packed 里没有 tags（常见），直接按 varint 读取直到 EOF
        if r.append_prop_id_list.is_empty() {
          let mut pcur2 = Cursor::new(&packed);
          while let Ok(v) = decode_varint(&mut pcur2) {
            r.append_prop_id_list.push(v as u32);
          }
        }
      }
      (6, WireType::Varint) => r.is_marked = decode_varint(&mut cur)? != 0,
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur
          .seek(std::io::SeekFrom::Current(len as i64))
          .map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      _ => return Err(DecodeError::new("unknown wire type in reliquary")),
    }
  }

  Ok(r)
}

/// 简单的 Weapon 结构用于解析
struct WeaponTmp {
  level: u32,
  exp: u32,
  promote_level: u32,
  affix_map: HashMap<u32, u32>,
  is_arkhe_ousia: bool,
}

/// 解析 Weapon 子消息（只解析常用字段）
fn parse_weapon_from_buf(buf: &[u8]) -> Result<WeaponTmp, DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut w = WeaponTmp {
    level: 0,
    exp: 0,
    promote_level: 0,
    affix_map: HashMap::new(),
    is_arkhe_ousia: false,
  };

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      (1, WireType::Varint) => w.level = decode_varint(&mut cur)? as u32,
      (2, WireType::Varint) => w.exp = decode_varint(&mut cur)? as u32,
      (3, WireType::Varint) => w.promote_level = decode_varint(&mut cur)? as u32,
      (4, WireType::LengthDelimited) => {
        // affix_map: map<uint32,uint32> 底层是 repeated entry message（length-delimited）
        let len = decode_varint(&mut cur)? as usize;
        let mut mb = vec![0u8; len];
        cur.read_exact(&mut mb).map_err(|_| DecodeError::new("read affix_map entry failed"))?;
        // 解析 entry: key(tag=1,varint), value(tag=2,varint)
        let mut ecur = Cursor::new(&mb);
        let mut key: Option<u32> = None;
        let mut val: Option<u32> = None;
        while let Ok((et, ewt)) = decode_key(&mut ecur) {
          match (et, ewt) {
            (1, WireType::Varint) => key = Some(decode_varint(&mut ecur)? as u32),
            (2, WireType::Varint) => val = Some(decode_varint(&mut ecur)? as u32),
            (_, WireType::Varint) => {
              let _ = decode_varint(&mut ecur)?;
            }
            (_, WireType::LengthDelimited) => {
              let l = decode_varint(&mut ecur)? as usize;
              ecur
                .seek(std::io::SeekFrom::Current(l as i64))
                .map_err(|_| DecodeError::new("skip failed"))?;
            }
            _ => {
              let _ = decode_varint(&mut ecur)?;
            }
          }
        }
        if let (Some(k), Some(v)) = (key, val) {
          w.affix_map.insert(k, v);
        }
      }
      (5, WireType::Varint) => w.is_arkhe_ousia = decode_varint(&mut cur)? != 0,
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur
          .seek(std::io::SeekFrom::Current(len as i64))
          .map_err(|_| DecodeError::new("skip failed"))?;
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).map_err(|_| DecodeError::new("skip failed"))?;
      }
      _ => return Err(DecodeError::new("unknown wire type in weapon")),
    }
  }

  Ok(w)
}
