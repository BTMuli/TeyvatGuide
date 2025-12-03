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
