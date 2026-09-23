//! 国服官服与哔哩哔哩服客户端启动实现。
//! @since Beta v0.12.3

use super::{audio_language, model::SchemeId};
use std::path::Path;

/// 启动游戏前让游戏自身保存的当前配音与所选安装实际存在的配音包保持一致，
/// 并同步客户端维护的配音语言清单。
///
/// @since Beta v0.12.3
///
/// # 参数
/// - `game_root`: 游戏安装根目录。
/// - `installed_languages`: 已选/已安装的语音标识列表。
///
/// # 返回
/// - `Ok(())`: 游戏设置与清单均已同步或无需调整。
/// - `Err(String)`: 读取或写入游戏设置、清单失败的错误描述。
pub fn sync_voice_language(game_root: &Path, installed_languages: &[String]) -> Result<(), String> {
  let supported_languages = installed_languages
    .iter()
    .filter_map(|language| audio_language::registry_id(language))
    .collect::<Vec<_>>();

  #[cfg(target_os = "windows")]
  sync_windows_voice_language(&supported_languages)?;

  #[cfg(not(target_os = "windows"))]
  let _ = &supported_languages;

  audio_language::sync_list(game_root, installed_languages)?;
  Ok(())
}

/// 根据当前值与已安装配音选择需要写入游戏配置的配音 ID。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `current`: 游戏当前保存的配音 ID。
/// - `installed`: 实际已安装的配音 ID 列表。
///
/// # 返回
/// 当前值仍有效时返回 `None`，否则返回 `installed` 中的第一个可用配音 ID。
fn voice_language_to_apply(current: Option<u32>, installed: &[u32]) -> Option<u32> {
  let fallback = installed.first().copied()?;
  (!current.is_some_and(|value| installed.contains(&value))).then_some(fallback)
}

#[cfg(target_os = "windows")]
/// 将当前配音写入 Windows 注册表中的游戏通用配置。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `installed`: 实际已安装的配音 ID 列表。
///
/// # 返回
/// - `Ok(())`: 配音无需调整或已成功同步。
/// - `Err(String)`: 读取或写入注册表失败的错误描述。
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

/// 以管理员权限启动指定国服客户端；官服附加登录票据且不传工作目录，B 服使用游戏目录。
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
    let working_directory = match scheme {
      SchemeId::CnOfficial => None,
      SchemeId::CnBilibili => {
        let directory =
          executable_path.parent().ok_or_else(|| "无法读取游戏工作目录".to_string())?;
        Some(
          U16CString::from_os_str(directory.as_os_str())
            .map_err(|error| format!("游戏工作目录编码失败：{error}"))?,
        )
      }
    };
    let working_directory_pointer =
      working_directory.as_ref().map_or(std::ptr::null(), |value| value.as_ptr());

    let result = unsafe {
      ShellExecuteW(
        std::ptr::null_mut::<std::ffi::c_void>() as HWND,
        operation.as_ptr(),
        file.as_ptr(),
        parameter_pointer,
        working_directory_pointer,
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
