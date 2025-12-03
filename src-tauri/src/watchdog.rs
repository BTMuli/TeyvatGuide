//! 重启提权相关处理
//! @since Beta v0.8.7
#![cfg(target_os = "windows")]

use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;
use std::time::Duration;
use tauri::AppHandle;
use windows_sys::Win32::Foundation::{HANDLE, HWND};
use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject, INFINITE};
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

// 带参数启动
fn shell_runas_with_args(args: &str) -> Result<(), String> {
  fn to_wide(s: &OsStr) -> Vec<u16> {
    s.encode_wide().chain(once(0)).collect()
  }

  let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
  let exe_wide = to_wide(exe_path.as_os_str());
  let args_wide = to_wide(OsStr::new(args));
  let cwd_wide =
    exe_path.parent().map(|p| to_wide(p.as_os_str())).unwrap_or_else(|| to_wide(OsStr::new("")));

  unsafe {
    let result = ShellExecuteW(
      0 as HWND,
      to_wide(OsStr::new("runas")).as_ptr(),
      exe_wide.as_ptr(),
      args_wide.as_ptr(),
      if cwd_wide.len() > 1 { cwd_wide.as_ptr() } else { null_mut() },
      SW_SHOWNORMAL,
    );
    if (result as usize) > 32 {
      Ok(())
    } else {
      Err("Failed to ShellExecuteW runas".into())
    }
  }
}

// 等待父进程退出（释放单例锁）后，再以管理员身份启动新实例
pub fn run_watchdog(parent_pid: u32, args_to_pass: &str) -> Result<(), String> {
  // 打开父进程句柄用于等待
  let handle: HANDLE = unsafe { OpenProcess(SYNCHRONIZE, 0, parent_pid) };
  if handle == std::ptr::null_mut() {
    // 如果拿不到句柄，可能父进程已退出，稍作等待后继续
    std::thread::sleep(Duration::from_millis(300));
  } else {
    unsafe {
      WaitForSingleObject(handle, INFINITE);
    }
  }

  // 父进程已退出 → 触发 UAC 提权启动新实例
  shell_runas_with_args(args_to_pass)
}

// 以管理员权限重启应用
#[tauri::command]
pub fn run_with_admin(app_handle: AppHandle) -> Result<(), String> {
  let parent_pid = std::process::id();
  let exe = std::env::current_exe().map_err(|e| e.to_string())?;
  let mut cmd = std::process::Command::new(exe);
  cmd
    .arg("--watchdog")
    .arg(format!("--ppid={}", parent_pid))
    // 看门狗不加载单例插件（通过参数决定 main 的初始化）
    .spawn()
    .map_err(|e| format!("spawn watchdog failed: {e}"))?;

  // 立即退出：单例锁释放
  app_handle.exit(0);
  Ok(())
}
