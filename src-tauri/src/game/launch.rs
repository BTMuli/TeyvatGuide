//! 国服官服与哔哩哔哩服客户端启动实现。
//! @since Beta v0.11.5

use super::model::SchemeId;
use std::path::Path;

const VOICE_LANGUAGES: [(&str, u32); 4] = [("zh-cn", 0), ("en-us", 1), ("ja-jp", 2), ("ko-kr", 3)];

/// 启动游戏前让游戏自身保存的当前配音与所选安装实际存在的配音包保持一致。
pub fn sync_voice_language(installed_languages: &[String]) -> Result<(), String> {
  let supported_languages = installed_languages
    .iter()
    .filter_map(|language| voice_language_id(language))
    .collect::<Vec<_>>();
  if supported_languages.is_empty() {
    return Ok(());
  }

  #[cfg(target_os = "windows")]
  sync_windows_voice_language(&supported_languages)?;

  #[cfg(not(target_os = "windows"))]
  let _ = supported_languages;

  Ok(())
}

fn voice_language_id(language: &str) -> Option<u32> {
  VOICE_LANGUAGES.iter().find(|(value, _)| value.eq_ignore_ascii_case(language)).map(|(_, id)| *id)
}

fn voice_language_to_apply(current: Option<u32>, installed: &[u32]) -> Option<u32> {
  let fallback = installed.first().copied()?;
  (!current.is_some_and(|value| installed.contains(&value))).then_some(fallback)
}

#[cfg(target_os = "windows")]
fn sync_windows_voice_language(installed: &[u32]) -> Result<(), String> {
  use serde_json::{Map, Value};
  use std::io::ErrorKind;
  use winreg::enums::{HKEY_CURRENT_USER, REG_BINARY};
  use winreg::{RegKey, RegValue};

  const REGISTRY_PATH: &str = r"Software\miHoYo\原神";
  const GENERAL_DATA: &str = "GENERAL_DATA_h2389025596";
  const VOICE_LANGUAGE_FIELD: &str = "deviceVoiceLanguageType";

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let (key, _) = hkcu
    .create_subkey(REGISTRY_PATH)
    .map_err(|error| format!("打开游戏设置注册表失败：{error}"))?;
  let mut settings = match key.get_raw_value(GENERAL_DATA) {
    Ok(mut raw) => {
      if raw.vtype != REG_BINARY {
        return Err("游戏设置注册表格式无效，无法同步当前配音".to_string());
      }
      while raw.bytes.last() == Some(&0) {
        raw.bytes.pop();
      }
      let text = std::str::from_utf8(&raw.bytes)
        .map_err(|error| format!("游戏设置注册表不是有效的 UTF-8：{error}"))?;
      serde_json::from_str::<Value>(text)
        .map_err(|error| format!("解析游戏设置注册表失败：{error}"))?
    }
    Err(error) if error.kind() == ErrorKind::NotFound => Value::Object(Map::new()),
    Err(error) => return Err(format!("读取游戏设置注册表失败：{error}")),
  };
  let object = settings
    .as_object_mut()
    .ok_or_else(|| "游戏设置注册表内容不是 JSON 对象，无法同步当前配音".to_string())?;
  let current = object
    .get(VOICE_LANGUAGE_FIELD)
    .and_then(Value::as_u64)
    .and_then(|value| u32::try_from(value).ok());
  let Some(target) = voice_language_to_apply(current, installed) else {
    return Ok(());
  };
  object.insert(VOICE_LANGUAGE_FIELD.to_string(), Value::from(target));
  let mut bytes =
    serde_json::to_vec(&settings).map_err(|error| format!("序列化游戏设置注册表失败：{error}"))?;
  bytes.push(0);
  key
    .set_raw_value(GENERAL_DATA, &RegValue { bytes, vtype: REG_BINARY })
    .map_err(|error| format!("同步游戏当前配音失败：{error}"))
}

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
