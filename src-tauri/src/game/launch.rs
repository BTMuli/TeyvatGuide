//! 国服官服与哔哩哔哩服客户端启动实现。
//! @since Beta v0.11.5

use super::model::SchemeId;
use std::path::Path;

/// 以管理员权限启动指定国服客户端，并仅为官服附加登录票据参数。
pub fn launch(
  executable_path: &Path,
  scheme: SchemeId,
  ticket: Option<String>,
) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    use widestring::U16CString;
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let argument = match scheme {
      SchemeId::CnOfficial => {
        let ticket = ticket
          .filter(|value| !value.trim().is_empty())
          .ok_or_else(|| "国服官服启动需要有效的 login_auth_ticket".to_string())?;
        if ticket.len() > 4096 || ticket.chars().any(char::is_control) {
          return Err("login_auth_ticket 格式无效".to_string());
        }
        Some(format!("login_auth_ticket={ticket}"))
      }
      SchemeId::CnBilibili => None,
    };
    let operation = U16CString::from_str("runas").map_err(|error| error.to_string())?;
    let file = U16CString::from_os_str(executable_path.as_os_str())
      .map_err(|error| format!("游戏路径编码失败：{error}"))?;
    let parameters = argument
      .as_deref()
      .map(U16CString::from_str)
      .transpose()
      .map_err(|error| format!("启动参数编码失败：{error}"))?;
    let parameter_pointer = parameters.as_ref().map_or(std::ptr::null(), |value| value.as_ptr());

    let result = unsafe {
      ShellExecuteW(
        std::ptr::null_mut::<std::ffi::c_void>() as HWND,
        operation.as_ptr(),
        file.as_ptr(),
        parameter_pointer,
        std::ptr::null(),
        SW_SHOWNORMAL,
      )
    };
    let code = result as isize;
    if code <= 32 {
      return Err(format!("启动游戏失败，ShellExecuteW 返回 {code}"));
    }
    Ok(())
  }

  #[cfg(not(target_os = "windows"))]
  {
    let _ = (executable_path, scheme, ticket);
    Err("游戏启动仅支持 Windows".to_string())
  }
}
