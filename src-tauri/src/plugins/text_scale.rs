// 监听系统文本放缩
// @since Beta v0.9.1

use crate::utils;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter};
use widestring::U16CString;
use windows_sys::Win32::Foundation::ERROR_SUCCESS;
use windows_sys::Win32::System::Registry::{
  RegNotifyChangeKeyValue, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER, KEY_NOTIFY, KEY_READ,
  REG_NOTIFY_CHANGE_LAST_SET,
};

pub fn init(app: AppHandle) {
  thread::spawn(move || unsafe {
    let subkey = U16CString::from_str("Software\\Microsoft\\Accessibility").unwrap();
    let mut hkey: HKEY = std::ptr::null_mut();

    let status =
      RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_READ | KEY_NOTIFY, &mut hkey);

    if status != ERROR_SUCCESS {
      eprintln!("❌ 无法打开注册表键: {}", status);
      return;
    }

    loop {
      let notify_status =
        RegNotifyChangeKeyValue(hkey, 0, REG_NOTIFY_CHANGE_LAST_SET, std::ptr::null_mut(), 0);

      if notify_status == ERROR_SUCCESS {
        if let Ok(scale) = utils::read_text_scale_factor() {
          let _ = app.emit("text_scale_change", scale);
        }
      } else {
        eprintln!("❌ 注册表监听失败: {}", notify_status);
        break;
      }

      thread::sleep(Duration::from_secs(1));
    }
  });
}
