//! Yae 相关处理
//! @since Beta v0.8.7

pub mod inject;
pub mod proto;

use inject::{call_yaemain, create_named_pipe, find_module_base, inject_dll, spawn_process};
use proto::parse_achi_list;
use serde_json::Value;
use std::fs::File;
use std::io::{self, Read, Write};
use std::os::windows::io::{FromRawHandle, RawHandle};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use windows_sys::Win32::Foundation::CloseHandle;
use windows_sys::Win32::System::Pipes::ConnectNamedPipe;

// 读取配置值
fn read_rva(key: &str) -> i32 {
  let path = format!("nativeConfig.methodRva.chinese.{}", key);
  read_conf(&path)
}

// 读取配置文件
fn read_conf(path: &str) -> i32 {
  // 编译时嵌入 JSON 文件，值都是32位整数
  let data = include_str!("../../lib/conf.json");
  let json: Value = serde_json::from_str(data).expect("Invalid JSON");

  // 按 '.' 分割 key
  let mut current = &json;
  for key in path.split('.') {
    match current.get(key) {
      Some(value) => current = value,
      None => return 0, // 如果找不到 key，返回默认值 0
    }
  }
  current.as_i64().unwrap_or(0) as i32
}

fn read_u32_le<R: Read>(r: &mut R) -> io::Result<u32> {
  let mut buf = [0u8; 4];
  match r.read_exact(&mut buf) {
    Ok(_) => Ok(u32::from_le_bytes(buf)),
    Err(e) => Err(e),
  }
}

fn read_f64_le<R: Read>(r: &mut R) -> io::Result<f64> {
  let mut buf = [0u8; 8];
  match r.read_exact(&mut buf) {
    Ok(_) => Ok(f64::from_le_bytes(buf)),
    Err(e) => Err(e),
  }
}

fn read_exact_vec<R: Read>(r: &mut R, len: usize) -> io::Result<Vec<u8>> {
  let mut v = vec![0u8; len];
  match r.read_exact(&mut v) {
    Ok(_) => Ok(v),
    Err(e) => Err(e),
  }
}

/// 调用 dll
#[tauri::command]
pub fn call_yae_dll(app_handle: AppHandle, game_path: String) -> Result<(), String> {
  #[cfg(not(target_os = "windows"))]
  {
    return Err("This function is only supported on Windows.".into());
  }

  let dll_path = app_handle.path().resource_dir().unwrap().join("resources/YaeAchievementLib.dll");
  dbg!(&dll_path);
  // 0. 创建 YaeAchievementPipe 的 命名管道，获取句柄
  dbg!("开始启动 YaeAchievementPipe 命名管道");
  let _pipe_handle = create_named_pipe("YaeAchievementPipe");

  // 1. 启动游戏进程
  let pi = spawn_process(&game_path);
  dbg!("游戏进程启动完成");

  // 2. 注入 DLL
  inject_dll(&pi, dll_path.to_str().unwrap());
  dbg!("DLL 注入完成");

  // 3. 找到 DLL 基址
  let base = find_module_base(pi.dwProcessId, "YaeAchievementLib.dll").expect("找不到 DLL 基址");
  dbg!("找到 DLL 基址: {:X}", base);

  // 4. 调用 YaeMain
  call_yaemain(&pi, base, dll_path.to_str().unwrap());
  dbg!("YaeMain 调用完成");

  // 根据句柄等待命名管道连接
  let retry_count = 50;
  for _ in 0..retry_count {
    let result = unsafe { ConnectNamedPipe(_pipe_handle, std::ptr::null_mut()) };
    if result != 0 {
      dbg!("命名管道连接成功");
      break;
    } else {
      std::thread::sleep(std::time::Duration::from_secs(1));
    }
  }
  // 5. 读取命名管道数据,循环读取，根据接受字节进行通信
  let file = unsafe { File::from_raw_handle(_pipe_handle as RawHandle) };
  let file = Arc::new(file);

  // No raw HANDLE captured in the closure. Only Arc<File>.
  std::thread::spawn({
    let file = file.clone();
    move || {
      let mut file = file.try_clone().expect("Failed to clone pipe file");
      let mut cmd = [0u8; 1];

      loop {
        match file.read_exact(&mut cmd) {
          // 输出命令字节
          Ok(_) => {
            println!("收到命令: {}", cmd[0]);
            match cmd[0] {
              0x01 => {
                match read_u32_le(&mut file) {
                  Ok(len) => {
                    // 再读数据
                    match read_exact_vec(&mut file, len as usize) {
                      Ok(data) => {
                        println!("长度: {}", len);
                        // 解码成 AchievementInfo
                        match parse_achi_list(&data) {
                          Ok(list) => {
                            println!("解码成功，成就列表长度: {}", list.len());
                            let json = serde_json::to_string_pretty(&list).unwrap();
                            let _ = app_handle.emit("yae_achi_list", json);
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
              0x02 => {
                println!("PlayerStoreNotify");
                // 读取剩余数据
                match read_u32_le(&mut file) {
                  Ok(len) => match read_exact_vec(&mut file, len as usize) {
                    Ok(_data) => println!("长度: {}", len),
                    Err(e) => println!("读取数据失败: {:?}", e),
                  },
                  Err(e) => println!("读取长度失败: {:?}", e),
                }
              }
              0x03 => {
                println!("PlayerPropNotify");
                // 读取剩余数据
                match read_u32_le(&mut file) {
                  Ok(prop_type) => match read_f64_le(&mut file) {
                    Ok(value) => println!("Prop 类型: {}, 值: {}", prop_type, value),
                    Err(e) => println!("读取值失败: {:?}", e),
                  },
                  Err(e) => println!("读取类型失败: {:?}", e),
                }
              }
              0xFC => {
                let _ = file.write_all(&read_conf("nativeConfig.achievementCmdId").to_le_bytes());
                let _ = file.write_all(&read_conf("nativeConfig.storeCmdId").to_le_bytes());
              }
              0xFD => {
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
              0xFF => {
                let _ = file.write_all(&[1]);
                break;
              }
              _ => println!("收到未知命令: {}", cmd[0]),
            }
          }
          Err(e) => {
            println!("读取失败: {:?}", e);
            break;
          }
        }
      }
    }
  });
  unsafe {
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
  }
  Ok(())
}
