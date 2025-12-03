//! 命令模块，负责处理命令
//! @since Beta v0.8.8

use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};
use tauri_utils::config::{WebviewUrl, WindowConfig};

// 放一个常数，用来判断应用是否初始化
static mut APP_INITIALIZED: bool = false;

// 初始化应用
#[tauri::command]
pub async fn init_app(app_handle: AppHandle) {
  unsafe {
    if APP_INITIALIZED == true {
      return;
    }
  }
  app_handle.emit("initApp", ()).unwrap();
  unsafe {
    APP_INITIALIZED = true;
  }
}

// 创建窗口
#[tauri::command]
pub async fn create_window(
  app_handle: AppHandle,
  label: String,
  url: String,
  option: WindowConfig,
) {
  let window_find = app_handle.get_webview_window(&label);
  if window_find.is_some() {
    window_find.unwrap().destroy().unwrap();
    return;
  }
  let url_parse = WebviewUrl::App(url.parse().unwrap());
  WebviewWindowBuilder::new(&app_handle, &label, url_parse)
    .inner_size(option.width, option.height)
    .resizable(option.resizable)
    .visible(option.visible)
    .title(option.title)
    .center()
    .additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required")
    .build()
    .unwrap();
}

// 执行 js
#[tauri::command]
pub async fn execute_js(app_handle: AppHandle, label: String, js: String) {
  let window = app_handle.get_webview_window(&label);
  if window.is_some() {
    window.unwrap().eval(js).unwrap();
  }
}

// 获取目录大小
#[tauri::command]
pub async fn get_dir_size(path: String) -> u64 {
  let walk_dir = walkdir::WalkDir::new(path);
  let mut size = 0;
  for entry in walk_dir {
    let entry = entry.unwrap();
    let file_type = entry.file_type();
    if file_type.is_file() {
      size += entry.metadata().unwrap().len();
    }
  }
  size
}

// 判断是否是管理员权限
#[tauri::command]
pub fn is_in_admin() -> bool {
  #[cfg(not(target_os = "windows"))]
  {
    return false;
  }
  #[cfg(target_os = "windows")]
  {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
      AllocateAndInitializeSid, CheckTokenMembership, FreeSid, SID_IDENTIFIER_AUTHORITY,
      TOKEN_QUERY,
    };
    use windows_sys::Win32::System::SystemServices::{
      DOMAIN_ALIAS_RID_ADMINS, SECURITY_BUILTIN_DOMAIN_RID,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
      let mut token_handle: HANDLE = std::ptr::null_mut();
      if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle) == 0 {
        return false;
      }

      let nt_authority = SID_IDENTIFIER_AUTHORITY { Value: [0, 0, 0, 0, 0, 5] };
      let mut admin_group = std::ptr::null_mut();

      let success = AllocateAndInitializeSid(
        &nt_authority,
        2,
        SECURITY_BUILTIN_DOMAIN_RID.try_into().unwrap(),
        DOMAIN_ALIAS_RID_ADMINS.try_into().unwrap(),
        0,
        0,
        0,
        0,
        0,
        0,
        &mut admin_group,
      );

      if success == 0 {
        CloseHandle(token_handle);
        return false;
      }

      let mut is_admin = 0i32;
      let result = CheckTokenMembership(std::ptr::null_mut(), admin_group, &mut is_admin);

      FreeSid(admin_group);
      CloseHandle(token_handle);

      result != 0 && is_admin != 0
    }
  }
}

#[cfg(target_os = "windows")]
pub fn shell_runas_with_args(args: &str) -> Result<(), String> {
  use std::ffi::OsStr;
  use std::iter::once;
  use std::os::windows::ffi::OsStrExt;
  use std::ptr::null_mut;

  use windows_sys::Win32::Foundation::HWND;
  use windows_sys::Win32::UI::Shell::ShellExecuteW;
  use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

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
#[cfg(target_os = "windows")]
pub fn run_watchdog(parent_pid: u32, args_to_pass: &str) -> Result<(), String> {
  use std::time::Duration;
  use windows_sys::Win32::Foundation::HANDLE;
  use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
  use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject, INFINITE};

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
  #[cfg(not(target_os = "windows"))]
  {
    return Err("This function is only supported on Windows.".into());
  }

  #[cfg(target_os = "windows")]
  {
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
}
