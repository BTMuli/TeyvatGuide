//! 游戏资源任务写前日志与重启恢复投影。
//! @since Beta v0.11.5

use super::{
  model::{PackagePlanTarget, PackageTaskState, PackageTaskSummary, SchemeId},
  path_guard::normalize_manifest_path,
  planner::PersistedPlan,
  scheme::scheme_id_key,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
  collections::HashSet,
  fs::{self, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
};
use uuid::Uuid;

pub(crate) const JOURNAL_SCHEMA_VERSION: u32 = 2;
const LEGACY_JOURNAL_SCHEMA_VERSION: u32 = 1;
const MAX_JOURNAL_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum CommitStepKind {
  Add,
  Modify,
  Delete,
  Repair,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum CommitStepPhase {
  BackupPending,
  BackedUp,
  InstallPending,
  Installed,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ConfigCommitPhase {
  Prepared,
  ReplacePending,
  Replaced,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActiveCommitStep {
  pub(crate) index: usize,
  pub(crate) kind: CommitStepKind,
  pub(crate) phase: CommitStepPhase,
  pub(crate) relative_path: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApplyJournal {
  pub(crate) plan_sha256: String,
  pub(crate) steps_digest: String,
  pub(crate) step_count: usize,
  pub(crate) cursor: usize,
  pub(crate) active_step: Option<ActiveCommitStep>,
  pub(crate) config_original_sha256: String,
  pub(crate) config_target_sha256: String,
  pub(crate) config_phase: ConfigCommitPhase,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RepairJournal {
  pub(crate) files: Vec<super::planner::PlanFile>,
  #[serde(default)]
  pub(crate) apply: Option<ApplyJournal>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskJournal {
  pub(crate) schema_version: u32,
  pub(crate) revision: u64,
  pub(crate) task_id: String,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) operation: String,
  pub(crate) source_scheme: SchemeId,
  pub(crate) target_scheme: SchemeId,
  pub(crate) target: PackagePlanTarget,
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
  #[serde(default)]
  pub(crate) apply: Option<ApplyJournal>,
  #[serde(default)]
  pub(crate) repair: Option<RepairJournal>,
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
      operation: operation_for_target(plan.target).to_string(),
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
      apply: None,
      repair: None,
      created_at: now.clone(),
      updated_at: now,
    }
  }

  pub(crate) fn from_switch(
    plan_id: String,
    installation_id: String,
    source_scheme: SchemeId,
    target_scheme: SchemeId,
    manifest_digest: String,
    total_bytes: u64,
    total_count: usize,
  ) -> Self {
    let now = Utc::now().to_rfc3339();
    Self {
      schema_version: JOURNAL_SCHEMA_VERSION,
      revision: 1,
      task_id: plan_id.clone(),
      plan_id,
      installation_id,
      operation: "switch".to_string(),
      source_scheme,
      target_scheme,
      target: PackagePlanTarget::Switch,
      source_tag: scheme_id_key(source_scheme).to_string(),
      target_tag: scheme_id_key(target_scheme).to_string(),
      manifest_digest,
      state: PackageTaskState::Queued,
      downloaded_bytes: 0,
      total_bytes,
      planned_steps: total_count,
      committed_step: 0,
      owned_cache_files: Vec::new(),
      total_count,
      current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      error_message: None,
      apply: None,
      repair: None,
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

/// 安装是否仍有未完成的资源或换服任务，含已下载待应用状态。
pub(crate) fn has_incomplete_tasks(
  task_root: &Path,
  installation_id: Option<&str>,
) -> Result<bool, String> {
  Ok(list(task_root, installation_id)?.iter().any(|journal| {
    !matches!(
      journal.state,
      PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
    )
  }))
}

/// 缓存清理是否会被进行中、待恢复或待修复任务阻止。
pub(crate) fn blocks_cache_clear(task_root: &Path) -> Result<bool, String> {
  Ok(list(task_root, None)?.iter().any(|journal| {
    journal.state.is_active()
      || journal.state.requires_recovery()
      || journal.state == PackageTaskState::RepairRequired
  }))
}

/// 尚未结束的任务声明拥有、清理时必须保留的缓存键。
pub(crate) fn protected_cache_files(task_root: &Path) -> Result<HashSet<String>, String> {
  let mut keys = HashSet::new();
  for journal in list(task_root, None)? {
    if matches!(
      journal.state,
      PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
    ) {
      continue;
    }
    keys.extend(journal.owned_cache_files.iter().cloned());
  }
  Ok(keys)
}

fn validate_identity(journal: &TaskJournal, plan: &PersistedPlan) -> Result<(), String> {
  if journal.task_id != plan.plan_id
    || journal.plan_id != plan.plan_id
    || journal.installation_id != plan.installation_id
    || journal.source_scheme != plan.source_scheme
    || journal.target_scheme != plan.target_scheme
    || journal.target != plan.target
    || journal.operation != operation_for_target(plan.target)
    || journal.source_tag != plan.source_tag
    || journal.target_tag != plan.target_tag
    || journal.manifest_digest != plan.manifest_digest
  {
    return Err("任务日志与不可变计划不匹配".to_string());
  }
  Ok(())
}

fn validate_journal(journal: &TaskJournal) -> Result<(), String> {
  if !matches!(journal.schema_version, JOURNAL_SCHEMA_VERSION | LEGACY_JOURNAL_SCHEMA_VERSION)
    || Uuid::parse_str(&journal.task_id).is_err()
    || journal.task_id != journal.plan_id
    || journal.installation_id.is_empty()
    || journal.operation != operation_for_target(journal.target)
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
  if journal.schema_version == LEGACY_JOURNAL_SCHEMA_VERSION
    && (journal.apply.is_some() || journal.repair.is_some())
  {
    return Err("旧版游戏资源任务日志不能包含提交状态".to_string());
  }
  if let Some(apply) = &journal.apply {
    validate_apply_journal(apply)?;
  }
  if let Some(repair) = &journal.repair {
    if repair.files.is_empty() || repair.files.len() > 500_000 {
      return Err("游戏资源任务日志包含无效修复清单".to_string());
    }
    let mut names = std::collections::HashSet::with_capacity(repair.files.len());
    if repair.files.iter().any(|file| {
      file.name.is_empty()
        || !names.insert(file.name.as_str())
        || normalize_manifest_path(&file.name).is_err()
        || file.md5.len() != 32
        || !file.md5.bytes().all(|byte| byte.is_ascii_hexdigit())
    }) {
      return Err("游戏资源任务日志包含无效修复清单".to_string());
    }
    if let Some(apply) = &repair.apply {
      validate_apply_journal(apply)?;
    }
  }
  Ok(())
}

fn validate_apply_journal(apply: &ApplyJournal) -> Result<(), String> {
  let hashes_valid = [
    &apply.plan_sha256,
    &apply.steps_digest,
    &apply.config_original_sha256,
    &apply.config_target_sha256,
  ]
  .into_iter()
  .all(|value| value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()));
  let active_valid = apply.active_step.as_ref().is_none_or(|step| {
    step.index < apply.step_count
      && step.index == apply.cursor
      && normalize_manifest_path(&step.relative_path).is_ok_and(|value| value == step.relative_path)
  });
  if !hashes_valid || apply.cursor > apply.step_count || !active_valid {
    return Err("游戏资源任务日志包含无效提交状态".to_string());
  }
  if apply.step_count == 0 && apply.config_original_sha256 == apply.config_target_sha256 {
    return Err("游戏资源任务日志包含无效提交状态".to_string());
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

fn operation_for_target(target: PackagePlanTarget) -> &'static str {
  match target {
    PackagePlanTarget::Main => "update",
    PackagePlanTarget::PreDownload => "predownload",
    PackagePlanTarget::Switch => "switch",
  }
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
      apply: None,
      repair: None,
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

  #[test]
  fn accepts_update_operation_for_main_target() {
    let task_id = Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-journal-update-{task_id}"));
    let mut value = journal(&task_id);
    value.operation = "update".to_string();
    value.target = PackagePlanTarget::Main;
    persist(&root, &value).unwrap();
    let loaded = load(&root.join("tasks").join(&task_id).join("journal.json")).unwrap();
    assert_eq!(loaded.operation, "update");
    assert_eq!(loaded.target, PackagePlanTarget::Main);
    fs::remove_dir_all(root).unwrap();
  }

  #[test]
  fn rejects_mismatched_operation_and_target() {
    let task_id = Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-journal-mismatch-{task_id}"));
    let mut value = journal(&task_id);
    value.operation = "update".to_string();
    value.target = PackagePlanTarget::PreDownload;
    assert!(persist(&root, &value).is_err());
    let _ = fs::remove_dir_all(root);
  }
}
