//! DLL 注入相关功能
//! @since Beta v0.9.2
#![cfg(target_os = "windows")]

use std::ptr;
use std::thread::sleep;
use std::time::Duration;
use widestring::U16CString;
use windows_sys::Win32::Foundation::{
  CloseHandle, ERROR_BAD_LENGTH, ERROR_SUCCESS, FreeLibrary, GetLastError, HANDLE,
  INVALID_HANDLE_VALUE, SetLastError,
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
use windows_sys::Win32::System::Memory::{MEM_COMMIT, PAGE_READWRITE, VirtualAllocEx};
use windows_sys::Win32::System::Pipes::{
  CreateNamedPipeW, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};
use windows_sys::Win32::System::Threading::{
  CreateProcessW, CreateRemoteThread, INFINITE, PROCESS_INFORMATION, STARTUPINFOW,
  WaitForSingleObject,
};

/// 创建命名管道
pub fn create_named_pipe(pipe_name: &str) -> HANDLE {
  let full_pipe_name = format!(r"\\.\pipe\{}", pipe_name);
  let wide = U16CString::from_str(&full_pipe_name).expect("invalid pipe name");

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
      panic!("CreateNamedPipeW failed");
    }
    handle
  }
}

/// 启动目标进程，附加 cwd 或 ticket
pub fn spawn_process(path: &str, ticket: Option<String>) -> PROCESS_INFORMATION {
  let wide_path = U16CString::from_str(path).expect("invalid path");

  let wide_cmd = ticket.as_ref().map(|t| {
    let cmdline = format!("{} login_auth_ticket={}", path, t);
    U16CString::from_str(&cmdline).expect("invalid cmdline")
  });

  let wide_cwd: Option<U16CString> = if ticket.is_none() {
    std::path::Path::new(path)
      .parent()
      .and_then(|p| Some(U16CString::from_os_str(p.as_os_str()).unwrap()))
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
      panic!("CreateProcessW failed");
    }

    pi
  }
}

/// 注入 DLL
pub fn inject_dll(pi: &PROCESS_INFORMATION, dll_path: &str) {
  let dll_utf16 = U16CString::from_str(dll_path).expect("invalid dll path");
  let size = dll_utf16.len() * 2;

  unsafe {
    let addr = VirtualAllocEx(pi.hProcess, ptr::null_mut(), size, MEM_COMMIT, PAGE_READWRITE);
    if addr.is_null() {
      panic!("VirtualAllocEx failed");
    }

    let success =
      WriteProcessMemory(pi.hProcess, addr, dll_utf16.as_ptr() as *const _, size, ptr::null_mut());
    if success == 0 {
      panic!("WriteProcessMemory failed");
    }

    let k32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
    if k32.is_null() {
      panic!("GetModuleHandleA failed");
    }

    let loadlib = GetProcAddress(k32, b"LoadLibraryW\0".as_ptr());
    if loadlib.is_none() {
      panic!("GetProcAddress failed");
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
      panic!("CreateRemoteThread failed");
    }

    WaitForSingleObject(thread, INFINITE);
  }
}

struct Snapshot(HANDLE);
impl Drop for Snapshot {
  fn drop(&mut self) {
    unsafe {
      if self.0 != INVALID_HANDLE_VALUE {
        CloseHandle(self.0);
      }
    }
  }
}

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
          eprintln!("Enumerated module: {}", name);

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

/// 执行 YaeMain
pub fn call_yaemain(pi: &PROCESS_INFORMATION, base: usize, dll_path: &str) {
  let dll_path_wide = U16CString::from_str(dll_path).expect("invalid dll path");

  unsafe {
    let local =
      LoadLibraryExW(dll_path_wide.as_ptr(), ptr::null_mut(), DONT_RESOLVE_DLL_REFERENCES);
    if local.is_null() {
      panic!("LoadLibraryExW failed");
    }

    let proc = GetProcAddress(local, b"YaeMain\0".as_ptr()).expect("无法找到 YaeMain");

    let proc_addr = proc as usize;
    let rva = proc_addr - local as usize;
    println!("YaeMain RVA: {:#x}", rva);

    FreeLibrary(local);

    let remote_yaemain = (base + rva) as *mut std::ffi::c_void;
    CreateRemoteThread(
      pi.hProcess,
      ptr::null_mut(),
      0,
      Some(std::mem::transmute(remote_yaemain)),
      base as *mut _,
      0,
      ptr::null_mut(),
    );
  }
}
