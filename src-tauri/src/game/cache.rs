//! 游戏任务共享缓存的占用统计与清理。
//!
//! `cache/chunks` 存放 Sophon 分片，`cache/sdks` 存放渠道 SDK 压缩包。
//! 清理会拒绝进行中或待恢复任务，并保留未完成任务引用的缓存对象。
//! @since Beta v0.11.5

use super::{journal, model::PackageCacheSummary, package::is_game_running};
use std::{collections::HashSet, fs, path::Path};

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

/// 删除未被未完成任务引用的共享缓存。
pub(crate) fn clear(
  task_root: &Path,
  has_running_tasks: bool,
) -> Result<PackageCacheSummary, String> {
  if has_running_tasks || is_game_running() || journal::blocks_cache_clear(task_root)? {
    return Err("存在进行中或待恢复的游戏资源任务，暂时不能清理缓存".to_string());
  }
  let protected = journal::protected_cache_files(task_root)?;
  clear_dir(&task_root.join("cache/chunks"), &protected)?;
  clear_dir(&task_root.join("cache/sdks"), &protected)?;
  status(task_root)
}

fn clear_dir(path: &Path, protected: &HashSet<String>) -> Result<(), String> {
  if !path.exists() {
    return Ok(());
  }
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
      if !metadata.is_file() {
        continue;
      }
      let name = entry.file_name().to_string_lossy().into_owned();
      if protected.contains(&name) {
        continue;
      }
      fs::remove_file(entry.path()).map_err(|error| format!("删除游戏缓存文件失败：{error}"))?;
    }
  }
  Ok(())
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
  use crate::game::journal::{self, TaskJournal};
  use crate::game::model::{PackagePlanTarget, PackageTaskState, SchemeId};
  use chrono::Utc;
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
  fn clear_removes_unreferenced_files_and_keeps_protected() {
    let root = TempRoot::new();
    fs::create_dir_all(root.0.join("cache/chunks")).unwrap();
    fs::create_dir_all(root.0.join("cache/sdks")).unwrap();
    fs::write(root.0.join("cache/chunks/aaaa"), b"chunk").unwrap();
    fs::write(root.0.join("cache/chunks/bbbb"), b"keep!").unwrap();
    fs::write(root.0.join("cache/sdks/cccc"), b"sdk!").unwrap();
    let task_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let mut journal = TaskJournal {
      schema_version: journal::JOURNAL_SCHEMA_VERSION,
      revision: 1,
      task_id: task_id.clone(),
      plan_id: task_id.clone(),
      installation_id: "installation".to_string(),
      operation: "predownload".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::PreDownload,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      state: PackageTaskState::ReadyToApply,
      downloaded_bytes: 5,
      total_bytes: 5,
      planned_steps: 1,
      committed_step: 1,
      owned_cache_files: vec!["bbbb".to_string()],
      total_count: 1,
      current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      error_message: None,
      apply: None,
      repair: None,
      created_at: now.clone(),
      updated_at: now,
    };
    journal::persist(&root.0, &journal).unwrap();
    let summary = clear(&root.0, false).unwrap();
    assert!(!root.0.join("cache/chunks/aaaa").exists());
    assert!(root.0.join("cache/chunks/bbbb").exists());
    assert!(!root.0.join("cache/sdks/cccc").exists());
    assert_eq!(summary.chunk_count, 1);
    assert_eq!(summary.sdk_count, 0);
    journal.state = PackageTaskState::RecoveryRequired;
    journal.touch();
    journal::persist(&root.0, &journal).unwrap();
    assert_eq!(
      clear(&root.0, false).unwrap_err(),
      "存在进行中或待恢复的游戏资源任务，暂时不能清理缓存"
    );
  }
}
