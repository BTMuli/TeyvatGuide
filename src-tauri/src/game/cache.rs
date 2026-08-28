//! 游戏任务共享缓存的占用统计与清理。
//!
//! `cache/chunks` 存放 Sophon 分片，`cache/sdks` 存放渠道 SDK 压缩包。
//! 清理会按缓存类型保留仍被未完成任务引用的缓存对象。
//! @since Beta v0.11.5

use super::{
  journal, model::PackageCacheSummary, package::is_game_running,
  planner::clear_cache_validation_index,
};
use serde::Deserialize;
use std::{collections::HashSet, fs, path::Path};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum CacheClearTarget {
  Chunks,
  Sdk,
  All,
}

/// 统计 `cache/chunks` 与 `cache/sdks` 的文件数和占用。
pub(crate) fn status(task_root: &Path) -> Result<PackageCacheSummary, String> {
  let journals = journal::list(task_root, None)?;
  status_with_journals(task_root, &journals)
}

fn status_with_journals(
  task_root: &Path,
  journals: &[journal::TaskJournal],
) -> Result<PackageCacheSummary, String> {
  let chunk_protected =
    journal::protected_cache_files_for_target(journals, Some(CacheClearTarget::Chunks));
  let sdk_protected =
    journal::protected_cache_files_for_target(journals, Some(CacheClearTarget::Sdk));
  let chunk = summarize_dir(&task_root.join("cache/chunks"), &chunk_protected)?;
  let sdk = summarize_dir(&task_root.join("cache/sdks"), &sdk_protected)?;
  let total_bytes = chunk.total_bytes.saturating_add(sdk.total_bytes);
  let protected_bytes = chunk.protected_bytes.saturating_add(sdk.protected_bytes);
  Ok(PackageCacheSummary {
    chunk_bytes: chunk.total_bytes,
    chunk_count: chunk.total_count,
    chunk_protected_bytes: chunk.protected_bytes,
    chunk_protected_count: chunk.protected_count,
    sdk_bytes: sdk.total_bytes,
    sdk_count: sdk.total_count,
    sdk_protected_bytes: sdk.protected_bytes,
    sdk_protected_count: sdk.protected_count,
    total_bytes,
    reclaimable_bytes: total_bytes.saturating_sub(protected_bytes),
  })
}

/// 删除未被未完成任务引用的共享缓存，并通过回调上报清理进度。
///
/// 回调参数依次为：已处理文件数、总文件数、当前文件名。
pub(crate) fn clear_with_progress<F>(
  task_root: &Path,
  target: CacheClearTarget,
  progress: &mut F,
) -> Result<PackageCacheSummary, String>
where
  F: FnMut(usize, usize, &str),
{
  if target != CacheClearTarget::Sdk && is_game_running() {
    return Err("游戏仍在运行，请先关闭游戏后再清理缓存".to_string());
  }
  let journals = journal::list(task_root, None)?;
  let protected = journal::protected_cache_files_for_target(&journals, Some(target));
  let total = match target {
    CacheClearTarget::Chunks => count_dir_files(&task_root.join("cache/chunks"))?,
    CacheClearTarget::Sdk => count_dir_files(&task_root.join("cache/sdks"))?,
    CacheClearTarget::All => count_dir_files(&task_root.join("cache/chunks"))?
      .saturating_add(count_dir_files(&task_root.join("cache/sdks"))?),
  };
  let mut completed = 0_usize;
  let mut on_file = |name: &str| {
    completed = completed.saturating_add(1);
    progress(completed, total, name);
  };
  match target {
    CacheClearTarget::Chunks => {
      clear_dir(&task_root.join("cache/chunks"), &protected, &mut on_file)?;
      clear_cache_validation_index(&task_root.join("cache/chunks"));
    }
    CacheClearTarget::Sdk => {
      clear_dir(&task_root.join("cache/sdks"), &protected, &mut on_file)?;
    }
    CacheClearTarget::All => {
      clear_dir(&task_root.join("cache/chunks"), &protected, &mut on_file)?;
      clear_dir(&task_root.join("cache/sdks"), &protected, &mut on_file)?;
      clear_cache_validation_index(&task_root.join("cache/chunks"));
    }
  }
  status_with_journals(task_root, &journals)
}

fn count_dir_files(path: &Path) -> Result<usize, String> {
  let mut count = 0_usize;
  if !path.exists() {
    return Ok(0);
  }
  let mut pending = vec![path.to_path_buf()];
  while let Some(dir) = pending.pop() {
    let entries = match fs::read_dir(&dir) {
      Ok(entries) => entries,
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
      Err(error) => return Err(format!("读取游戏缓存目录失败：{error}")),
    };
    for entry in entries {
      let entry = entry.map_err(|error| format!("读取游戏缓存项失败：{error}"))?;
      let metadata = match fs::symlink_metadata(entry.path()) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
        Err(error) => return Err(format!("读取游戏缓存元数据失败：{error}")),
      };
      if metadata.file_type().is_symlink() {
        continue;
      }
      if metadata.is_dir() {
        pending.push(entry.path());
        continue;
      }
      if metadata.is_file() {
        count += 1;
      }
    }
  }
  Ok(count)
}

fn clear_dir(
  path: &Path,
  protected: &HashSet<String>,
  on_file: &mut dyn FnMut(&str),
) -> Result<(), String> {
  if !path.exists() {
    return Ok(());
  }
  let mut pending = vec![path.to_path_buf()];
  while let Some(dir) = pending.pop() {
    let entries = match fs::read_dir(&dir) {
      Ok(entries) => entries,
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
      Err(error) => return Err(format!("读取游戏缓存目录失败：{error}")),
    };
    for entry in entries {
      let entry = entry.map_err(|error| format!("读取游戏缓存项失败：{error}"))?;
      let metadata = match fs::symlink_metadata(entry.path()) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
        Err(error) => return Err(format!("读取游戏缓存元数据失败：{error}")),
      };
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
      on_file(&name);
      if protected.contains(&name) {
        continue;
      }
      fs::remove_file(entry.path()).map_err(|error| format!("删除游戏缓存文件失败：{error}"))?;
    }
  }
  Ok(())
}

struct CacheDirectorySummary {
  total_bytes: u64,
  total_count: usize,
  protected_bytes: u64,
  protected_count: usize,
}

fn summarize_dir(
  path: &Path,
  protected: &HashSet<String>,
) -> Result<CacheDirectorySummary, String> {
  if !path.exists() {
    return Ok(CacheDirectorySummary {
      total_bytes: 0,
      total_count: 0,
      protected_bytes: 0,
      protected_count: 0,
    });
  }
  let mut bytes = 0_u64;
  let mut count = 0_usize;
  let mut protected_bytes = 0_u64;
  let mut protected_count = 0_usize;
  let mut pending = vec![path.to_path_buf()];
  while let Some(dir) = pending.pop() {
    let entries = match fs::read_dir(&dir) {
      Ok(entries) => entries,
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
      Err(error) => return Err(format!("读取游戏缓存目录失败：{error}")),
    };
    for entry in entries {
      let entry = entry.map_err(|error| format!("读取游戏缓存项失败：{error}"))?;
      let metadata = match fs::symlink_metadata(entry.path()) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
        Err(error) => return Err(format!("读取游戏缓存元数据失败：{error}")),
      };
      if metadata.file_type().is_symlink() {
        continue;
      }
      if metadata.is_dir() {
        pending.push(entry.path());
        continue;
      }
      if metadata.is_file() {
        let length = metadata.len();
        bytes = bytes.saturating_add(length);
        count += 1;
        if protected.contains(entry.file_name().to_string_lossy().as_ref()) {
          protected_bytes = protected_bytes.saturating_add(length);
          protected_count += 1;
        }
      }
    }
  }
  Ok(CacheDirectorySummary {
    total_bytes: bytes,
    total_count: count,
    protected_bytes,
    protected_count,
  })
}
