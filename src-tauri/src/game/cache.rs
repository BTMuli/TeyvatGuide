//! 游戏任务共享缓存的占用统计。
//!
//! `cache/chunks` 存放 Sophon 分片，`cache/sdks` 存放渠道 SDK 压缩包。
//! 清理入口已接上，删除尚未执行。
//! @since Beta v0.11.5

use super::model::PackageCacheSummary;
use std::{fs, path::Path};

/// 统计 `cache/chunks` 与 `cache/sdks` 的文件数和占用。
pub(crate) fn status(task_root: &Path) -> Result<PackageCacheSummary, String> {
  let (chunk_bytes, chunk_count) = summarize_dir(&task_root.join("cache/chunks"))?;
  let (sdk_bytes, sdk_count) = summarize_dir(&task_root.join("cache/sdks"))?;
  Ok(PackageCacheSummary {
    chunk_bytes,
    chunk_count,
    sdk_bytes,
    sdk_count,
    total_bytes: chunk_bytes.saturating_add(sdk_bytes),
  })
}

/// 删除共享缓存；当前尚未开放。
pub(crate) fn clear(_task_root: &Path) -> Result<PackageCacheSummary, String> {
  Err("游戏资源缓存清理尚未开放".to_string())
}

fn summarize_dir(path: &Path) -> Result<(u64, usize), String> {
  if !path.exists() {
    return Ok((0, 0));
  }
  let mut bytes = 0_u64;
  let mut count = 0_usize;
  let mut pending = vec![path.to_path_buf()];
  while let Some(dir) = pending.pop() {
    let entries = fs::read_dir(&dir).map_err(|error| format!("读取游戏缓存目录失败：{error}"))?;
    for entry in entries {
      let entry = entry.map_err(|error| format!("读取游戏缓存项失败：{error}"))?;
      let metadata = fs::symlink_metadata(entry.path())
        .map_err(|error| format!("读取游戏缓存元数据失败：{error}"))?;
      if metadata.file_type().is_symlink() {
        continue;
      }
      if metadata.is_dir() {
        pending.push(entry.path());
        continue;
      }
      if metadata.is_file() {
        bytes = bytes.saturating_add(metadata.len());
        count += 1;
      }
    }
  }
  Ok((bytes, count))
}

#[cfg(test)]
mod tests {
  use super::{clear, status};
  use std::{fs, path::PathBuf};
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-cache-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  #[test]
  fn missing_cache_dirs_are_empty() {
    let root = TempRoot::new();
    let summary = status(&root.0).unwrap();
    assert_eq!(summary.chunk_bytes, 0);
    assert_eq!(summary.chunk_count, 0);
    assert_eq!(summary.sdk_bytes, 0);
    assert_eq!(summary.sdk_count, 0);
    assert_eq!(summary.total_bytes, 0);
  }

  #[test]
  fn counts_chunk_and_sdk_files() {
    let root = TempRoot::new();
    fs::create_dir_all(root.0.join("cache/chunks")).unwrap();
    fs::create_dir_all(root.0.join("cache/sdks")).unwrap();
    fs::write(root.0.join("cache/chunks/aaaa"), b"chunk").unwrap();
    fs::write(root.0.join("cache/sdks/bbbb"), b"sdk!").unwrap();
    let summary = status(&root.0).unwrap();
    assert_eq!(summary.chunk_bytes, 5);
    assert_eq!(summary.chunk_count, 1);
    assert_eq!(summary.sdk_bytes, 4);
    assert_eq!(summary.sdk_count, 1);
    assert_eq!(summary.total_bytes, 9);
  }

  #[test]
  fn clear_is_not_open() {
    let root = TempRoot::new();
    assert_eq!(clear(&root.0).unwrap_err(), "游戏资源缓存清理尚未开放");
  }
}
