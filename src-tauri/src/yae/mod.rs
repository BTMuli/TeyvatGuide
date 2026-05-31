//! Yae 相关处理
//! @since Beta v0.10.4
#![cfg(target_os = "windows")]

pub mod cmd_parse;
pub mod inject;
pub mod pt_ac;
pub mod pt_store;

use cmd_parse::{
  handle_achievement_notify, handle_config_write, handle_prop_list, handle_prop_notify,
  handle_rva_write, handle_store_notify,
};
use inject::{call_yaemain, create_named_pipe, find_module_base, inject_dll, spawn_process};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::os::windows::io::{FromRawHandle, RawHandle};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use windows_sys::Win32::Foundation::CloseHandle;
use windows_sys::Win32::System::Pipes::ConnectNamedPipe;

// 读取配置值
fn read_rva(key: &str) -> i32 {
  let path = format!("nativeConfig.methodRva.chinese.{}", key);
  read_conf(&path)
}

// 读取配置文件
pub fn read_conf(path: &str) -> i32 {
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

/// 调用 dll
#[tauri::command]
pub fn call_yae_dll(
  app_handle: AppHandle,
  game_path: String,
  uid: String,
  ticket: Option<String>,
  is_msix: bool,
) -> Result<(), String> {
  let mut dll_path =
    app_handle.path().resource_dir().unwrap().join("resources\\YaeAchievementLib.dll");
  if is_msix {
    dll_path = app_handle.path().document_dir().unwrap().join("TeyvatGuide\\YaeAchievementLib.dll");
  }
  log::info!("Resolved DLL path: {}", dll_path.display());

  // 检测 dll 存在
  if !dll_path.exists() {
    let msg = format!("未检测到 DLL，路径: {}", dll_path.display());
    return Err(msg);
  }

  // 0. 创建 YaeAchievementPipe 的 命名管道，获取句柄
  dbg!("开始启动 YaeAchievementPipe 命名管道");
  let _pipe_handle = create_named_pipe("YaeAchievementPipe");

  // 1. 启动游戏进程
  let pi = spawn_process(&game_path, ticket);
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
      // 处理Prop
      let mut prop_map: HashMap<u32, f64> = HashMap::new();
      loop {
        match file.read_exact(&mut cmd) {
          // 输出命令字节
          Ok(_) => {
            println!("收到命令: {}", cmd[0]);
            match cmd[0] {
              0x01 => handle_achievement_notify(&mut file, &app_handle, &uid),
              0x02 => handle_store_notify(&mut file, &app_handle, &uid),
              0x03 => handle_prop_notify(&mut file, &mut prop_map),
              0xFC => handle_config_write(&mut file),
              0xFD => handle_rva_write(&mut file),
              0xFF => {
                handle_prop_list(&mut file, &app_handle, &uid, &prop_map);
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
