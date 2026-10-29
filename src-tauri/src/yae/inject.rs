//! DLL 注入相关功能
//! @since Beta v0.13.0
#![cfg(target_os = "windows")]

use std::ptr;
use std::thread::sleep;
use std::time::Duration;
use widestring::U16CString;
use windows_sys::Win32::Foundation::{
  CloseHandle, ERROR_BAD_LENGTH, ERROR_SUCCESS, FreeLibrary, GetLastError, HANDLE,
  INVALID_HANDLE_VALUE, SetLastError, WAIT_FAILED,
};
use windows_sys::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows_sys::Win32::System::Diagnostics::Debug::WriteProcessMemory;
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
  CreateToolhelp32Snapshot, MODULEENTRY32W, Module32FirstW, Module32NextW, TH32CS_SNAPMODULE,
  TH32CS_SNAPMODULE32,
};
use windows_sys::Win32::System::LibraryLoader::{
  DONT_RESOLVE_DLL_REFERENCES, GetModuleHandleA, GetProcAddress, LoadLibraryExW,
};
use windows_sys::Win32::System::Memory::{
  MEM_COMMIT, MEM_RELEASE, PAGE_READWRITE, VirtualAllocEx, VirtualFreeEx,
};
use windows_sys::Win32::System::Pipes::{
  CreateNamedPipeW, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};
use windows_sys::Win32::System::Threading::{
  CreateProcessW, CreateRemoteThread, INFINITE, PROCESS_INFORMATION, STARTUPINFOW,
  WaitForSingleObject,
};

/// 将当前线程的 Windows 错误转换为包含错误码和描述的可读消息。
///
/// @since Beta v0.13.0
fn format_windows_error(operation: &str) -> String {
  let error_code = unsafe { GetLastError() };
  let error = std::io::Error::from_raw_os_error(error_code as i32);
  format!("{operation} 失败（Windows 错误码 {error_code}）：{error}")
}

/// 释放由启动目标进程产生的进程和主线程句柄。
///
/// @since Beta v0.13.0
pub(super) fn close_process_handles(pi: &PROCESS_INFORMATION) {
  unsafe {
    if !pi.hProcess.is_null() {
      CloseHandle(pi.hProcess);
    }
    if !pi.hThread.is_null() {
      CloseHandle(pi.hThread);
    }
  }
}

/// 创建命名管道，失败时返回 Windows 错误码和描述。
///
/// @since Beta v0.13.0
pub fn create_named_pipe(pipe_name: &str) -> Result<HANDLE, String> {
  let full_pipe_name = format!(r"\\.\pipe\{}", pipe_name);
  let wide = U16CString::from_str(&full_pipe_name)
    .map_err(|error| format!("命名管道名称无效（包含 NUL 字符）：{error}"))?;

  unsafe {
    let handle = CreateNamedPipeW(
      wide.as_ptr(),
      PIPE_ACCESS_DUPLEX,
      PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
      PIPE_UNLIMITED_INSTANCES,
      512,
      512,
      0,
      ptr::null_mut(),
    );
    if handle == INVALID_HANDLE_VALUE {
      let message = format_windows_error(&format!("CreateNamedPipeW 创建 {full_pipe_name}"));
      log::error!("{message}");
      return Err(message);
    }
    Ok(handle)
  }
}

/// 启动目标进程，附加 cwd 或 ticket。
///
/// @since Beta v0.13.0
pub fn spawn_process(path: &str, ticket: Option<String>) -> Result<PROCESS_INFORMATION, String> {
  let wide_path = U16CString::from_str(path)
    .map_err(|error| format!("游戏路径无效（包含 NUL 字符）：{error}"))?;

  let wide_cmd = ticket
    .as_ref()
    .map(|t| {
      let cmdline = format!("{} login_auth_ticket={}", path, t);
      U16CString::from_str(&cmdline)
        .map_err(|error| format!("游戏启动参数无效（包含 NUL 字符）：{error}"))
    })
    .transpose()?;

  let wide_cwd: Option<U16CString> = if ticket.is_none() {
    std::path::Path::new(path)
      .parent()
      .map(|parent| {
        U16CString::from_os_str(parent.as_os_str())
          .map_err(|error| format!("游戏工作目录无效（包含 NUL 字符）：{error}"))
      })
      .transpose()?
  } else {
    None
  };

  unsafe {
    let mut si: STARTUPINFOW = std::mem::zeroed();
    si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
    let mut pi: PROCESS_INFORMATION = std::mem::zeroed();

    let success = CreateProcessW(
      wide_path.as_ptr(),
      wide_cmd.as_ref().map(|s| s.as_ptr() as *mut u16).unwrap_or(ptr::null_mut()),
      ptr::null_mut(),
      ptr::null_mut(),
      0,
      0,
      ptr::null_mut(),
      wide_cwd.as_ref().map(|s: &widestring::U16CString| s.as_ptr()).unwrap_or(ptr::null()),
      &mut si,
      &mut pi,
    );

    if success == 0 {
      return Err(format_windows_error("CreateProcessW 启动游戏进程"));
    }

    Ok(pi)
  }
}

/// 将 DLL 路径写入目标进程并启动远程加载线程。
///
/// @since Beta v0.13.0
pub fn inject_dll(pi: &PROCESS_INFORMATION, dll_path: &str) -> Result<(), String> {
  let dll_utf16 = U16CString::from_str(dll_path)
    .map_err(|error| format!("DLL 路径无效（包含 NUL 字符）：{error}"))?;
  let size = dll_utf16.as_slice_with_nul().len() * std::mem::size_of::<u16>();

  unsafe {
    let addr = VirtualAllocEx(pi.hProcess, ptr::null_mut(), size, MEM_COMMIT, PAGE_READWRITE);
    if addr.is_null() {
      return Err(format_windows_error("VirtualAllocEx 为 DLL 路径分配远程内存"));
    }

    let success =
      WriteProcessMemory(pi.hProcess, addr, dll_utf16.as_ptr() as *const _, size, ptr::null_mut());
    if success == 0 {
      let error = format_windows_error("WriteProcessMemory 写入 DLL 路径");
      release_remote_memory(pi.hProcess, addr);
      return Err(error);
    }

    let k32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
    if k32.is_null() {
      let error = format_windows_error("GetModuleHandleA 获取 kernel32.dll");
      release_remote_memory(pi.hProcess, addr);
      return Err(error);
    }

    let loadlib = GetProcAddress(k32, b"LoadLibraryW\0".as_ptr());
    if loadlib.is_none() {
      let error = format_windows_error("GetProcAddress 获取 LoadLibraryW");
      release_remote_memory(pi.hProcess, addr);
      return Err(error);
    }

    let thread = CreateRemoteThread(
      pi.hProcess,
      ptr::null_mut(),
      0,
      Some(std::mem::transmute(loadlib)),
      addr,
      0,
      ptr::null_mut(),
    );
    if thread.is_null() {
      let error = format_windows_error("CreateRemoteThread 加载 DLL");
      release_remote_memory(pi.hProcess, addr);
      return Err(error);
    }

    let wait_result = WaitForSingleObject(thread, INFINITE);
    let wait_error = if wait_result == WAIT_FAILED {
      Some(format_windows_error("WaitForSingleObject 等待 DLL 加载线程"))
    } else {
      None
    };
    CloseHandle(thread);
    if let Some(error) = wait_error {
      log::warn!("{error}；为避免线程仍在使用路径，保留 DLL 路径远程内存");
      return Err(error);
    }
    release_remote_memory(pi.hProcess, addr);

    Ok(())
  }
}

/// 释放 DLL 注入过程中分配的远程内存，并记录清理失败。
///
/// @since Beta v0.13.0
fn release_remote_memory(process: HANDLE, address: *mut std::ffi::c_void) {
  unsafe {
    if VirtualFreeEx(process, address, 0, MEM_RELEASE) == 0 {
      log::warn!("{}", format_windows_error("VirtualFreeEx 释放 DLL 路径远程内存"));
    }
  }
}

struct Snapshot(HANDLE);
impl Drop for Snapshot {
  /// 释放模块快照句柄。
  ///
  /// @since Beta v0.9.2
  fn drop(&mut self) {
    unsafe {
      if self.0 != INVALID_HANDLE_VALUE {
        CloseHandle(self.0);
      }
    }
  }
}

/// 为目标进程创建模块快照，`ERROR_BAD_LENGTH` 时自动重试。
///
/// @since Beta v0.9.2
///
/// # 参数
/// - `pid`: 目标进程 ID。
///
/// # 返回
/// 成功时返回快照，失败或无法创建时返回 `None`。
fn create_snapshot(pid: u32) -> Option<Snapshot> {
  loop {
    unsafe {
      SetLastError(ERROR_SUCCESS);
      // 加上 SNAPMODULE32 提高兼容性
      let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid);
      let error = GetLastError();

      if error == ERROR_SUCCESS && snapshot != INVALID_HANDLE_VALUE {
        return Some(Snapshot(snapshot));
      }

      // 如果不是 BAD_LENGTH，直接返回错误
      if error != ERROR_BAD_LENGTH {
        eprintln!("CreateToolhelp32Snapshot failed: GetLastError = {}", error);
        return None;
      }
      // 如果是 ERROR_BAD_LENGTH，继续重试
    }
  }
}

/// 在目标进程的已加载模块中查找指定 DLL 的基址。
///
/// @since Beta v0.9.2
///
/// # 参数
/// - `pid`: 目标进程 ID。
/// - `dll_name`: 目标 DLL 文件名。
///
/// # 返回
/// 找到时返回模块基址，未找到返回 `None`。
pub fn find_module_base(pid: u32, dll_name: &str) -> Option<usize> {
  unsafe {
    let snapshot = match create_snapshot(pid) {
      Some(s) => s,
      None => return None,
    };

    let mut me32 =
      MODULEENTRY32W { dwSize: std::mem::size_of::<MODULEENTRY32W>() as u32, ..Default::default() };

    // 尝试多次枚举以应对时序问题
    for _attempt in 0..5 {
      if Module32FirstW(snapshot.0, &mut me32) != 0 {
        loop {
          let len = me32.szModule.iter().position(|&c| c == 0).unwrap_or(me32.szModule.len());
          let name = String::from_utf16_lossy(&me32.szModule[..len]);

          // 精确文件名比较或后缀比较（大小写不敏感）
          if name.eq_ignore_ascii_case(dll_name)
            || name.to_lowercase().ends_with(&dll_name.to_lowercase())
          {
            return Some(me32.modBaseAddr as usize);
          }

          if Module32NextW(snapshot.0, &mut me32) == 0 {
            break;
          }
        }
      } else {
        let err = GetLastError();
        eprintln!("Module32FirstW failed: GetLastError = {}", err);
      }
      // 等待再重试
      sleep(Duration::from_millis(100));
    }

    None
  }
}

/// 在目标进程中执行 YaeMain。
///
/// @since Beta v0.13.0
pub fn call_yaemain(pi: &PROCESS_INFORMATION, base: usize, dll_path: &str) -> Result<(), String> {
  let dll_path_wide = U16CString::from_str(dll_path)
    .map_err(|error| format!("DLL 路径无效（包含 NUL 字符）：{error}"))?;

  unsafe {
    let local =
      LoadLibraryExW(dll_path_wide.as_ptr(), ptr::null_mut(), DONT_RESOLVE_DLL_REFERENCES);
    if local.is_null() {
      return Err(format_windows_error("LoadLibraryExW 加载 DLL 以定位 YaeMain"));
    }

    let proc = match GetProcAddress(local, b"YaeMain\0".as_ptr()) {
      Some(proc) => proc,
      None => {
        let error = format_windows_error("GetProcAddress 获取 YaeMain");
        FreeLibrary(local);
        return Err(error);
      }
    };

    let proc_addr = proc as usize;
    let rva = proc_addr - local as usize;
    println!("YaeMain RVA: {:#x}", rva);

    FreeLibrary(local);

    let remote_yaemain = (base + rva) as *mut std::ffi::c_void;
    let thread = CreateRemoteThread(
      pi.hProcess,
      ptr::null_mut(),
      0,
      Some(std::mem::transmute(remote_yaemain)),
      base as *mut _,
      0,
      ptr::null_mut(),
    );
    if thread.is_null() {
      return Err(format_windows_error("CreateRemoteThread 执行 YaeMain"));
    }
    CloseHandle(thread);
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  /// 验证游戏路径包含 NUL 字符时返回错误而不是 panic。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn spawn_process_rejects_embedded_nul_path() {
    let result = spawn_process("C:\\TeyvatGuide\\game\0.exe", None);
    let Err(error) = result else {
      panic!("包含 NUL 字符的游戏路径应返回错误");
    };
    assert!(error.contains("游戏路径无效"));
  }

  /// 验证无效进程句柄使 DLL 注入返回错误而不是 panic。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn inject_dll_rejects_zero_process_information() {
    let process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };
    let result = inject_dll(&process_info, "YaeAchievementLib.dll");
    let Err(error) = result else {
      panic!("全零 PROCESS_INFORMATION 应返回错误");
    };
    assert!(error.contains("VirtualAllocEx"));
  }

  /// 验证缺失的 DLL 路径使 YaeMain 调用返回错误而不是 panic。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn call_yaemain_rejects_missing_dll_path() {
    let missing_dll =
      std::env::temp_dir().join(format!("teyvatguide-missing-yae-{}.dll", std::process::id()));
    assert!(!missing_dll.exists(), "测试所需的缺失 DLL 路径已存在");
    let missing_dll = missing_dll.to_string_lossy().into_owned();
    let process_info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };

    let result = call_yaemain(&process_info, 0, &missing_dll);
    let Err(error) = result else {
      panic!("缺失 DLL 路径应返回错误");
    };
    assert!(error.contains("LoadLibraryExW"));
  }
}
