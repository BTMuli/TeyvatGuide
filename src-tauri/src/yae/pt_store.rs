//! Yae 背包信息的 Protobuf 定义&解析
//! @since Beta v0.11.0
#![cfg(target_os = "windows")]

use prost::DecodeError;
use prost::encoding::{WireType, decode_key, decode_varint};
use serde::ser::SerializeMap;
use serde::{Deserialize, Serialize, Serializer};
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

//// Protobuf 消息定义（用于 prost 生成/互操作）
// MaterialDeleteInfo message
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

//// 物品相关消息（Reliquary/Weapon/Furniture/VirtualItem/Item 等）
// Reliquary message
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
  #[prost(uint32, repeated, tag = "7")]
  pub unk6600_dbfgfcjnpoh: Vec<u32>,
  #[prost(uint32, repeated, tag = "8")]
  pub unk6600_nghabpmeigd: Vec<u32>,
}

// Weapon message
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

// Equip message (包含一个 oneof: Reliquary | Weapon)
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Equip {
  #[prost(oneof = "EquipDetail", tags = "1, 2")]
  pub detail: Option<EquipDetail>,
  #[prost(bool, tag = "3")]
  pub is_locked: bool,
}

// oneof for Equip
#[derive(Clone, PartialEq, ::prost::Oneof)]
pub enum EquipDetail {
  #[prost(message, tag = "1")]
  Reliquary(Reliquary),
  #[prost(message, tag = "2")]
  Weapon(Weapon),
}

// Furniture message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Furniture {
  #[prost(uint32, tag = "1")]
  pub count: u32,
}

// Unk6600Lndfmpdofel message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Unk6600Lndfmpdofel {
  #[prost(map = "uint32, uint32", tag = "1")]
  pub delete_time_num_map: HashMap<u32, u32>,
}

// BeyondMaterial message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BeyondMaterial {
  #[prost(uint32, tag = "1")]
  pub count: u32,
  #[prost(message, optional, tag = "2")]
  pub delete_info: Option<Unk6600Lndfmpdofel>,
}

// Facility message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Facility {
  #[prost(uint32, tag = "1")]
  pub count: u32,
}

// Item message (包含 oneof detail: Material | Equip | Furniture | VirtualItem)
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Item {
  #[prost(uint32, tag = "1")]
  pub item_id: u32,
  #[prost(uint64, tag = "2")]
  pub guid: u64,
  #[prost(oneof = "ItemDetail", tags = "5, 6, 7, 8, 9")]
  pub detail: Option<ItemDetail>,
}

// oneof for Item
#[derive(Clone, PartialEq, ::prost::Oneof)]
pub enum ItemDetail {
  #[prost(message, tag = "5")]
  Material(Material),
  #[prost(message, tag = "6")]
  Equip(Equip),
  #[prost(message, tag = "7")]
  Furniture(Furniture),
  #[prost(message, tag = "8")]
  BeyondMaterial(BeyondMaterial),
  #[prost(message, tag = "9")]
  Facility(Facility),
}

// PlayerStoreNotify message
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct PlayerStoreNotify {
  #[prost(uint32, tag = "1")]
  pub weight_limit: u32,
  #[prost(enumeration = "StoreType", tag = "2")]
  pub store_type: i32,
  #[prost(message, repeated, tag = "3")]
  pub item_list: Vec<Item>,
}

///// --------------- 修改后的扁平化结构与解析实现 ---------------

/// 扁平化的物品信息（原 ItemKind 改名为 ItemInfo）
/// 将 is_locked 移动到对应的变体中（Option<bool>，为 None 时序列化省略）
/// 对于武器和圣遗物，添加 guid 字段（来源于 ItemData 的 guid）
#[derive(Debug, Clone, Deserialize)]
pub enum ItemInfo {
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
    is_locked: Option<bool>,
    guid: String,
  },
  Weapon {
    level: u32,
    exp: u32,
    promote_level: u32,
    affix_map: HashMap<u32, u32>,
    is_arkhe_ousia: bool,
    is_locked: Option<bool>,
    guid: String,
  },
  Furniture {
    count: u32,
  },
  Facility {
    count: u32,
  },
  BeyondMaterial {
    count: u32,
    delete_info: Option<HashMap<u32, u32>>,
  },
  Unknown,
}

/// 自定义序列化：将 enum 变体展开为一个扁平的 map（没有变体名包裹）
/// 例如：ItemInfo::Material { count: 5 } -> { "count": 5 }
impl Serialize for ItemInfo {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    match self {
      ItemInfo::Material { count } => {
        let mut map = serializer.serialize_map(Some(1))?;
        map.serialize_entry("count", count)?;
        map.end()
      }
      ItemInfo::Reliquary {
        level,
        exp,
        promote_level,
        main_prop_id,
        append_prop_id_list,
        is_marked,
        is_locked,
        guid,
      } => {
        // 变体字段数量不固定（is_locked 可选）
        let mut len = 7usize; // level, exp, promote_level, main_prop_id, append_prop_id_list, is_marked, guid
        if is_locked.is_some() {
          len += 1;
        }
        let mut map = serializer.serialize_map(Some(len))?;
        map.serialize_entry("level", level)?;
        map.serialize_entry("exp", exp)?;
        map.serialize_entry("promote_level", promote_level)?;
        map.serialize_entry("main_prop_id", main_prop_id)?;
        map.serialize_entry("append_prop_id_list", append_prop_id_list)?;
        map.serialize_entry("is_marked", is_marked)?;
        if let Some(v) = is_locked {
          map.serialize_entry("is_locked", v)?;
        }
        map.serialize_entry("guid", guid)?;
        map.end()
      }
      ItemInfo::Weapon {
        level,
        exp,
        promote_level,
        affix_map,
        is_arkhe_ousia,
        is_locked,
        guid,
      } => {
        // affix_map 会被序列化为对象
        let mut len = 7usize; // level, exp, promote_level, affix_map, is_arkhe_ousia, guid, (maybe is_locked)
        if is_locked.is_some() {
          len += 1;
        }
        let mut map = serializer.serialize_map(Some(len))?;
        map.serialize_entry("level", level)?;
        map.serialize_entry("exp", exp)?;
        map.serialize_entry("promote_level", promote_level)?;
        map.serialize_entry("affix_map", affix_map)?;
        map.serialize_entry("is_arkhe_ousia", is_arkhe_ousia)?;
        if let Some(v) = is_locked {
          map.serialize_entry("is_locked", v)?;
        }
        map.serialize_entry("guid", guid)?;
        map.end()
      }
      ItemInfo::Furniture { count } => {
        let mut map = serializer.serialize_map(Some(1))?;
        map.serialize_entry("count", count)?;
        map.end()
      }
      ItemInfo::Facility { count } => {
        let mut map = serializer.serialize_map(Some(1))?;
        map.serialize_entry("count", count)?;
        map.end()
      }
      ItemInfo::BeyondMaterial { count, delete_info } => {
        let mut len = 1usize;
        if delete_info.is_some() {
          len += 1;
        }
        let mut map = serializer.serialize_map(Some(len))?;
        map.serialize_entry("count", count)?;
        if let Some(di) = delete_info {
          map.serialize_entry("delete_info", di)?;
        }
        map.end()
      }
      ItemInfo::Unknown => {
        // 序列化为空对象
        let map = serializer.serialize_map(Some(0))?;
        map.end()
      }
    }
  }
}

/// 扁平化物品数据结构
/// kind: "material", "weapon", "reliquary", "furniture", "facility", "beyond_material"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemData {
  pub item_id: u32,
  pub guid: String,
  pub kind: String,
  pub info: ItemInfo,
}

/// 解析顶层 bytes，返回 ItemData 列表（低级解析）
/// 说明：现在解析 guid（tag=2），kind 为字符串，info 为 ItemInfo
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
/// 现在解析 guid（tag=2），并将 guid 传入 Equip 解析以写入导出数据
fn parse_item_from_buf(buf: &[u8]) -> Result<ItemData, DecodeError> {
  let mut inner = Cursor::new(buf);

  // 默认值
  let mut item_id: u32 = 0;
  let mut guid: String = String::new();
  let mut kind_str = String::from("unknown");
  let mut info = ItemInfo::Unknown;

  while let Ok((tag, wire_type)) = decode_key(&mut inner) {
    match (tag, wire_type) {
      // item_id: uint32
      (1, WireType::Varint) => {
        item_id = decode_varint(&mut inner)? as u32;
      }
      // guid: uint64
      (2, WireType::Varint) => {
        guid = format!("{}", decode_varint(&mut inner)?);
      }
      // Material = 5
      (5, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        let mut mbuf = vec![0u8; len];
        inner.read_exact(&mut mbuf).map_err(|_| DecodeError::new("read material buf failed"))?;

        if let Ok(cnt) = parse_material_from_buf(&mbuf) {
          kind_str = "material".to_string();
          info = ItemInfo::Material { count: cnt };
        }
      }
      // Equip = 6
      (6, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        let mut eb = vec![0u8; len];
        inner.read_exact(&mut eb).map_err(|_| DecodeError::new("read equip buf failed"))?;
        if let Ok(item_info) = parse_equip_from_buf(&eb, guid.clone()) {
          match &item_info {
            ItemInfo::Reliquary { .. } => kind_str = "reliquary".to_string(),
            ItemInfo::Weapon { .. } => kind_str = "weapon".to_string(),
            _ => {}
          }
          info = item_info;
        }
      }
      // Furniture = 7
      (7, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        let mut fb = vec![0u8; len];
        inner.read_exact(&mut fb).map_err(|_| DecodeError::new("read furniture buf failed"))?;
        if let Ok(cnt) = parse_furniture_from_buf(&fb) {
          kind_str = "furniture".to_string();
          info = ItemInfo::Furniture { count: cnt };
        }
      }
      // BeyondMaterial = 8
      (8, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        let mut bb = vec![0u8; len];
        inner
          .read_exact(&mut bb)
          .map_err(|_| DecodeError::new("read beyond_material buf failed"))?;
        if let Ok((count, delete_info)) = parse_beyond_material_from_buf(&bb) {
          kind_str = "beyond_material".to_string();
          info = ItemInfo::BeyondMaterial { count, delete_info };
        }
      }
      // Facility = 9
      (9, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        let mut fb2 = vec![0u8; len];
        inner.read_exact(&mut fb2).map_err(|_| DecodeError::new("read facility buf failed"))?;
        if let Ok(cnt) = parse_facility_from_buf(&fb2) {
          kind_str = "facility".to_string();
          info = ItemInfo::Facility { count: cnt }; // 你可以改成自己的结构体
        }
      }
      // 跳过未知 length-delimited 字段
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut inner)? as usize;
        inner.seek(std::io::SeekFrom::Current(len as i64)).ok();
      }
      // 跳过未知 varint 字段
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut inner)?;
      }
      // 跳过 32/64 bit 字段
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        inner.read_exact(&mut tmp).ok();
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        inner.read_exact(&mut tmp).ok();
      }
      _ => return Err(DecodeError::new("unknown wire type in item")),
    }
  }

  Ok(ItemData { item_id, guid, kind: kind_str, info })
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
        let len = decode_varint(&mut cur)? as usize;
        let mut packed = vec![0u8; len];
        cur.read_exact(&mut packed).map_err(|_| DecodeError::new("read append_prop failed"))?;

        let mut pcur = Cursor::new(&packed);
        while let Ok(v) = decode_varint(&mut pcur) {
          r.append_prop_id_list.push(v as u32);
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

/// 解析 Facility 子消息，返回 ItemInfo
fn parse_facility_from_buf(buf: &[u8]) -> Result<u32, DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut count: u32 = 0;

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      (1, WireType::Varint) => {
        count = decode_varint(&mut cur)? as u32;
      }

      // 跳过未知字段
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur.seek(std::io::SeekFrom::Current(len as i64)).ok();
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).ok();
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).ok();
      }
      _ => {}
    }
  }

  Ok(count)
}

/// 解析 BeyondMaterial 的 Unk6600Lndfmpdofel
fn parse_unk6600_delete_info(buf: &[u8]) -> Result<HashMap<u32, u32>, DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut map_out: HashMap<u32, u32> = HashMap::new();

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      // delete_time_num_map = 1 (map entry)
      (1, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut entry_buf = vec![0u8; len];
        cur
          .read_exact(&mut entry_buf)
          .map_err(|_| DecodeError::new("read delete_time_num_map entry failed"))?;

        // 解析 map entry: key(tag=1), value(tag=2)
        let mut ecur = Cursor::new(&entry_buf);
        let mut key: Option<u32> = None;
        let mut val: Option<u32> = None;

        while let Ok((etag, ewt)) = decode_key(&mut ecur) {
          match (etag, ewt) {
            (1, WireType::Varint) => {
              key = Some(decode_varint(&mut ecur)? as u32);
            }
            (2, WireType::Varint) => {
              val = Some(decode_varint(&mut ecur)? as u32);
            }
            (_, WireType::Varint) => {
              let _ = decode_varint(&mut ecur)?;
            }
            (_, WireType::LengthDelimited) => {
              let l = decode_varint(&mut ecur)? as usize;
              ecur.seek(std::io::SeekFrom::Current(l as i64)).ok();
            }
            (_, WireType::SixtyFourBit) => {
              let mut tmp = [0u8; 8];
              ecur.read_exact(&mut tmp).ok();
            }
            (_, WireType::ThirtyTwoBit) => {
              let mut tmp = [0u8; 4];
              ecur.read_exact(&mut tmp).ok();
            }
            _ => {}
          }
        }

        if let (Some(k), Some(v)) = (key, val) {
          map_out.insert(k, v);
        }
      }

      // 跳过未知字段
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur.seek(std::io::SeekFrom::Current(len as i64)).ok();
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).ok();
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).ok();
      }
      _ => {}
    }
  }

  Ok(map_out)
}

/// 解析 BeyondMaterial 子消息，返回 ItemInfo
fn parse_beyond_material_from_buf(
  buf: &[u8],
) -> Result<(u32, Option<HashMap<u32, u32>>), DecodeError> {
  let mut cur = Cursor::new(buf);

  let mut count: u32 = 0;
  let mut delete_info: Option<HashMap<u32, u32>> = None;

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      // count = 1
      (1, WireType::Varint) => {
        count = decode_varint(&mut cur)? as u32;
      }

      // delete_info = 2 (message)
      (2, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut dbuf = vec![0u8; len];
        cur
          .read_exact(&mut dbuf)
          .map_err(|_| DecodeError::new("read beyond_material.delete_info failed"))?;

        delete_info = Some(parse_unk6600_delete_info(&dbuf)?);
      }

      // 跳过未知字段
      (_, WireType::Varint) => {
        let _ = decode_varint(&mut cur)?;
      }
      (_, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        cur.seek(std::io::SeekFrom::Current(len as i64)).ok();
      }
      (_, WireType::SixtyFourBit) => {
        let mut tmp = [0u8; 8];
        cur.read_exact(&mut tmp).ok();
      }
      (_, WireType::ThirtyTwoBit) => {
        let mut tmp = [0u8; 4];
        cur.read_exact(&mut tmp).ok();
      }
      _ => {}
    }
  }

  Ok((count, delete_info))
}

/// 解析 Equip 子消息，返回 ItemInfo（包含 is_locked: Option<bool> 和 guid）
/// 将原先返回 (ItemKind, is_locked) 的逻辑合并到 ItemInfo 中
/// 现在接收 guid 参数并把它写入 Reliquary/Weapon 变体
fn parse_equip_from_buf(buf: &[u8], guid: String) -> Result<ItemInfo, DecodeError> {
  let mut cur = Cursor::new(buf);
  let mut is_locked: Option<bool> = None;
  let mut info: ItemInfo = ItemInfo::Unknown;

  while let Ok((tag, wire_type)) = decode_key(&mut cur) {
    match (tag, wire_type) {
      // Reliquary = 1 (message)
      (1, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut rb = vec![0u8; len];
        cur.read_exact(&mut rb).map_err(|_| DecodeError::new("read reliquary buf failed"))?;
        if let Ok(r) = parse_reliquary_from_buf(&rb) {
          info = ItemInfo::Reliquary {
            level: r.level,
            exp: r.exp,
            promote_level: r.promote_level,
            main_prop_id: r.main_prop_id,
            append_prop_id_list: r.append_prop_id_list,
            is_marked: r.is_marked,
            is_locked: None,
            guid: guid.clone(),
          };
        }
      }
      // Weapon = 2 (message)
      (2, WireType::LengthDelimited) => {
        let len = decode_varint(&mut cur)? as usize;
        let mut wb = vec![0u8; len];
        cur.read_exact(&mut wb).map_err(|_| DecodeError::new("read weapon buf failed"))?;
        if let Ok(w) = parse_weapon_from_buf(&wb) {
          info = ItemInfo::Weapon {
            level: w.level,
            exp: w.exp,
            promote_level: w.promote_level,
            affix_map: w.affix_map,
            is_arkhe_ousia: w.is_arkhe_ousia,
            is_locked: None,
            guid: guid.clone(),
          };
        }
      }
      // is_locked = 3 (bool varint) -> 移入 ItemInfo 的 is_locked 字段（Option）
      (3, WireType::Varint) => {
        let locked = decode_varint(&mut cur)? != 0;
        is_locked = Some(locked);
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

  // 如果解析到 is_locked，则把值写入 info 中对应的变体
  if let Some(lock_val) = is_locked {
    info = match info {
      ItemInfo::Reliquary {
        level,
        exp,
        promote_level,
        main_prop_id,
        append_prop_id_list,
        is_marked,
        guid,
        ..
      } => ItemInfo::Reliquary {
        level,
        exp,
        promote_level,
        main_prop_id,
        append_prop_id_list,
        is_marked,
        is_locked: Some(lock_val),
        guid,
      },
      ItemInfo::Weapon { level, exp, promote_level, affix_map, is_arkhe_ousia, guid, .. } => {
        ItemInfo::Weapon {
          level,
          exp,
          promote_level,
          affix_map,
          is_arkhe_ousia,
          is_locked: Some(lock_val),
          guid,
        }
      }
      other => other,
    };
  }

  Ok(info)
}
