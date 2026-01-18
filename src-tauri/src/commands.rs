// 命令模块，负责处理命令
// @since Beta v0.9.1

use crate::utils;
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
      GetTokenInformation, TOKEN_ELEVATION, TOKEN_QUERY, TokenElevation,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
      let mut token_handle: HANDLE = std::ptr::null_mut();
      if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle) == 0 {
        return false;
      }

      let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
      let mut return_length = 0;

      let result = GetTokenInformation(
        token_handle,
        TokenElevation,
        &mut elevation as *mut _ as *mut _,
        std::mem::size_of::<TOKEN_ELEVATION>() as u32,
        &mut return_length,
      );

      CloseHandle(token_handle);

      result != 0 && elevation.TokenIsElevated != 0
    }
  }
}

// 隐藏主窗口到托盘
#[tauri::command]
pub async fn hide_main_window(app_handle: AppHandle) {
  // 关闭所有子窗口
  for label in crate::SUB_WINDOW_LABELS.iter() {
    if let Some(sub) = app_handle.get_webview_window(label) {
      let _ = sub.destroy();
    }
  }
  // 隐藏主窗口
  if let Some(window) = app_handle.get_webview_window("TeyvatGuide") {
    let _ = window.hide();
  }
}

// 退出应用
#[tauri::command]
pub async fn quit_app(app_handle: AppHandle) {
  // 关闭所有子窗口
  for label in crate::SUB_WINDOW_LABELS.iter() {
    if let Some(sub) = app_handle.get_webview_window(label) {
      let _ = sub.destroy();
    }
  }
  // 退出应用
  app_handle.exit(0);
}

/// 获取当前系统的文本缩放比例（TextScaleFactor）
/// 返回值示例：1.0 表示 100%，1.25 表示 125%
#[tauri::command]
pub fn read_text_scale() -> Result<f64, String> {
  utils::read_text_scale_factor()
}

#[tauri::command]
pub fn launch_game(path: String, ticket: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    // 依赖 widestring 和 windows-sys
    use widestring::U16CString;
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    // 构造参数字符串
    let args = format!("login_auth_ticket={}", ticket);

    // 转为 UTF-16 C 字符串
    let operation =
      U16CString::from_str("runas").map_err(|e| format!("encode operation error: {}", e))?;
    let file = U16CString::from_str(&path).map_err(|e| format!("encode path error: {}", e))?;
    let params = U16CString::from_str(&args).map_err(|e| format!("encode params error: {}", e))?;

    // 调用 ShellExecuteW
    unsafe {
      let res = ShellExecuteW(
        0 as HWND,
        operation.as_ptr(),
        file.as_ptr(),
        params.as_ptr(),
        std::ptr::null(),
        SW_SHOWNORMAL,
      );
      let code = res as isize;
      if code <= 32 {
        return Err(format!("ShellExecuteW failed, code: {}.", code));
      }
    }
    Ok(())
  }
  #[cfg(not(target_os = "windows"))]
  {
    Err("This command is only supported on Windows".into())
  }
}

#[tauri::command]
pub fn is_msix() -> bool {
  #[cfg(not(windows))]
  {
    false
  }
  #[cfg(windows)]
  {
    use std::ptr;
    use widestring::U16CStr;
    use windows_sys::Win32::Foundation::ERROR_INSUFFICIENT_BUFFER;
    use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName;
    unsafe {
      let mut length: u32 = 0;
      let result = GetCurrentPackageFullName(&mut length, ptr::null_mut());
      if result != ERROR_INSUFFICIENT_BUFFER {
        println!("Not running in MSIX package. Error code: {}", result);
        return false;
      }
      let mut buffer = vec![0u16; length as usize];
      let result = GetCurrentPackageFullName(&mut length, buffer.as_mut_ptr());
      if result != 0 {
        println!("Failed to retrieve package full name. Error code: {}", result);
        return false;
      }
      let pkg_name = U16CStr::from_ptr_str(buffer.as_ptr());
      println!("MSIX Package Full Name: {}", pkg_name.to_string_lossy());
      true
    }
  }
}
