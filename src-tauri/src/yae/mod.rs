//! Yae 相关处理
//! @since Beta v0.13.0
#![cfg(target_os = "windows")]

pub mod cmd_parse;
pub mod inject;
pub mod pt_ac;
pub mod pt_avatar;
pub mod pt_store;

use cmd_parse::{
  handle_packet_notify, handle_packet_tasks_write, handle_prop_list, handle_prop_notify,
  handle_prop_tasks_write, handle_rva_write,
};
use inject::{
  call_yaemain, close_process_handles, create_named_pipe, find_module_base, inject_dll,
  spawn_process,
};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::os::windows::io::{AsRawHandle, FromRawHandle, IntoRawHandle, OwnedHandle, RawHandle};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use windows_sys::Win32::System::Pipes::ConnectNamedPipe;

/// 读取 `nativeConfig.methodRva.chinese` 下指定键的 RVA 配置值。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `key`: 配置键。
///
/// # 返回
/// 配置值，缺失时返回 0。
fn read_rva(key: &str) -> i32 {
  let path = format!("nativeConfig.methodRva.chinese.{}", key);
  read_conf(&path)
}

/// 按点分路径从编译时嵌入的配置中读取整数值。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 点分隔的配置路径。
///
/// # 返回
/// 配置值，缺失时返回 0。
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

/// 启动游戏并注入 Yae DLL，通过现有命名管道处理 DLL 通知。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `app_handle`: Tauri 应用句柄，用于解析 DLL 路径。
/// - `game_path`: 游戏可执行文件路径。
/// - `uid`: 当前用户标识，用于处理 DLL 通知。
/// - `ticket`: 可选的登录票据。
/// - `is_msix`: 是否使用 MSIX 文档目录中的 DLL。
///
/// # 返回
/// 成功启动注入流程时返回 `Ok(())`，路径、进程、注入或管道资源失败时返回可读错误。
#[tauri::command]
pub fn call_yae_dll(
  app_handle: AppHandle,
  game_path: String,
  uid: String,
  ticket: Option<String>,
  is_msix: bool,
) -> Result<(), String> {
  let mut dll_path = app_handle
    .path()
    .resource_dir()
    .map_err(|error| format!("无法获取应用资源目录：{error}"))?
    .join("resources\\YaeAchievementLib.dll");
  if is_msix {
    dll_path = app_handle
      .path()
      .document_dir()
      .map_err(|error| format!("无法获取应用文档目录：{error}"))?
      .join("TeyvatGuide\\YaeAchievementLib.dll");
  }
  log::info!("Resolved DLL path: {}", dll_path.display());

  // 检测 dll 存在
  if !dll_path.exists() {
    let msg = format!("未检测到 DLL，路径: {}", dll_path.display());
    return Err(msg);
  }
  let dll_path_str = dll_path
    .to_str()
    .ok_or_else(|| format!("DLL 路径无法转换为 Windows 字符串：{}", dll_path.display()))?;

  // 0. 创建 YaeAchievementPipe 的 命名管道，获取句柄
  dbg!("开始启动 YaeAchievementPipe 命名管道");
  let raw_pipe_handle = create_named_pipe("YaeAchievementPipe")?;
  let pipe_handle = unsafe { OwnedHandle::from_raw_handle(raw_pipe_handle as RawHandle) };

  // 1. 启动游戏进程
  let pi = spawn_process(&game_path, ticket)?;
  dbg!("游戏进程启动完成");

  // 2. 注入 DLL
  if let Err(error) = inject_dll(&pi, dll_path_str) {
    close_process_handles(&pi);
    return Err(error);
  }
  dbg!("DLL 注入完成");

  // 3. 找到 DLL 基址
  let base = match find_module_base(pi.dwProcessId, "YaeAchievementLib.dll") {
    Some(base) => base,
    None => {
      close_process_handles(&pi);
      return Err("找不到已注入 DLL 的基址，请确认游戏进程仍在运行".to_string());
    }
  };
  dbg!("找到 DLL 基址: {:X}", base);

  // 4. 调用 YaeMain
  if let Err(error) = call_yaemain(&pi, base, dll_path_str) {
    close_process_handles(&pi);
    return Err(error);
  }
  dbg!("YaeMain 调用完成");

  // 根据句柄等待命名管道连接
  let retry_count = 50;
  for _ in 0..retry_count {
    let result =
      unsafe { ConnectNamedPipe(pipe_handle.as_raw_handle() as _, std::ptr::null_mut()) };
    if result != 0 {
      dbg!("命名管道连接成功");
      break;
    } else {
      std::thread::sleep(std::time::Duration::from_secs(1));
    }
  }
  // 5. 读取命名管道数据,循环读取，根据接受字节进行通信
  let file = unsafe { File::from_raw_handle(pipe_handle.into_raw_handle()) };
  let file = Arc::new(file);

  // No raw HANDLE captured in the closure. Only Arc<File>.
  let reader_result = std::thread::Builder::new().name("yae-pipe-reader".to_string()).spawn({
    let file = file.clone();
    move || {
      let mut file = match file.try_clone() {
        Ok(file) => file,
        Err(error) => {
          log::error!("克隆 YAE 命名管道失败：{error}");
          return;
        }
      };
      let mut cmd = [0u8; 1];
      // 处理Prop
      let mut prop_map: HashMap<u32, f64> = HashMap::new();
      loop {
        match file.read_exact(&mut cmd) {
          // 输出命令字节
          Ok(_) => {
            println!("收到命令: {}", cmd[0]);
            match cmd[0] {
              0x03 => handle_prop_notify(&mut file, &mut prop_map),
              0x04 => handle_packet_notify(&mut file, &app_handle, &uid),
              0xFA => {
                if let Err(e) = handle_packet_tasks_write(&mut file) {
                  println!("写入网络包任务失败: {:?}", e);
                  break;
                }
              }
              0xFB => {
                if let Err(e) = handle_prop_tasks_write(&mut file) {
                  println!("写入玩家属性任务失败: {:?}", e);
                  break;
                }
              }
              0xFD => handle_rva_write(&mut file),
              0xFE => {
                dbg!("DLL 已请求恢复游戏主线程");
              }
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
  if let Err(error) = reader_result {
    close_process_handles(&pi);
    return Err(format!("启动 YAE 命名管道读取线程失败：{error}"));
  }
  close_process_handles(&pi);
  Ok(())
}
