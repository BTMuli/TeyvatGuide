//! 远端资源相对路径的规范化与 Windows 逃逸防护。
//! @since Beta v0.11.5

use std::path::{Component, Path};

const MAX_MANIFEST_PATH_BYTES: usize = 1024;
const WINDOWS_RESERVED_NAMES: [&str; 22] = [
  "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
  "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// 校验并统一 manifest 中的相对路径分隔符。
pub fn normalize_manifest_path(value: &str) -> Result<String, String> {
  if value.is_empty() || value.len() > MAX_MANIFEST_PATH_BYTES || value.contains('\0') {
    return Err("manifest 资源路径为空、过长或包含 NUL".to_string());
  }
  if value.starts_with(['/', '\\']) || value.ends_with(['/', '\\']) {
    return Err(format!("manifest 资源路径不是规范相对路径：{value}"));
  }
  let normalized = value.replace('\\', "/");
  if normalized.contains("//") || normalized.contains(':') {
    return Err(format!("manifest 资源路径包含空段或盘符：{value}"));
  }
  let path = Path::new(&normalized);
  for component in path.components() {
    let Component::Normal(segment) = component else {
      return Err(format!("manifest 资源路径包含越界段：{value}"));
    };
    let segment = segment.to_string_lossy();
    if segment.ends_with(['.', ' ']) {
      return Err(format!("manifest 资源路径包含尾随点或空格：{value}"));
    }
    let stem = segment.split('.').next().unwrap_or_default().to_ascii_uppercase();
    if WINDOWS_RESERVED_NAMES.contains(&stem.as_str()) {
      return Err(format!("manifest 资源路径包含 Windows 保留设备名：{value}"));
    }
  }
  Ok(normalized)
}

#[cfg(test)]
mod tests {
  use super::normalize_manifest_path;

  #[test]
  fn normalizes_valid_relative_paths() {
    assert_eq!(
      normalize_manifest_path("YuanShen_Data\\StreamingAssets\\Audio.pck").unwrap(),
      "YuanShen_Data/StreamingAssets/Audio.pck",
    );
  }

  #[test]
  fn rejects_escaping_and_windows_device_paths() {
    for path in [
      "../config.ini",
      "D:/game/file",
      "//server/share",
      "folder/NUL.txt",
      "folder/trailing. ",
      "folder//file",
    ] {
      assert!(normalize_manifest_path(path).is_err(), "{path} should be rejected");
    }
  }
}
