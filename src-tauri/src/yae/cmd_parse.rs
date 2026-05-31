//! Yae 命令解析处理
//! @since Beta v0.10.4

use crate::yae::pt_ac::parse_achi_list;
use crate::yae::pt_store::parse_store_list;
use crate::yae::read_conf;
use crate::yae::read_rva;
use serde_json;
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use tauri::{AppHandle, Emitter};

fn read_u32_le<R: Read>(r: &mut R) -> std::io::Result<u32> {
  let mut buf = [0u8; 4];
  match r.read_exact(&mut buf) {
    Ok(_) => Ok(u32::from_le_bytes(buf)),
    Err(e) => Err(e),
  }
}

fn read_f64_le<R: Read>(r: &mut R) -> std::io::Result<f64> {
  let mut buf = [0u8; 8];
  match r.read_exact(&mut buf) {
    Ok(_) => Ok(f64::from_le_bytes(buf)),
    Err(e) => Err(e),
  }
}

fn read_exact_vec<R: Read>(r: &mut R, len: usize) -> std::io::Result<Vec<u8>> {
  let mut v = vec![0u8; len];
  match r.read_exact(&mut v) {
    Ok(_) => Ok(v),
    Err(e) => Err(e),
  }
}

pub fn handle_achievement_notify(file: &mut File, app_handle: &AppHandle, uid: &str) {
  println!("AchievementNotify");
  match read_u32_le(file) {
    Ok(len) => {
      // 再读数据
      match read_exact_vec(file, len as usize) {
        Ok(data) => {
          println!("长度: {}", len);
          // 解码成 AchievementInfo
          match parse_achi_list(&data) {
            Ok(list) => {
              println!("解码成功，成就列表长度: {}", list.len());
              let json = serde_json::to_string_pretty(&list).unwrap();
              let payload = serde_json::json!({"type":"achievement","data":json,"uid":&uid});
              let _ = app_handle.emit("yae_read", payload);
            }
            Err(e) => println!("解析失败: {:?}", e),
          }
        }
        Err(e) => println!("读取数据失败: {:?}", e),
      }
    }
    Err(e) => println!("读取长度失败: {:?}", e),
  }
}

pub fn handle_store_notify(file: &mut File, app_handle: &AppHandle, uid: &str) {
  println!("PlayerStoreNotify");
  // 读取剩余数据
  match read_u32_le(file) {
    Ok(len) => match read_exact_vec(file, len as usize) {
      Ok(_data) => {
        println!("长度: {}", len);
        match parse_store_list(&_data) {
          Ok(list) => {
            println!("解码成功，物品列表长度: {}", list.len());
            let json = serde_json::to_string_pretty(&list).unwrap();
            let payload = serde_json::json!({"type":"store","data":json,"uid":&uid});
            let _ = app_handle.emit("yae_read", payload);
          }
          Err(e) => println!("解析失败: {:?}", e),
        }
      }
      Err(e) => println!("读取数据失败: {:?}", e),
    },
    Err(e) => println!("读取长度失败: {:?}", e),
  }
}

pub fn handle_prop_notify(file: &mut File, prop_map: &mut HashMap<u32, f64>) {
  println!("PlayerPropNotify");
  // 读取剩余数据
  match read_u32_le(file) {
    Ok(prop_type) => match read_f64_le(file) {
      Ok(value) => {
        prop_map.insert(prop_type, value);
      }
      Err(e) => println!("读取值失败: {:?}", e),
    },
    Err(e) => println!("读取类型失败: {:?}", e),
  }
}

pub fn handle_config_write(file: &mut File) {
  let _ = file.write_all(&read_conf("nativeConfig.achievementCmdId").to_le_bytes());
  let _ = file.write_all(&read_conf("nativeConfig.storeCmdId").to_le_bytes());
}

pub fn handle_rva_write(file: &mut File) {
  for key in [
    "doCmd",
    "updateNormalProp",
    "newString",
    "findGameObject",
    "eventSystemUpdate",
    "simulatePointerClick",
    "toInt32",
    "tcpStatePtr",
    "sharedInfoPtr",
    "decompress",
  ] {
    let _ = file.write_all(&read_rva(key).to_le_bytes());
  }
}

pub fn handle_prop_list(
  file: &mut File,
  app_handle: &AppHandle,
  uid: &str,
  prop_map: &HashMap<u32, f64>,
) {
  println!("处理 Prop 列表，长度: {}", prop_map.len());
  let mut new_data: HashMap<u32, f64> = HashMap::new();
  // 201 = 10015 - 10022 原石
  let v1 = prop_map.get(&10015).copied().unwrap_or(0.0);
  let v2 = prop_map.get(&10022).copied().unwrap_or(0.0);
  new_data.insert(201, v1 - v2);
  // 202 = 10016 - 10023 摩拉
  let v3 = prop_map.get(&10016).copied().unwrap_or(0.0);
  let v4 = prop_map.get(&10023).copied().unwrap_or(0.0);
  new_data.insert(202, v3 - v4);
  // 203 = 10025 - 10026 创世结晶
  let v5 = prop_map.get(&10025).copied().unwrap_or(0.0);
  let v6 = prop_map.get(&10026).copied().unwrap_or(0.0);
  new_data.insert(203, v5 - v6);
  // 204 = 10042 - 10043 洞天宝钱
  let v7 = prop_map.get(&10042).copied().unwrap_or(0.0);
  let v8 = prop_map.get(&10043).copied().unwrap_or(0.0);
  new_data.insert(204, v7 - v8);
  // 206 = 10053
  // let v9 = prop_map.get(&10053).copied().unwrap_or(0.0);
  // new_data.insert(206, v9);
  // 207 = 10058
  // let va = prop_map.get(&10058).copied().unwrap_or(0.0);
  // new_data.insert(207, va);
  // 转成 JSON 输出
  let json = serde_json::to_string_pretty(&new_data).unwrap();
  let payload = serde_json::json!({ "type": "prop", "data": json, "uid": uid });
  let _ = app_handle.emit("yae_read", payload);
  let _ = file.write_all(&[1]);
}
