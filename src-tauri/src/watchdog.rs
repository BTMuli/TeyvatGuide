//! 重启提权相关处理
//! @since Beta v0.9.1
#![cfg(target_os = "windows")]

use std::ptr::null_mut;
use std::time::Duration;
use tauri::AppHandle;
use widestring::U16CString;
use windows_sys::Win32::Foundation::{HANDLE, HWND};
use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
use windows_sys::Win32::System::Threading::{INFINITE, OpenProcess, WaitForSingleObject};
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

/// 带参数启动（使用 ShellExecuteW + runas）
fn shell_runas_with_args(args: &str) -> Result<(), String> {
  let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;

  let exe_wide =
    U16CString::from_os_str(exe_path.as_os_str()).map_err(|e| format!("路径转换失败: {e}"))?;
  let args_wide = U16CString::from_str(args).map_err(|e| format!("参数转换失败: {e}"))?;
  let cwd_wide = exe_path
    .parent()
    .map(|p| U16CString::from_os_str(p.as_os_str()))
    .transpose()
    .map_err(|e| format!("路径转换失败: {e}"))?
    .unwrap_or_else(|| U16CString::from_str("").unwrap());

  let verb = U16CString::from_str("runas").unwrap();

  unsafe {
    let result = ShellExecuteW(
      0 as HWND,
      verb.as_ptr(),
      exe_wide.as_ptr(),
      args_wide.as_ptr(),
      if cwd_wide.len() > 1 { cwd_wide.as_ptr() } else { null_mut() },
      SW_SHOWNORMAL,
    );
    if (result as usize) > 32 { Ok(()) } else { Err("ShellExecuteW runas 启动失败".into()) }
  }
}

/// 等待父进程退出（释放单例锁）后，再以管理员身份启动新实例
pub fn run_watchdog(parent_pid: u32, args_to_pass: &str) -> Result<(), String> {
  let handle: HANDLE = unsafe { OpenProcess(SYNCHRONIZE, 0, parent_pid) };
  if handle.is_null() {
    std::thread::sleep(Duration::from_millis(300));
  } else {
    unsafe {
      WaitForSingleObject(handle, INFINITE);
    }
  }

  shell_runas_with_args(args_to_pass)
}

/// 以管理员权限重启应用
#[tauri::command]
pub fn run_with_admin(app_handle: AppHandle) -> Result<(), String> {
  let parent_pid = std::process::id();
  let exe = std::env::current_exe().map_err(|e| e.to_string())?;
  let mut cmd = std::process::Command::new(exe);
  cmd
    .arg("--watchdog")
    .arg(format!("--ppid={}", parent_pid))
    .spawn()
    .map_err(|e| format!("spawn watchdog failed: {e}"))?;

  app_handle.exit(0);
  Ok(())
}
