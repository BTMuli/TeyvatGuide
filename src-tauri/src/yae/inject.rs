//! DLL 注入相关功能
//! @since Beta v0.9.0

use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::ptr;
use windows_sys::Win32::Foundation::{CloseHandle, FreeLibrary, HANDLE, INVALID_HANDLE_VALUE};
use windows_sys::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows_sys::Win32::System::Diagnostics::Debug::WriteProcessMemory;
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
  CreateToolhelp32Snapshot, Module32FirstW, Module32NextW, MODULEENTRY32W, TH32CS_SNAPMODULE,
};
use windows_sys::Win32::System::LibraryLoader::{
  GetModuleHandleA, GetProcAddress, LoadLibraryExW, DONT_RESOLVE_DLL_REFERENCES,
};
use windows_sys::Win32::System::Memory::{VirtualAllocEx, MEM_COMMIT, PAGE_READWRITE};
use windows_sys::Win32::System::Pipes::{
  CreateNamedPipeW, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};
use windows_sys::Win32::System::Threading::{
  CreateProcessW, CreateRemoteThread, WaitForSingleObject, INFINITE, PROCESS_INFORMATION,
  STARTUPINFOW,
};

/// 转为宽字符串
pub fn to_wide_string(s: &str) -> Vec<u16> {
  OsStr::new(s).encode_wide().chain(once(0)).collect()
}

/// 创建命名管道
pub fn create_named_pipe(pipe_name: &str) -> HANDLE {
  let full_pipe_name = format!(r"\\.\pipe\{}", pipe_name);
  let wide: Vec<u16> = to_wide_string(&full_pipe_name);

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

/// 启动目标进程，附加cwd
pub fn spawn_process(path: &str) -> PROCESS_INFORMATION {
  let wide_path: Vec<u16> = to_wide_string(path);
  let cwd = std::path::Path::new(path).parent().unwrap().to_str().unwrap();
  let wide_cwd: Vec<u16> = to_wide_string(cwd);

  unsafe {
    let mut si: STARTUPINFOW = std::mem::zeroed();
    si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
    let mut pi: PROCESS_INFORMATION = std::mem::zeroed();

    let success = CreateProcessW(
      wide_path.as_ptr(),
      ptr::null_mut(),
      ptr::null_mut(),
      ptr::null_mut(),
      0,
      0,
      ptr::null_mut(),
      wide_cwd.as_ptr(),
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
  let dll_utf16: Vec<u16> = to_wide_string(dll_path);
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
    if k32 == std::ptr::null_mut() {
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

/// 枚举模块，找到 DLL 基址
pub fn find_module_base(pid: u32, dll_name: &str) -> Option<usize> {
  unsafe {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, pid);
    if snapshot == INVALID_HANDLE_VALUE {
      return None;
    }

    let mut me32 =
      MODULEENTRY32W { dwSize: std::mem::size_of::<MODULEENTRY32W>() as u32, ..Default::default() };

    if Module32FirstW(snapshot, &mut me32) != 0 {
      loop {
        let name = String::from_utf16_lossy(&me32.szModule);
        if name.contains(dll_name) {
          CloseHandle(snapshot);
          return Some(me32.modBaseAddr as usize);
        }
        if Module32NextW(snapshot, &mut me32) == 0 {
          break;
        }
      }
    }

    CloseHandle(snapshot);
  }
  None
}

/// 执行 YaeMain
pub fn call_yaemain(pi: &PROCESS_INFORMATION, base: usize, dll_path: &str) {
  let dll_path_wide: Vec<u16> = to_wide_string(dll_path);
  unsafe {
    let local =
      LoadLibraryExW(dll_path_wide.as_ptr(), std::ptr::null_mut(), DONT_RESOLVE_DLL_REFERENCES);
    if local == std::ptr::null_mut() {
      panic!("LoadLibraryExW failed");
    }

    let proc = GetProcAddress(local, b"YaeMain\0".as_ptr()).expect("无法找到 YaeMain");

    // Option<unsafe extern "system" fn() -> isize>
    let proc_addr = proc as *const () as usize;
    let rva = proc_addr - local as usize;
    println!("YaeMain RVA: {:#x}", rva);

    FreeLibrary(local);

    let remote_yaemain = (base + rva) as *mut std::ffi::c_void;
    // 在远程进程里调用 YaeMain(hModule)
    CreateRemoteThread(
      pi.hProcess,
      std::ptr::null_mut(),
      0,
      Some(std::mem::transmute(remote_yaemain)),
      base as *mut _,
      0,
      std::ptr::null_mut(),
    );
  }
}
