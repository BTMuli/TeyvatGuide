//! 游戏资源任务写前日志与重启恢复投影。
//! @since Beta v0.11.5

use super::{
  model::{PackageTaskState, PackageTaskSummary, SchemeId},
  planner::PersistedPlan,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
  fs::{self, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
};
use uuid::Uuid;

const JOURNAL_SCHEMA_VERSION: u32 = 1;
const MAX_JOURNAL_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskJournal {
  schema_version: u32,
  pub(crate) revision: u64,
  pub(crate) task_id: String,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) operation: String,
  pub(crate) source_scheme: SchemeId,
  pub(crate) target_scheme: SchemeId,
  pub(crate) target: super::model::PackagePlanTarget,
  pub(crate) source_tag: String,
  pub(crate) target_tag: String,
  pub(crate) manifest_digest: String,
  pub(crate) state: PackageTaskState,
  pub(crate) downloaded_bytes: u64,
  pub(crate) total_bytes: u64,
  pub(crate) planned_steps: usize,
  pub(crate) committed_step: usize,
  pub(crate) owned_cache_files: Vec<String>,
  pub(crate) total_count: usize,
  pub(crate) current_file: Option<String>,
  pub(crate) bytes_per_second: u64,
  pub(crate) eta_seconds: Option<u64>,
  pub(crate) error_message: Option<String>,
  pub(crate) created_at: String,
  pub(crate) updated_at: String,
}

impl TaskJournal {
  pub(crate) fn from_plan(plan: &PersistedPlan) -> Self {
    let now = Utc::now().to_rfc3339();
    Self {
      schema_version: JOURNAL_SCHEMA_VERSION,
      revision: 1,
      task_id: plan.plan_id.clone(),
      plan_id: plan.plan_id.clone(),
      installation_id: plan.installation_id.clone(),
      operation: "predownload".to_string(),
      source_scheme: plan.source_scheme,
      target_scheme: plan.target_scheme,
      target: plan.target,
      source_tag: plan.source_tag.clone(),
      target_tag: plan.target_tag.clone(),
      manifest_digest: plan.manifest_digest.clone(),
      state: PackageTaskState::Queued,
      downloaded_bytes: 0,
      total_bytes: plan.downloads.iter().map(|download| download.compressed_size).sum(),
      planned_steps: plan.downloads.len(),
      committed_step: 0,
      owned_cache_files: Vec::new(),
      total_count: plan.downloads.len(),
      current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      error_message: None,
      created_at: now.clone(),
      updated_at: now,
    }
  }

  pub(crate) fn touch(&mut self) {
    self.revision = self.revision.saturating_add(1);
    self.updated_at = Utc::now().to_rfc3339();
  }

  pub(crate) fn summary(&self) -> PackageTaskSummary {
    PackageTaskSummary {
      revision: self.revision,
      task_id: self.task_id.clone(),
      plan_id: self.plan_id.clone(),
      installation_id: self.installation_id.clone(),
      target: self.target,
      source_tag: self.source_tag.clone(),
      target_tag: self.target_tag.clone(),
      manifest_digest: self.manifest_digest.clone(),
      state: self.state,
      downloaded_bytes: self.downloaded_bytes,
      total_bytes: self.total_bytes,
      completed_count: self.committed_step,
      total_count: self.total_count,
      current_file: self.current_file.clone(),
      bytes_per_second: self.bytes_per_second,
      eta_seconds: self.eta_seconds,
      error_message: self.error_message.clone(),
      updated_at: self.updated_at.clone(),
    }
  }
}

pub(crate) fn journal_path(task_root: &Path, task_id: &str) -> PathBuf {
  task_root.join("tasks").join(task_id).join("journal.json")
}

pub(crate) fn load_or_create(
  task_root: &Path,
  plan: &PersistedPlan,
) -> Result<TaskJournal, String> {
  let path = journal_path(task_root, &plan.plan_id);
  if path.exists() {
    let journal = load(&path)?;
    validate_identity(&journal, plan)?;
    return Ok(journal);
  }
  let journal = TaskJournal::from_plan(plan);
  persist(task_root, &journal)?;
  Ok(journal)
}

pub(crate) fn load(path: &Path) -> Result<TaskJournal, String> {
  let metadata =
    fs::metadata(path).map_err(|error| format!("读取游戏资源任务日志失败：{error}"))?;
  if metadata.len() == 0 || metadata.len() > MAX_JOURNAL_BYTES {
    return Err("游戏资源任务日志大小无效".to_string());
  }
  let bytes = fs::read(path).map_err(|error| format!("读取游戏资源任务日志失败：{error}"))?;
  let journal: TaskJournal =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析游戏资源任务日志失败：{error}"))?;
  validate_journal(&journal)?;
  Ok(journal)
}

pub(crate) fn persist(task_root: &Path, journal: &TaskJournal) -> Result<(), String> {
  validate_journal(journal)?;
  let directory = task_root.join("tasks").join(&journal.task_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建游戏资源任务目录失败：{error}"))?;
  let content =
    serde_json::to_vec_pretty(journal).map_err(|error| format!("序列化任务日志失败：{error}"))?;
  if content.is_empty() || content.len() as u64 > MAX_JOURNAL_BYTES {
    return Err("游戏资源任务日志大小无效".to_string());
  }
  let target = directory.join("journal.json");
  let temporary = directory.join("journal.json.tmp");
  if temporary.exists() {
    fs::remove_file(&temporary).map_err(|error| format!("清理旧任务日志临时文件失败：{error}"))?;
  }
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建任务日志临时文件失败：{error}"))?;
  file
    .write_all(&content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入任务日志失败：{error}"))?;
  drop(file);
  atomic_replace(&temporary, &target)?;
  sync_directory(&directory)
}

pub(crate) fn list(
  task_root: &Path,
  installation_id: Option<&str>,
) -> Result<Vec<TaskJournal>, String> {
  let tasks_root = task_root.join("tasks");
  let entries = match fs::read_dir(tasks_root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
    Err(error) => return Err(format!("读取游戏资源任务目录失败：{error}")),
  };
  let mut journals = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取游戏资源任务条目失败：{error}"))?;
    if !entry.file_type().is_ok_and(|file_type| file_type.is_dir()) {
      continue;
    }
    let path = entry.path().join("journal.json");
    if !path.exists() {
      continue;
    }
    let journal = load(&path)?;
    if installation_id.is_none_or(|id| id == journal.installation_id) {
      journals.push(journal);
    }
  }
  journals.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
  Ok(journals)
}

fn validate_identity(journal: &TaskJournal, plan: &PersistedPlan) -> Result<(), String> {
  if journal.task_id != plan.plan_id
    || journal.plan_id != plan.plan_id
    || journal.installation_id != plan.installation_id
    || journal.source_scheme != plan.source_scheme
    || journal.target_scheme != plan.target_scheme
    || journal.source_tag != plan.source_tag
    || journal.target_tag != plan.target_tag
    || journal.manifest_digest != plan.manifest_digest
  {
    return Err("任务日志与不可变计划不匹配".to_string());
  }
  Ok(())
}

fn validate_journal(journal: &TaskJournal) -> Result<(), String> {
  if journal.schema_version != JOURNAL_SCHEMA_VERSION
    || Uuid::parse_str(&journal.task_id).is_err()
    || journal.task_id != journal.plan_id
    || journal.installation_id.is_empty()
    || journal.operation != "predownload"
    || journal.source_tag.is_empty()
    || journal.source_tag.len() > 128
    || journal.target_tag.is_empty()
    || journal.target_tag.len() > 128
    || journal.manifest_digest.len() != 64
    || !journal.manifest_digest.bytes().all(|byte| byte.is_ascii_hexdigit())
    || journal.planned_steps != journal.total_count
    || journal.committed_step != journal.owned_cache_files.len()
    || journal.committed_step > journal.planned_steps
    || journal.downloaded_bytes > journal.total_bytes
    || journal.current_file.as_ref().is_some_and(|value| value.len() > 256)
    || journal.error_message.as_ref().is_some_and(|value| value.len() > 4096)
  {
    return Err("游戏资源任务日志字段无效".to_string());
  }
  let mut completed = std::collections::HashSet::with_capacity(journal.owned_cache_files.len());
  if journal.owned_cache_files.iter().any(|cache_key| {
    cache_key.is_empty()
      || cache_key.len() > 256
      || !cache_key
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
      || !completed.insert(cache_key.as_str())
  }) {
    return Err("游戏资源任务日志包含无效缓存对象".to_string());
  }
  Ok(())
}

#[cfg(target_os = "windows")]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
  };

  let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let result = unsafe {
    MoveFileExW(
      source.as_ptr(),
      target.as_ptr(),
      MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
    )
  };
  if result == 0 {
    return Err(format!("原子提交任务日志失败：{}", std::io::Error::last_os_error()));
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("原子提交任务日志失败：{error}"))
}

fn sync_directory(directory: &Path) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let _ = directory;
    Ok(())
  }
  #[cfg(not(target_os = "windows"))]
  {
    std::fs::File::open(directory)
      .and_then(|file| file.sync_all())
      .map_err(|error| format!("刷新游戏资源任务目录失败：{error}"))
  }
}

#[cfg(test)]
mod tests {
  use super::{TaskJournal, load, persist};
  use crate::game::model::{PackagePlanTarget, PackageTaskState, SchemeId};
  use chrono::Utc;
  use std::fs;
  use uuid::Uuid;

  fn journal(task_id: &str) -> TaskJournal {
    let now = Utc::now().to_rfc3339();
    TaskJournal {
      schema_version: 1,
      revision: 1,
      task_id: task_id.to_string(),
      plan_id: task_id.to_string(),
      installation_id: "installation".to_string(),
      operation: "predownload".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::PreDownload,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      state: PackageTaskState::Queued,
      downloaded_bytes: 0,
      total_bytes: 8,
      planned_steps: 1,
      committed_step: 0,
      owned_cache_files: Vec::new(),
      total_count: 1,
      current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      error_message: None,
      created_at: now.clone(),
      updated_at: now,
    }
  }

  #[test]
  fn atomically_replaces_existing_journal() {
    let task_id = Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-journal-{task_id}"));
    let mut value = journal(&task_id);
    persist(&root, &value).unwrap();
    value.state = PackageTaskState::Downloading;
    value.touch();
    persist(&root, &value).unwrap();
    let loaded = load(&root.join("tasks").join(&task_id).join("journal.json")).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Downloading);
    assert_eq!(loaded.revision, 2);
    fs::remove_dir_all(root).unwrap();
  }

  #[test]
  fn rejects_corrupted_journal_identity() {
    let task_id = Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-journal-{task_id}"));
    let path = root.join("journal.json");
    fs::create_dir_all(&root).unwrap();
    fs::write(
      &path,
      serde_json::json!({
        "schemaVersion": 1,
        "revision": 1,
        "taskId": "../escape",
        "planId": "../escape"
      })
      .to_string(),
    )
    .unwrap();
    assert!(load(&path).is_err());
    fs::remove_dir_all(root).unwrap();
  }
}
