//! 游戏安装路径校验、磁盘信息读取与渠道识别。
//! @since Beta v0.11.5

use super::{
  model::{GameInstallation, InstallationStatus},
  scheme::{resolve_scheme, sdk_is_consistent},
};
use chrono::Utc;
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
};

pub(crate) const AUDIO_PACKAGES: [(&str, &str); 4] = [
  ("Audio_Chinese_pkg_version", "zh-cn"),
  ("Audio_English(US)_pkg_version", "en-us"),
  ("Audio_Japanese_pkg_version", "ja-jp"),
  ("Audio_Korean_pkg_version", "ko-kr"),
];

pub(crate) fn audio_marker(language: &str) -> Option<&'static str> {
  AUDIO_PACKAGES
    .iter()
    .find(|(_, value)| value.eq_ignore_ascii_case(language))
    .map(|(marker, _)| *marker)
}

/// 规范化语音包标识，拒绝不支持的值并保证稳定顺序。
pub(crate) fn normalize_audio_languages(values: Vec<String>) -> Result<Vec<String>, String> {
  let mut result = Vec::new();
  for value in values {
    let normalized = AUDIO_PACKAGES
      .iter()
      .find(|(_, language)| language.eq_ignore_ascii_case(value.trim()))
      .map(|(_, language)| (*language).to_string())
      .ok_or_else(|| format!("不支持的语音包：{value}"))?;
    if !result.iter().any(|item| item == &normalized) {
      result.push(normalized);
    }
  }
  if result.is_empty() {
    return Err("至少选择一个语音包".to_string());
  }
  result.sort();
  Ok(result)
}

/// 从游戏根目录读取当前实际存在的官方语音包标记。
pub(crate) fn inspect_audio_languages(root_path: &Path) -> Vec<String> {
  AUDIO_PACKAGES
    .iter()
    .filter(|(file_name, _)| root_path.join(file_name).is_file())
    .map(|(_, language)| (*language).to_string())
    .collect()
}

/// 校验国服游戏可执行文件，并从安装目录读取渠道、版本和语音包状态。
pub fn inspect_executable(
  executable_path: &str,
  machine_uid: &str,
) -> Result<GameInstallation, String> {
  let requested_path = normalize_executable_path(executable_path)?;
  #[cfg(target_os = "windows")]
  validate_windows_path(&requested_path)?;
  let metadata = fs::symlink_metadata(&requested_path)
    .map_err(|error| format!("无法读取游戏可执行文件：{error}"))?;
  if metadata.file_type().is_symlink() {
    return Err("不允许通过符号链接登记游戏可执行文件".to_string());
  }
  if !metadata.is_file() {
    return Err("所选路径不是普通文件".to_string());
  }
  let file_name = requested_path
    .file_name()
    .and_then(|name| name.to_str())
    .ok_or_else(|| "游戏可执行文件名无效".to_string())?;
  if !file_name.eq_ignore_ascii_case("YuanShen.exe") {
    return Err("仅支持国服 YuanShen.exe".to_string());
  }

  let canonical_path = fs::canonicalize(&requested_path)
    .map_err(|error| format!("无法解析游戏可执行文件路径：{error}"))?;
  #[cfg(target_os = "windows")]
  let canonical_path = normalize_windows_local_path(canonical_path.to_string_lossy().as_ref())?;
  let root_path = canonical_path.parent().ok_or_else(|| "无法确定游戏安装目录".to_string())?;
  let executable_path = canonical_path.to_string_lossy().into_owned();
  let root_path_text = root_path.to_string_lossy().into_owned();
  let config = read_general_config(&root_path.join("config.ini"));
  let channel = config.get("channel").and_then(|value| value.parse::<u32>().ok());
  let sub_channel = config.get("sub_channel").and_then(|value| value.parse::<u32>().ok());
  let version = config
    .get("game_version")
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .or_else(|| read_script_version(root_path));
  let has_channel_sdk = root_path.join("YuanShen_Data/Plugins/PCGameSDK.dll").is_file();
  let audio_languages = inspect_audio_languages(root_path);

  let (scheme_id, status, status_message) = match (channel, sub_channel) {
    (Some(channel), Some(sub_channel)) => match resolve_scheme(channel, sub_channel) {
      Some(scheme) if sdk_is_consistent(scheme, has_channel_sdk) => {
        (Some(scheme), InstallationStatus::Known, "已识别受支持的国服客户端".to_string())
      }
      Some(scheme) => (
        Some(scheme),
        InstallationStatus::Inconsistent,
        "config.ini 渠道与 PCGameSDK.dll 状态不一致".to_string(),
      ),
      None => (
        None,
        InstallationStatus::Unsupported,
        format!("不支持的国服渠道组合：channel={channel}, sub_channel={sub_channel}"),
      ),
    },
    _ => (
      None,
      InstallationStatus::Unsupported,
      "config.ini 缺少有效的 channel 或 sub_channel".to_string(),
    ),
  };

  Ok(GameInstallation {
    id: derive_installation_id(&executable_path, machine_uid),
    executable_path,
    root_path: root_path_text,
    scheme_id,
    preferred_scheme: scheme_id,
    status,
    status_message,
    version,
    channel,
    sub_channel,
    has_channel_sdk,
    audio_languages,
    is_chosen: false,
    last_seen: Utc::now().to_rfc3339(),
  })
}

/// 将外部传入的可执行文件路径转换为当前平台可校验的本地路径。
fn normalize_executable_path(executable_path: &str) -> Result<PathBuf, String> {
  #[cfg(target_os = "windows")]
  {
    return normalize_windows_local_path(executable_path);
  }
  #[cfg(not(target_os = "windows"))]
  {
    Ok(PathBuf::from(executable_path))
  }
}

/// 移除 Windows 本地盘符路径的 verbatim 前缀，其他路径保持不变。
fn strip_windows_local_verbatim_prefix(path: &str) -> &str {
  let Some(local_path) = path.strip_prefix("\\\\?\\") else {
    return path;
  };
  let bytes = local_path.as_bytes();
  if bytes.len() >= 3
    && bytes[0].is_ascii_alphabetic()
    && bytes[1] == b':'
    && matches!(bytes[2], b'\\' | b'/')
  {
    local_path
  } else {
    path
  }
}

#[cfg(target_os = "windows")]
/// 归一化 Windows 本地 verbatim 路径，并拒绝其他 verbatim 路径类型。
pub(crate) fn normalize_windows_local_path(path: &str) -> Result<PathBuf, String> {
  let normalized = strip_windows_local_verbatim_prefix(path);
  if normalized == path && path.starts_with("\\\\?\\") {
    return Err("不支持网络路径或 Windows 设备路径".to_string());
  }
  Ok(PathBuf::from(normalized))
}

#[cfg(target_os = "windows")]
/// 拒绝网络路径、网络映射盘以及包含重解析点的 Windows 路径。
pub(crate) fn validate_windows_path(path: &Path) -> Result<(), String> {
  use std::os::windows::fs::MetadataExt;
  use std::path::{Component, Prefix};
  use widestring::U16CString;
  use windows_sys::Win32::Storage::FileSystem::GetDriveTypeW;
  use windows_sys::Win32::System::WindowsProgramming::DRIVE_REMOTE;

  let text = path.as_os_str().to_string_lossy();
  if text.starts_with("\\\\") || text.starts_with("\\\\?\\") || text.starts_with("\\\\.\\") {
    return Err("不支持网络路径或 Windows 设备路径".to_string());
  }
  if let Some(Component::Prefix(prefix)) = path.components().next()
    && let Prefix::Disk(letter) = prefix.kind()
  {
    let root = format!("{}:\\", char::from(letter));
    let root = U16CString::from_str(root).map_err(|error| format!("游戏盘符无效：{error}"))?;
    if unsafe { GetDriveTypeW(root.as_ptr()) } == DRIVE_REMOTE {
      return Err("不支持网络映射盘中的游戏安装".to_string());
    }
  }
  const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
  for ancestor in path.ancestors() {
    let metadata =
      fs::symlink_metadata(ancestor).map_err(|error| format!("无法检查游戏路径：{error}"))?;
    if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
      return Err("游戏路径不能包含重解析点".to_string());
    }
  }
  Ok(())
}

/// 根据设备标识和规范化后的可执行文件路径派生稳定安装 ID。
pub fn derive_installation_id(executable_path: &str, machine_uid: &str) -> String {
  let normalized = format!(
    "{}|{}",
    machine_uid.to_lowercase(),
    strip_windows_local_verbatim_prefix(executable_path).replace('/', "\\").to_lowercase(),
  );
  let mut hash = 0xcbf29ce484222325_u64;
  for byte in normalized.as_bytes() {
    hash ^= u64::from(*byte);
    hash = hash.wrapping_mul(0x100000001b3);
  }
  format!("game-{hash:016x}")
}

/// 读取 `config.ini` 的 `[general]` 节，并将键名统一为小写。
fn read_general_config(config_path: &Path) -> HashMap<String, String> {
  let Ok(content) = fs::read_to_string(config_path) else {
    return HashMap::new();
  };
  let mut in_general = false;
  let mut values = HashMap::new();
  for raw_line in content.trim_start_matches('\u{feff}').lines() {
    let line = raw_line.trim();
    if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
      continue;
    }
    if line.starts_with('[') && line.ends_with(']') {
      in_general = line[1..line.len() - 1].trim().eq_ignore_ascii_case("general");
      continue;
    }
    if !in_general {
      continue;
    }
    if let Some((key, value)) = line.split_once('=') {
      values.insert(key.trim().to_ascii_lowercase(), value.trim().to_string());
    }
  }
  values
}

/// 从游戏持久化目录中的 `ScriptVersion` 文件读取版本号。
fn read_script_version(root_path: &Path) -> Option<String> {
  let content =
    fs::read_to_string(root_path.join("YuanShen_Data/Persistent/ScriptVersion")).ok()?;
  let version = content.trim().to_string();
  (!version.is_empty()).then_some(version)
}
