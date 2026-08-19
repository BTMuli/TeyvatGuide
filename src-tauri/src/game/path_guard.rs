//! 远端资源相对路径的规范化与 Windows 逃逸防护。
//! @since Beta v0.11.5

use std::{
  fs,
  path::{Component, Path, PathBuf},
};

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

/// 在受信根目录下解析一个必须已存在的普通 manifest 文件。
pub(crate) fn resolve_existing_manifest_file(
  root: &Path,
  relative_path: &str,
) -> Result<PathBuf, String> {
  let normalized = normalize_manifest_path(relative_path)?;
  validate_directory(root)?;
  let mut current = root.to_path_buf();
  let components = Path::new(&normalized).components().collect::<Vec<_>>();
  for (index, component) in components.iter().enumerate() {
    let Component::Normal(segment) = component else {
      return Err("manifest 资源路径包含越界段".to_string());
    };
    current.push(segment);
    let metadata = fs::symlink_metadata(&current)
      .map_err(|error| format!("读取 manifest 资源路径失败：{error}"))?;
    reject_link_or_reparse(&metadata)?;
    if index + 1 == components.len() {
      if !metadata.is_file() {
        return Err("manifest 资源目标不是普通文件".to_string());
      }
    } else if !metadata.is_dir() {
      return Err("manifest 资源父路径不是目录".to_string());
    }
  }
  Ok(current)
}

/// 在受信根目录下逐级创建安全父目录，并返回尚未写入的 manifest 文件路径。
pub(crate) fn prepare_manifest_output_file(
  root: &Path,
  relative_path: &str,
) -> Result<PathBuf, String> {
  let normalized = normalize_manifest_path(relative_path)?;
  validate_directory(root)?;
  let relative = Path::new(&normalized);
  let mut current = root.to_path_buf();
  if let Some(parent) = relative.parent() {
    for component in parent.components() {
      let Component::Normal(segment) = component else {
        return Err("manifest 资源路径包含越界段".to_string());
      };
      current.push(segment);
      match fs::symlink_metadata(&current) {
        Ok(metadata) => {
          reject_link_or_reparse(&metadata)?;
          if !metadata.is_dir() {
            return Err("manifest 输出父路径不是目录".to_string());
          }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
          fs::create_dir(&current)
            .map_err(|error| format!("创建 manifest 输出目录失败：{error}"))?;
          validate_directory(&current)?;
        }
        Err(error) => return Err(format!("读取 manifest 输出路径失败：{error}")),
      }
    }
  }
  let target = root.join(relative);
  match fs::symlink_metadata(&target) {
    Ok(metadata) => {
      reject_link_or_reparse(&metadata)?;
      if !metadata.is_file() {
        return Err("manifest 输出目标不是普通文件".to_string());
      }
    }
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("读取 manifest 输出目标失败：{error}")),
  }
  Ok(target)
}

/// 在受信根目录下逐级创建一个不包含链接或重解析点的子目录。
pub(crate) fn prepare_guarded_manifest_directory(
  root: &Path,
  relative_path: &str,
) -> Result<PathBuf, String> {
  let normalized = normalize_manifest_path(relative_path)?;
  validate_directory(root)?;
  let mut current = root.to_path_buf();
  for component in Path::new(&normalized).components() {
    let Component::Normal(segment) = component else {
      return Err("manifest 目录路径包含越界段".to_string());
    };
    current.push(segment);
    match fs::symlink_metadata(&current) {
      Ok(metadata) => {
        reject_link_or_reparse(&metadata)?;
        if !metadata.is_dir() {
          return Err("manifest 子路径不是目录".to_string());
        }
      }
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
        fs::create_dir(&current).map_err(|error| format!("创建 manifest 子目录失败：{error}"))?;
        validate_directory(&current)?;
      }
      Err(error) => return Err(format!("读取 manifest 子目录失败：{error}")),
    }
  }
  Ok(current)
}

fn validate_directory(path: &Path) -> Result<(), String> {
  let metadata =
    fs::symlink_metadata(path).map_err(|error| format!("读取 manifest 根目录失败：{error}"))?;
  reject_link_or_reparse(&metadata)?;
  if !metadata.is_dir() {
    return Err("manifest 根路径不是目录".to_string());
  }
  Ok(())
}

fn reject_link_or_reparse(metadata: &fs::Metadata) -> Result<(), String> {
  if metadata.file_type().is_symlink() {
    return Err("manifest 路径不能包含符号链接".to_string());
  }
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
    if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
      return Err("manifest 路径不能包含重解析点".to_string());
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{
    normalize_manifest_path, prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file,
  };
  use std::fs;

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

  #[test]
  fn resolves_only_files_below_a_guarded_root() {
    let root = std::env::temp_dir().join(format!("teyvat-guide-path-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(root.join("data")).unwrap();
    fs::write(root.join("data/file.bin"), b"ok").unwrap();
    assert!(resolve_existing_manifest_file(&root, "data/file.bin").is_ok());
    assert!(resolve_existing_manifest_file(&root, "../file.bin").is_err());
    fs::remove_dir_all(root).unwrap();
  }

  #[test]
  fn prepares_only_normalized_output_parents() {
    let root = std::env::temp_dir().join(format!("teyvat-guide-output-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    let target = prepare_manifest_output_file(&root, "data/nested/file.bin").unwrap();
    assert_eq!(target, root.join("data/nested/file.bin"));
    assert!(root.join("data/nested").is_dir());
    assert!(prepare_manifest_output_file(&root, "../escape.bin").is_err());
    let staging = prepare_guarded_manifest_directory(&root, "tasks/id/staging").unwrap();
    assert_eq!(staging, root.join("tasks/id/staging"));
    fs::remove_dir_all(root).unwrap();
  }
}
