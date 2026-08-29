//! 游戏资源任务写前日志与重启恢复投影。
//! @since Beta v0.12.0

use super::{
  model::{PackagePlanTarget, PackageTaskState, PackageTaskSummary, SchemeId},
  path_guard::normalize_manifest_path,
  plan_lifecycle,
  planner::PersistedPlan,
  scheme::scheme_id_key,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::{
  collections::{HashMap, HashSet},
  fs::{self, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
  sync::{Mutex, OnceLock},
  time::{Duration as StdDuration, Instant},
};
use uuid::Uuid;

pub(crate) const JOURNAL_SCHEMA_VERSION: u32 = 4;
pub(crate) const INSTALL_COMMIT_TOTAL_STEPS: usize = 6;
const MAX_JOURNAL_BYTES: u64 = 256 * 1024 * 1024;
const JOURNAL_PROGRESS_INTERVAL: StdDuration = StdDuration::from_millis(500);
const JOURNAL_PROGRESS_SLOT_TTL: StdDuration = StdDuration::from_secs(60);
const ATOMIC_REPLACE_RETRIES: usize = 10;
const ATOMIC_REPLACE_RETRY_INTERVAL: StdDuration = StdDuration::from_millis(100);

#[derive(Clone)]
pub(crate) enum TaskDirectoryRecord {
  Journal(TaskJournal),
  PlanOnly { task_id: String, updated_at: String, plan_bytes: u64 },
  Invalid { task_id: String, updated_at: String, issue_message: String },
}

/// Timing for one journal persistence attempt.
///
/// The value is reset by each timed API and is populated on both success and
/// persistence errors.  It intentionally contains no task identity or path.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct JournalPersistTiming {
  pub(crate) persisted: bool,
  pub(crate) serialized_bytes: u64,
  pub(crate) serialize_micros: u64,
  pub(crate) write_micros: u64,
  pub(crate) file_sync_micros: u64,
  pub(crate) rename_micros: u64,
  pub(crate) directory_sync_micros: u64,
  pub(crate) total_micros: u64,
  pub(crate) lock_wait_micros: u64,
  pub(crate) file_sync_count: u64,
  pub(crate) directory_sync_count: u64,
}

fn duration_micros(duration: StdDuration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

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
  #[serde(default)]
  pub(crate) install_root: Option<String>,
  /// 资源任务目标游戏根目录；配音包准备阶段前移删除时用于取消/回滚还原。
  #[serde(default)]
  pub(crate) game_root: Option<String>,
  #[serde(default)]
  pub(crate) audio_languages: Vec<String>,
  /// 配音包计划生成时的源语音语言集合；用于界面标注新增/删除语音包。
  #[serde(default)]
  pub(crate) source_audio_languages: Vec<String>,
  pub(crate) target: PackagePlanTarget,
  pub(crate) source_tag: Option<String>,
  pub(crate) target_tag: String,
  pub(crate) manifest_digest: String,
  pub(crate) state: PackageTaskState,
  pub(crate) downloaded_bytes: u64,
  pub(crate) total_bytes: u64,
  pub(crate) planned_steps: usize,
  pub(crate) committed_step: usize,
  pub(crate) owned_cache_files: Vec<String>,
  pub(crate) total_count: usize,
  /// Number of game assets whose staging output has been fully assembled.
  #[serde(default)]
  pub(crate) assembly_completed_count: usize,
  /// Total number of game assets that must be assembled.
  #[serde(default)]
  pub(crate) assembly_total_count: usize,
  /// Number of bytes in completed game asset staging outputs.
  #[serde(default)]
  pub(crate) assembly_completed_bytes: u64,
  /// Total bytes of game asset staging outputs.
  #[serde(default)]
  pub(crate) assembly_total_bytes: u64,
  /// Number of game assets currently being assembled; never persisted across process restarts.
  #[serde(skip)]
  pub(crate) active_assembly_count: usize,
  /// Number of durable install finalization milestones completed.
  #[serde(default)]
  pub(crate) commit_completed_count: usize,
  /// Total install finalization milestones exposed to the UI.
  #[serde(default)]
  pub(crate) commit_total_count: usize,
  /// Current install finalization milestone without internal paths or identifiers.
  #[serde(default)]
  pub(crate) commit_current_step: Option<String>,
  /// Number of files verified in the current install-tree verification pass.
  #[serde(default)]
  pub(crate) verification_completed_count: usize,
  /// Total files in the current install-tree verification pass.
  #[serde(default)]
  pub(crate) verification_total_count: usize,
  /// Number of verified bytes in the current inventory verification pass.
  #[serde(default)]
  pub(crate) verification_completed_bytes: u64,
  /// Total bytes in the current inventory verification pass.
  #[serde(default)]
  pub(crate) verification_total_bytes: u64,
  #[serde(default)]
  pub(crate) spool_root: Option<String>,
  #[serde(default)]
  pub(crate) spool_bytes: u64,
  #[serde(default)]
  pub(crate) released_bytes: u64,
  #[serde(default)]
  pub(crate) completed_asset_cursor: usize,
  #[serde(default)]
  pub(crate) assembly_completed_bytes_total: u64,
  /// 配音包变更需要删除的资源总字节数。
  #[serde(default)]
  pub(crate) delete_total_bytes: u64,
  /// 已删除的资源字节数。
  #[serde(default)]
  pub(crate) delete_completed_bytes: u64,
  /// 发布前资源自动修复的任务级累计次数。
  #[serde(default)]
  pub(crate) install_repair_attempts: usize,
  /// 安装流水线因持续停滞触发的自动恢复累计次数。
  #[serde(default)]
  pub(crate) install_auto_stall_retry_count: usize,
  /// 发布前资源自动修复的逐资源累计次数；键为计划资源索引。
  #[serde(default)]
  pub(crate) install_asset_repair_attempts: HashMap<usize, usize>,
  pub(crate) current_file: Option<String>,
  #[serde(default)]
  pub(crate) download_current_file: Option<String>,
  #[serde(default)]
  pub(crate) assembly_current_file: Option<String>,
  pub(crate) bytes_per_second: u64,
  pub(crate) eta_seconds: Option<u64>,
  /// 根据最近成功组装资源的输出大小与实际组装耗时估算的写入速度。
  #[serde(default)]
  pub(crate) assembly_bytes_per_second: u64,
  /// 按写入速度估算的剩余资源组装时间。
  #[serde(default)]
  pub(crate) assembly_eta_seconds: Option<u64>,
  /// 已结算的实际任务运行时长；暂停和应用关闭期间不累计。
  #[serde(default)]
  pub(crate) accumulated_elapsed_ms: u64,
  /// 当前进程内本轮运行的开始时间；任务中断时只结算到最后一次持久化更新时间。
  #[serde(default)]
  pub(crate) active_started_at: Option<String>,
  pub(crate) error_message: Option<String>,
  /// 安装流水线因持续停滞自动暂停并重试时透出到前端的提示；重试流水线启动后清空。
  #[serde(default)]
  pub(crate) auto_retry_message: Option<String>,
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
      install_root: plan.install_overlay.as_ref().map(|overlay| overlay.game_root.clone()),
      game_root: None,
      audio_languages: plan.audio_selection.as_ref().map_or_else(
        || {
          plan
            .install_overlay
            .as_ref()
            .map_or_else(Vec::new, |overlay| overlay.audio_languages.clone())
        },
        |selection| selection.target_audio_languages.clone(),
      ),
      source_audio_languages: plan
        .audio_selection
        .as_ref()
        .map_or_else(Vec::new, |selection| selection.source_audio_languages.clone()),
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
      assembly_completed_count: 0,
      assembly_total_count: plan.assets.len(),
      assembly_completed_bytes: 0,
      assembly_total_bytes: plan.assets.iter().map(|asset| asset.size).sum(),
      active_assembly_count: 0,
      commit_completed_count: 0,
      commit_total_count: match plan.target {
        PackagePlanTarget::Install => INSTALL_COMMIT_TOTAL_STEPS,
        PackagePlanTarget::Audio => plan.assets.len().saturating_add(plan.delete_files.len()),
        PackagePlanTarget::Main | PackagePlanTarget::PreDownload => {
          plan.assets.len().saturating_add(plan.delete_files.len()).saturating_add(1)
        }
        _ => 0,
      },
      commit_current_step: match plan.target {
        PackagePlanTarget::Install => Some("等待资源组装完成".to_string()),
        PackagePlanTarget::Audio if !plan.assets.is_empty() || !plan.delete_files.is_empty() => {
          Some("等待提交配音文件".to_string())
        }
        PackagePlanTarget::Main | PackagePlanTarget::PreDownload => {
          Some("等待提交资源文件".to_string())
        }
        _ => None,
      },
      verification_completed_count: 0,
      verification_total_count: 0,
      verification_completed_bytes: 0,
      verification_total_bytes: 0,
      spool_root: plan.install_overlay.as_ref().map(|overlay| overlay.spool_root.clone()),
      spool_bytes: 0,
      released_bytes: 0,
      completed_asset_cursor: 0,
      assembly_completed_bytes_total: 0,
      delete_total_bytes: plan.delete_files.iter().map(|file| file.size).sum(),
      delete_completed_bytes: 0,
      install_repair_attempts: 0,
      install_auto_stall_retry_count: 0,
      install_asset_repair_attempts: HashMap::new(),
      current_file: None,
      download_current_file: None,
      assembly_current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      assembly_bytes_per_second: 0,
      assembly_eta_seconds: None,
      accumulated_elapsed_ms: 0,
      active_started_at: Some(now.clone()),
      error_message: None,
      auto_retry_message: None,
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
      install_root: None,
      game_root: None,
      audio_languages: Vec::new(),
      source_audio_languages: Vec::new(),
      target: PackagePlanTarget::Switch,
      source_tag: Some(scheme_id_key(source_scheme).to_string()),
      target_tag: scheme_id_key(target_scheme).to_string(),
      manifest_digest,
      state: PackageTaskState::Queued,
      downloaded_bytes: 0,
      total_bytes,
      planned_steps: total_count,
      committed_step: 0,
      owned_cache_files: Vec::new(),
      total_count,
      assembly_completed_count: 0,
      assembly_total_count: 0,
      assembly_completed_bytes: 0,
      assembly_total_bytes: 0,
      active_assembly_count: 0,
      commit_completed_count: 0,
      commit_total_count: 0,
      commit_current_step: None,
      verification_completed_count: 0,
      verification_total_count: 0,
      verification_completed_bytes: 0,
      verification_total_bytes: 0,
      spool_root: None,
      spool_bytes: 0,
      released_bytes: 0,
      completed_asset_cursor: 0,
      assembly_completed_bytes_total: 0,
      delete_total_bytes: 0,
      delete_completed_bytes: 0,
      install_repair_attempts: 0,
      install_auto_stall_retry_count: 0,
      install_asset_repair_attempts: HashMap::new(),
      current_file: None,
      download_current_file: None,
      assembly_current_file: None,
      bytes_per_second: 0,
      eta_seconds: None,
      assembly_bytes_per_second: 0,
      assembly_eta_seconds: None,
      accumulated_elapsed_ms: 0,
      active_started_at: Some(now.clone()),
      error_message: None,
      auto_retry_message: None,
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

  /// 结算上一轮运行并从当前时刻开始新的有效计时区间。
  pub(crate) fn resume_elapsed(&mut self) {
    self.freeze_elapsed_at_updated_at();
    self.active_started_at = Some(Utc::now().to_rfc3339());
  }

  /// 将本轮运行结算到最后一次持久化更新时间，避免把应用关闭时间计入任务耗时。
  pub(crate) fn freeze_elapsed_at_updated_at(&mut self) -> bool {
    let Some(started_at) = self.active_started_at.take() else {
      return false;
    };
    let elapsed = elapsed_between(&started_at, &self.updated_at);
    self.accumulated_elapsed_ms = self.accumulated_elapsed_ms.saturating_add(elapsed);
    true
  }

  pub(crate) fn reset_assembly_progress(&mut self, total_count: usize, total_bytes: u64) {
    self.assembly_completed_count = 0;
    self.assembly_total_count = total_count;
    self.assembly_completed_bytes = 0;
    self.assembly_total_bytes = total_bytes;
    self.assembly_current_file = None;
  }

  pub(crate) fn update_assembly_progress(
    &mut self,
    completed_count: usize,
    total_count: usize,
    completed_bytes: u64,
    total_bytes: u64,
    current_file: Option<String>,
  ) {
    self.assembly_completed_count = completed_count;
    self.assembly_total_count = total_count;
    self.assembly_completed_bytes = completed_bytes;
    self.assembly_total_bytes = total_bytes;
    self.current_file = current_file.clone();
    self.assembly_current_file = current_file;
  }

  /// Populate the commit projection for ordinary update and pre-download plans.
  ///
  /// Derive it from the immutable plan when the task is loaded, while
  /// preserving a resumable apply cursor when one is present.
  pub(crate) fn ensure_update_commit_progress(&mut self, plan: &PersistedPlan) -> bool {
    if !matches!(plan.target, PackagePlanTarget::Main | PackagePlanTarget::PreDownload) {
      return false;
    }
    let resource_total = plan.assets.len().saturating_add(plan.delete_files.len());
    let total = resource_total.saturating_add(1);
    let completed = self
      .apply
      .as_ref()
      .map_or_else(
        || {
          if self.state == PackageTaskState::Completed {
            total
          } else {
            self.commit_completed_count.min(resource_total)
          }
        },
        |apply| apply.cursor.min(resource_total),
      )
      .saturating_add(usize::from(
        self.apply.as_ref().is_some_and(|apply| apply.config_phase == ConfigCommitPhase::Replaced),
      ))
      .min(total);
    let current_step =
      self.commit_current_step.clone().or_else(|| Some("等待提交资源文件".to_string()));
    let changed = self.commit_completed_count != completed
      || self.commit_total_count != total
      || self.commit_current_step != current_step;
    self.commit_completed_count = completed;
    self.commit_total_count = total;
    self.commit_current_step = current_step;
    changed
  }

  /// Reset the ordinary update commit projection before a fresh apply attempt.
  pub(crate) fn reset_update_commit_progress(&mut self, plan: &PersistedPlan) {
    if !matches!(plan.target, PackagePlanTarget::Main | PackagePlanTarget::PreDownload) {
      return;
    }
    let resource_total = plan.assets.len().saturating_add(plan.delete_files.len());
    self.commit_completed_count = 0;
    self.commit_total_count = resource_total.saturating_add(1);
    self.commit_current_step = Some("等待提交资源文件".to_string());
  }

  pub(crate) fn summary(&self) -> PackageTaskSummary {
    PackageTaskSummary {
      revision: self.revision,
      task_id: self.task_id.clone(),
      plan_id: self.plan_id.clone(),
      installation_id: self.installation_id.clone(),
      target: self.target,
      source_scheme: self.source_scheme,
      target_scheme: self.target_scheme,
      install_root: self.install_root.clone(),
      audio_languages: self.audio_languages.clone(),
      source_audio_languages: self.source_audio_languages.clone(),
      target_audio_languages: self.audio_languages.clone(),
      source_tag: self.source_tag.clone(),
      target_tag: self.target_tag.clone(),
      manifest_digest: self.manifest_digest.clone(),
      state: self.state,
      downloaded_bytes: self.downloaded_bytes,
      total_bytes: self.total_bytes,
      completed_count: self.committed_step,
      total_count: self.total_count,
      assembly_completed_count: self.assembly_completed_count,
      assembly_total_count: self.assembly_total_count,
      assembly_completed_bytes: self.assembly_completed_bytes,
      assembly_total_bytes: self.assembly_total_bytes,
      active_assembly_count: self.active_assembly_count,
      commit_completed_count: self.commit_completed_count,
      commit_total_count: self.commit_total_count,
      commit_current_step: self.commit_current_step.clone(),
      verification_completed_count: self
        .verification_completed_count
        .min(self.verification_total_count),
      verification_total_count: self.verification_total_count,
      verification_completed_bytes: self
        .verification_completed_bytes
        .min(self.verification_total_bytes),
      verification_total_bytes: self.verification_total_bytes,
      spool_bytes: self.spool_bytes,
      released_bytes: self.released_bytes,
      assembly_completed_bytes_total: self.assembly_completed_bytes_total,
      delete_total_bytes: self.delete_total_bytes,
      delete_completed_bytes: self.delete_completed_bytes.min(self.delete_total_bytes),
      current_file: self.current_file.clone(),
      download_current_file: self.download_current_file.clone(),
      assembly_current_file: self.assembly_current_file.clone(),
      bytes_per_second: self.bytes_per_second,
      eta_seconds: self.eta_seconds,
      assembly_bytes_per_second: self.assembly_bytes_per_second,
      assembly_eta_seconds: self.assembly_eta_seconds,
      elapsed_ms: self.elapsed_ms(),
      error_message: self.error_message.clone(),
      auto_retry_message: self.auto_retry_message.clone(),
      updated_at: self.updated_at.clone(),
    }
  }

  fn elapsed_ms(&self) -> u64 {
    let Some(started_at) = self.active_started_at.as_deref() else {
      if self.accumulated_elapsed_ms > 0 {
        return self.accumulated_elapsed_ms;
      }
      return elapsed_between(&self.created_at, &self.updated_at);
    };
    let ended_at =
      if self.state.is_active() { Utc::now().to_rfc3339() } else { self.updated_at.clone() };
    self.accumulated_elapsed_ms.saturating_add(elapsed_between(started_at, &ended_at))
  }
}

fn elapsed_between(started_at: &str, ended_at: &str) -> u64 {
  let started = match DateTime::parse_from_rfc3339(started_at) {
    Ok(value) => value.with_timezone(&Utc),
    Err(_) => return 0,
  };
  let ended = match DateTime::parse_from_rfc3339(ended_at) {
    Ok(value) => value.with_timezone(&Utc),
    Err(_) => return 0,
  };
  ended.signed_duration_since(started).num_milliseconds().max(0) as u64
}

#[derive(Default)]
struct JournalProgressSlot {
  last_persisted_at: Option<Instant>,
  revision_floor: Option<u64>,
}

#[derive(Default)]
struct JournalProgressRegistry {
  slots: HashMap<PathBuf, JournalProgressSlot>,
}

static JOURNAL_PROGRESS_REGISTRY: OnceLock<Mutex<JournalProgressRegistry>> = OnceLock::new();

fn progress_registry() -> &'static Mutex<JournalProgressRegistry> {
  JOURNAL_PROGRESS_REGISTRY.get_or_init(|| Mutex::new(JournalProgressRegistry::default()))
}

fn progress_key(task_root: &Path, task_id: &str) -> PathBuf {
  journal_path(task_root, task_id)
}

fn prune_progress_slots(registry: &mut JournalProgressRegistry, now: Instant) {
  registry.slots.retain(|_, slot| {
    slot
      .last_persisted_at
      .is_some_and(|last| now.saturating_duration_since(last) < JOURNAL_PROGRESS_SLOT_TTL)
  });
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
  let mut timing = JournalPersistTiming::default();
  persist_timed(task_root, journal, &mut timing)
}

/// Persist a strict journal checkpoint and collect stage timings.
pub(crate) fn persist_timed(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut JournalPersistTiming,
) -> Result<(), String> {
  *timing = JournalPersistTiming::default();
  let started_at = Instant::now();
  let result = (|| {
    validate_journal(journal)?;
    let now = Instant::now();
    let key = progress_key(task_root, &journal.task_id);
    let lock_started_at = Instant::now();
    let registry_result = progress_registry().lock();
    timing.lock_wait_micros = duration_micros(lock_started_at.elapsed());
    let mut registry = registry_result.map_err(|_| "任务日志进度锁已损坏".to_string())?;
    prune_progress_slots(&mut registry, now);
    let slot = registry.slots.entry(key).or_default();
    if slot.revision_floor.is_some_and(|revision| journal.revision <= revision) {
      // Off-lock persist of an older clone must not overwrite a newer snapshot.
      return Ok(());
    }
    let result = persist_file(task_root, journal, timing);
    if result.is_ok() {
      slot.last_persisted_at = Some(now);
      slot.revision_floor = Some(slot.revision_floor.unwrap_or_default().max(journal.revision));
    }
    result
  })();
  timing.total_micros = duration_micros(started_at.elapsed());
  result
}

/// Persist display progress at most once per throttle window.
///
/// The first snapshot for a task is written immediately. Calls within the interval
/// are dropped because the fields are recomputable from the live task state. Call
/// [`flush_progress`] before a lifecycle boundary and [`forget_progress`] after the
/// task is terminal.
pub(crate) fn persist_progress(task_root: &Path, journal: &TaskJournal) -> Result<(), String> {
  let mut timing = JournalPersistTiming::default();
  persist_progress_timed(task_root, journal, &mut timing)
}

/// Persist display progress when the throttle and revision fence allow it.
pub(crate) fn persist_progress_timed(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut JournalPersistTiming,
) -> Result<(), String> {
  persist_progress_at_timed(task_root, journal, Instant::now(), timing)
}

fn persist_progress_at_timed(
  task_root: &Path,
  journal: &TaskJournal,
  now: Instant,
  timing: &mut JournalPersistTiming,
) -> Result<(), String> {
  *timing = JournalPersistTiming::default();
  let started_at = Instant::now();
  let result = (|| {
    let key = progress_key(task_root, &journal.task_id);
    let lock_started_at = Instant::now();
    let registry_result = progress_registry().lock();
    timing.lock_wait_micros = duration_micros(lock_started_at.elapsed());
    let mut registry = registry_result.map_err(|_| "任务日志进度锁已损坏".to_string())?;
    prune_progress_slots(&mut registry, now);
    let slot = registry.slots.entry(key).or_default();
    if slot.revision_floor.is_some_and(|revision| journal.revision <= revision) {
      // A snapshot that was created before a strict checkpoint must never restore
      // an older security state, even if it reaches this lock after that checkpoint.
      return Ok(());
    }
    let due = slot
      .last_persisted_at
      .is_none_or(|last| now.saturating_duration_since(last) >= JOURNAL_PROGRESS_INTERVAL);
    if !due {
      return Ok(());
    }
    validate_journal(journal)?;
    let result = persist_file(task_root, journal, timing);
    if result.is_ok() {
      slot.last_persisted_at = Some(now);
      slot.revision_floor = Some(slot.revision_floor.unwrap_or_default().max(journal.revision));
    }
    result
  })();
  timing.total_micros = duration_micros(started_at.elapsed());
  result
}

/// Persist the caller's newest progress snapshot immediately.
pub(crate) fn flush_progress(task_root: &Path, journal: &TaskJournal) -> Result<(), String> {
  let mut timing = JournalPersistTiming::default();
  flush_progress_timed(task_root, journal, &mut timing)
}

/// Flush display progress immediately when the revision fence allows it.
pub(crate) fn flush_progress_timed(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut JournalPersistTiming,
) -> Result<(), String> {
  *timing = JournalPersistTiming::default();
  let started_at = Instant::now();
  let result = (|| {
    validate_journal(journal)?;
    let now = Instant::now();
    let key = progress_key(task_root, &journal.task_id);
    let lock_started_at = Instant::now();
    let registry_result = progress_registry().lock();
    timing.lock_wait_micros = duration_micros(lock_started_at.elapsed());
    let mut registry = registry_result.map_err(|_| "任务日志进度锁已损坏".to_string())?;
    prune_progress_slots(&mut registry, now);
    let slot = registry.slots.entry(key).or_default();
    if slot.revision_floor.is_some_and(|revision| journal.revision <= revision) {
      return Ok(());
    }
    let result = persist_file(task_root, journal, timing);
    if result.is_ok() {
      slot.last_persisted_at = Some(now);
      slot.revision_floor = Some(slot.revision_floor.unwrap_or_default().max(journal.revision));
    }
    result
  })();
  timing.total_micros = duration_micros(started_at.elapsed());
  result
}

/// Drop queued progress for a task after its final strict checkpoint has been flushed.
pub(crate) fn forget_progress(task_root: &Path, task_id: &str) -> Result<(), String> {
  let key = progress_key(task_root, task_id);
  let mut registry = progress_registry().lock().map_err(|_| "任务日志进度锁已损坏".to_string())?;
  registry.slots.remove(&key);
  Ok(())
}

fn persist_file(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut JournalPersistTiming,
) -> Result<(), String> {
  let directory = task_root.join("tasks").join(&journal.task_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建游戏资源任务目录失败：{error}"))?;
  let serialize_started_at = Instant::now();
  let content = match serde_json::to_vec_pretty(journal) {
    Ok(content) => content,
    Err(error) => {
      timing.serialize_micros = duration_micros(serialize_started_at.elapsed());
      return Err(format!("序列化任务日志失败：{error}"));
    }
  };
  timing.serialize_micros = duration_micros(serialize_started_at.elapsed());
  timing.serialized_bytes = content.len() as u64;
  if content.is_empty() || content.len() as u64 > MAX_JOURNAL_BYTES {
    return Err("游戏资源任务日志大小无效".to_string());
  }
  let target = directory.join("journal.json");
  let temporary = directory.join("journal.json.tmp");
  if temporary.exists() {
    fs::remove_file(&temporary).map_err(|error| format!("清理旧任务日志临时文件失败：{error}"))?;
  }
  let write_started_at = Instant::now();
  let mut file = match OpenOptions::new().create_new(true).write(true).open(&temporary) {
    Ok(file) => file,
    Err(error) => {
      timing.write_micros = duration_micros(write_started_at.elapsed());
      return Err(format!("创建任务日志临时文件失败：{error}"));
    }
  };
  if let Err(error) = file.write_all(&content) {
    timing.write_micros = duration_micros(write_started_at.elapsed());
    return Err(format!("写入任务日志失败：{error}"));
  }
  timing.write_micros = duration_micros(write_started_at.elapsed());
  let file_sync_started_at = Instant::now();
  timing.file_sync_count = timing.file_sync_count.saturating_add(1);
  if let Err(error) = file.sync_all() {
    timing.file_sync_micros = duration_micros(file_sync_started_at.elapsed());
    return Err(format!("写入任务日志失败：{error}"));
  }
  timing.file_sync_micros = duration_micros(file_sync_started_at.elapsed());
  drop(file);
  let rename_started_at = Instant::now();
  if let Err(error) = atomic_replace(&temporary, &target) {
    timing.rename_micros = duration_micros(rename_started_at.elapsed());
    return Err(error);
  }
  timing.rename_micros = duration_micros(rename_started_at.elapsed());
  let directory_sync_started_at = Instant::now();
  #[cfg(not(target_os = "windows"))]
  {
    timing.directory_sync_count = timing.directory_sync_count.saturating_add(1);
  }
  if let Err(error) = sync_directory(&directory) {
    timing.directory_sync_micros = duration_micros(directory_sync_started_at.elapsed());
    return Err(error);
  }
  timing.directory_sync_micros = duration_micros(directory_sync_started_at.elapsed());
  timing.persisted = true;
  Ok(())
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
    let Some(directory_task_id) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let path = entry.path().join("journal.json");
    if !path.exists() {
      continue;
    }
    let journal = load(&path)?;
    if directory_task_id == journal.task_id
      && installation_id.is_none_or(|id| id == journal.installation_id)
    {
      journals.push(journal);
    }
  }
  journals.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
  Ok(journals)
}

/// 扫描任务目录中的每个条目；异常条目作为记录返回，不阻断其他任务展示。
pub(crate) fn scan_records(task_root: &Path) -> Result<Vec<TaskDirectoryRecord>, String> {
  let tasks_root = task_root.join("tasks");
  let entries = match fs::read_dir(tasks_root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
    Err(error) => return Err(format!("读取游戏资源任务目录失败：{error}")),
  };
  let mut records = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取游戏资源任务条目失败：{error}"))?;
    let task_id = entry.file_name().to_string_lossy().into_owned();
    let entry_metadata = fs::symlink_metadata(entry.path())
      .map_err(|error| format!("读取游戏资源任务条目失败：{error}"))?;
    let entry_updated_at = metadata_updated_at(&entry_metadata);
    if entry_metadata.file_type().is_symlink() || !entry_metadata.is_dir() {
      records.push(TaskDirectoryRecord::Invalid {
        task_id,
        updated_at: entry_updated_at,
        issue_message: "任务条目不是普通目录".to_string(),
      });
      continue;
    }

    let directory = entry.path();
    let journal_path = directory.join("journal.json");
    let plan_path = directory.join("plan.json");
    let journal_metadata = symlink_metadata_optional(&journal_path)?;
    let plan_metadata = symlink_metadata_optional(&plan_path)?;
    if let Some(metadata) = journal_metadata {
      if metadata.file_type().is_symlink() || !metadata.is_file() {
        records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: metadata_updated_at(&metadata),
          issue_message: "journal.json 不是普通文件".to_string(),
        });
        continue;
      }
      if plan_metadata
        .as_ref()
        .is_none_or(|metadata| metadata.file_type().is_symlink() || !metadata.is_file())
      {
        records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: metadata_updated_at(&metadata),
          issue_message: "任务日志存在，但缺少普通 plan.json".to_string(),
        });
        continue;
      }
      match load(&journal_path) {
        Ok(journal) if journal.task_id == task_id => {
          records.push(TaskDirectoryRecord::Journal(journal));
        }
        Ok(_) => records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: metadata_updated_at(&metadata),
          issue_message: "任务目录与 journal 身份不匹配".to_string(),
        }),
        Err(error) => records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: metadata_updated_at(&metadata),
          issue_message: error,
        }),
      }
      continue;
    }

    let Some(plan_metadata) = plan_metadata else {
      records.push(TaskDirectoryRecord::Invalid {
        task_id,
        updated_at: entry_updated_at,
        issue_message: "任务目录缺少 journal.json 与 plan.json".to_string(),
      });
      continue;
    };
    let plan_updated_at = metadata_updated_at(&plan_metadata);
    let plan_bytes = plan_metadata.len();
    if Uuid::parse_str(&task_id).is_err()
      || plan_metadata.file_type().is_symlink()
      || !plan_metadata.is_file()
      || plan_bytes == 0
    {
      records.push(TaskDirectoryRecord::Invalid {
        task_id,
        updated_at: plan_updated_at,
        issue_message: "未启动计划的目录身份或 plan.json 结构无效".to_string(),
      });
      continue;
    }
    match plan_lifecycle::is_safe_plan_only_directory(&directory, &task_id) {
      Ok(true) => {}
      Ok(false) => {
        records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: plan_updated_at,
          issue_message: "缺少任务日志，但目录中仍有其他任务文件".to_string(),
        });
        continue;
      }
      Err(error) => {
        records.push(TaskDirectoryRecord::Invalid {
          task_id,
          updated_at: plan_updated_at,
          issue_message: error,
        });
        continue;
      }
    }
    records.push(TaskDirectoryRecord::PlanOnly {
      task_id,
      updated_at: plan_updated_at,
      plan_bytes,
    });
  }
  records.sort_by(|left, right| record_updated_at(right).cmp(record_updated_at(left)));
  Ok(records)
}

fn symlink_metadata_optional(path: &Path) -> Result<Option<fs::Metadata>, String> {
  match fs::symlink_metadata(path) {
    Ok(metadata) => Ok(Some(metadata)),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(error) => Err(format!("读取游戏资源任务文件失败：{error}")),
  }
}

fn metadata_updated_at(metadata: &fs::Metadata) -> String {
  metadata.modified().map(DateTime::<Utc>::from).unwrap_or(DateTime::<Utc>::UNIX_EPOCH).to_rfc3339()
}

fn record_updated_at(record: &TaskDirectoryRecord) -> &str {
  match record {
    TaskDirectoryRecord::Journal(journal) => &journal.updated_at,
    TaskDirectoryRecord::PlanOnly { updated_at, .. }
    | TaskDirectoryRecord::Invalid { updated_at, .. } => updated_at,
  }
}

/// 安装是否仍有未完成的资源或换服任务，含已下载待应用状态。
pub(crate) fn has_incomplete_tasks(
  task_root: &Path,
  installation_id: Option<&str>,
) -> Result<bool, String> {
  Ok(list(task_root, installation_id)?.iter().any(|journal| !journal.state.is_history_terminal()))
}

fn is_uniqueness_target(target: PackagePlanTarget) -> bool {
  matches!(
    target,
    PackagePlanTarget::Main | PackagePlanTarget::PreDownload | PackagePlanTarget::Audio
  )
}

/// 同安装占用可恢复名额的资源任务；`except_plan_id` 用于恢复同一计划。
pub(crate) fn find_occupying_resource_task(
  task_root: &Path,
  installation_id: &str,
  except_plan_id: Option<&str>,
) -> Result<Option<TaskJournal>, String> {
  let occupying = list(task_root, Some(installation_id))?
    .into_iter()
    .filter(|journal| {
      is_uniqueness_target(journal.target)
        && journal.state.occupies_recoverable_slot()
        && except_plan_id != Some(journal.plan_id.as_str())
    })
    .max_by(|left, right| left.updated_at.cmp(&right.updated_at));
  Ok(occupying)
}

/// 发现另一条未结束资源任务时拒绝新建或启动。
pub(crate) fn reject_occupying_resource_task(
  task_root: &Path,
  installation_id: &str,
  except_plan_id: Option<&str>,
) -> Result<(), String> {
  match find_occupying_resource_task(task_root, installation_id, except_plan_id)? {
    Some(existing) => Err(format!(
      "该游戏安装已有未结束的资源任务（{}，目标 {}），请先继续、应用或放弃",
      existing.task_id, existing.target_tag
    )),
    None => Ok(()),
  }
}

/// 尚未结束的任务声明拥有、清理时必须保留的缓存键。
pub(crate) fn protected_cache_files_for_target(
  journals: &[TaskJournal],
  target: Option<super::cache::CacheClearTarget>,
) -> HashSet<String> {
  let mut keys = HashSet::new();
  for journal in journals {
    if journal.state.is_history_terminal() {
      continue;
    }
    match target {
      Some(super::cache::CacheClearTarget::Sdk) if journal.target == PackagePlanTarget::Switch => {
        keys.extend(journal.owned_cache_files.iter().cloned());
      }
      Some(super::cache::CacheClearTarget::Chunks)
        if journal.target == PackagePlanTarget::Switch => {}
      _ => keys.extend(journal.owned_cache_files.iter().cloned()),
    }
  }
  keys
}

pub(crate) fn cleanup_terminal_tasks_from_journals(
  task_root: &Path,
  active_ids: &HashSet<String>,
  max_age: Option<Duration>,
  journals: Vec<TaskJournal>,
) -> Result<(super::model::PackageTaskCleanupSummary, Vec<TaskJournal>), String> {
  let now = Utc::now();
  let mut removed_count = 0;
  let mut removed_bytes = 0_u64;
  let mut removed_task_ids = Vec::new();
  let mut retained = Vec::with_capacity(journals.len());
  for journal in journals {
    if active_ids.contains(&journal.task_id)
      || !journal.state.is_history_terminal()
      || max_age.is_some_and(|age| {
        DateTime::parse_from_rfc3339(&journal.updated_at)
          .map(|updated| now.signed_duration_since(updated.with_timezone(&Utc)) < age)
          .unwrap_or(true)
      })
    {
      retained.push(journal);
      continue;
    }
    let directory = task_root.join("tasks").join(&journal.task_id);
    let metadata = fs::symlink_metadata(&directory)
      .map_err(|error| format!("读取游戏资源任务目录失败：{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
      retained.push(journal);
      continue;
    }
    removed_bytes = removed_bytes.saturating_add(directory_bytes(&directory)?);
    fs::remove_dir_all(&directory).map_err(|error| format!("清理过期游戏资源任务失败：{error}"))?;
    removed_count += 1;
    removed_task_ids.push(journal.task_id);
  }
  Ok((
    super::model::PackageTaskCleanupSummary { removed_count, removed_bytes, removed_task_ids },
    retained,
  ))
}

/// Remove one safe task record without treating a missing record as an error.
pub(crate) fn cleanup_task_record(
  task_root: &Path,
  active_ids: &HashSet<String>,
  task_id: &str,
) -> Result<super::model::PackageTaskCleanupSummary, String> {
  if active_ids.contains(task_id) {
    return Err("任务仍在运行，无法删除任务记录".to_string());
  }
  if Uuid::parse_str(task_id).is_err() {
    return Err("任务 ID 无效：必须是 UUID".to_string());
  }

  let directory = task_root.join("tasks").join(task_id);
  let metadata = match fs::symlink_metadata(&directory) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      return Ok(super::model::PackageTaskCleanupSummary {
        removed_count: 0,
        removed_bytes: 0,
        removed_task_ids: Vec::new(),
      });
    }
    Err(error) => return Err(format!("读取游戏资源任务目录失败：{error}")),
  };
  if metadata.file_type().is_symlink() || !metadata.is_dir() {
    return Err("任务记录不是普通目录，无法安全清理".to_string());
  }
  let journal_path = directory.join("journal.json");
  if let Some(journal_metadata) = symlink_metadata_optional(&journal_path)? {
    if journal_metadata.file_type().is_symlink() || !journal_metadata.is_file() {
      return Err("任务日志不是普通文件，无法安全清理".to_string());
    }
    let journal = load(&journal_path)?;
    if journal.task_id != task_id {
      return Err("任务目录与 journal 身份不匹配，无法安全清理".to_string());
    }
    if !journal.state.is_history_terminal() {
      return Err("任务尚未结束，无法删除任务记录".to_string());
    }
  } else if !plan_lifecycle::is_safe_plan_only_directory(&directory, task_id)? {
    return Err("该记录不是可安全清理的未启动计划".to_string());
  }
  let removed_bytes = directory_bytes(&directory)?;
  match fs::remove_dir_all(&directory) {
    Ok(()) => Ok(super::model::PackageTaskCleanupSummary {
      removed_count: 1,
      removed_bytes,
      removed_task_ids: vec![task_id.to_string()],
    }),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      Ok(super::model::PackageTaskCleanupSummary {
        removed_count: 0,
        removed_bytes: 0,
        removed_task_ids: Vec::new(),
      })
    }
    Err(error) => Err(format!("清理游戏资源任务失败：{error}")),
  }
}

fn directory_bytes(path: &Path) -> Result<u64, String> {
  let mut total = 0_u64;
  let mut pending = vec![path.to_path_buf()];
  while let Some(directory) = pending.pop() {
    for entry in
      fs::read_dir(&directory).map_err(|error| format!("读取游戏资源任务目录失败：{error}"))?
    {
      let entry = entry.map_err(|error| format!("读取游戏资源任务文件失败：{error}"))?;
      let metadata = fs::symlink_metadata(entry.path())
        .map_err(|error| format!("读取游戏资源任务文件失败：{error}"))?;
      if metadata.file_type().is_symlink() {
        continue;
      }
      if metadata.is_dir() {
        pending.push(entry.path());
      } else if metadata.is_file() {
        total = total.saturating_add(metadata.len());
      }
    }
  }
  Ok(total)
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
    || journal.audio_languages
      != plan.audio_selection.as_ref().map_or_else(
        || {
          plan
            .install_overlay
            .as_ref()
            .map_or_else(Vec::new, |overlay| overlay.audio_languages.clone())
        },
        |selection| selection.target_audio_languages.clone(),
      )
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
    || journal.operation != operation_for_target(journal.target)
    || (journal.target != PackagePlanTarget::Install
      && journal.source_tag.as_deref().is_none_or(|value| {
        value.is_empty() || value.len() > 128 || value.chars().any(char::is_control)
      }))
    || (journal.target == PackagePlanTarget::Install && journal.source_tag.is_some())
    || journal.target_tag.is_empty()
    || journal.target_tag.len() > 128
    || journal.manifest_digest.len() != 64
    || !journal.manifest_digest.bytes().all(|byte| byte.is_ascii_hexdigit())
    || journal.planned_steps != journal.total_count
    || (journal.target != PackagePlanTarget::Install
      && journal.committed_step != journal.owned_cache_files.len())
    || journal.committed_step > journal.planned_steps
    || journal.downloaded_bytes > journal.total_bytes
    || journal.assembly_completed_count > journal.assembly_total_count
    || journal.assembly_completed_bytes > journal.assembly_total_bytes
    || journal.commit_completed_count > journal.commit_total_count
    || journal.verification_completed_count > journal.verification_total_count
    || journal.verification_completed_bytes > journal.verification_total_bytes
    || journal.completed_asset_cursor > journal.assembly_total_count
    || journal.assembly_completed_bytes_total > journal.assembly_total_bytes
    || journal.install_repair_attempts > 3
    || journal.install_auto_stall_retry_count > 1
    || journal.install_asset_repair_attempts.len() > journal.assembly_total_count
    || journal.install_asset_repair_attempts.iter().any(|(index, attempts)| {
      *index >= journal.assembly_total_count || *attempts == 0 || *attempts > 2
    })
    || journal
      .install_asset_repair_attempts
      .values()
      .fold(0_usize, |total, attempts| total.saturating_add(*attempts))
      != journal.install_repair_attempts
    || journal.spool_root.as_ref().is_some_and(|value| value.is_empty())
    || journal.current_file.as_ref().is_some_and(|value| value.len() > 256)
    || journal.download_current_file.as_ref().is_some_and(|value| value.len() > 256)
    || journal.assembly_current_file.as_ref().is_some_and(|value| value.len() > 256)
    || journal.commit_current_step.as_ref().is_some_and(|value| value.len() > 256)
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
  use std::thread;
  use windows_sys::Win32::Storage::FileSystem::{
    MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
  };

  // 目标日志可能被实时扫描/索引进程瞬时占用（ERROR_ACCESS_DENIED）或带只读属性；
  // 先清理只读，再对可重试错误短暂重试，避免转服任务因一次落盘竞争直接失败。
  clear_readonly_attribute(target).map_err(|error| format!("清除任务日志只读属性失败：{error}"))?;

  let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let mut last_error = None;
  for attempt in 0..ATOMIC_REPLACE_RETRIES {
    let result = unsafe {
      MoveFileExW(
        source.as_ptr(),
        target.as_ptr(),
        MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
      )
    };
    if result != 0 {
      return Ok(());
    }
    let error = std::io::Error::last_os_error();
    last_error = Some(error);
    let retriable =
      last_error.as_ref().is_some_and(|error| matches!(error.raw_os_error(), Some(5 | 32)));
    if !retriable || attempt + 1 >= ATOMIC_REPLACE_RETRIES {
      break;
    }
    thread::sleep(ATOMIC_REPLACE_RETRY_INTERVAL);
  }
  let message =
    last_error.map(|error| error.to_string()).unwrap_or_else(|| "未知系统错误".to_string());
  Err(format!("原子提交任务日志失败：{message}"))
}

#[cfg(target_os = "windows")]
fn clear_readonly_attribute(path: &Path) -> std::io::Result<()> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    FILE_ATTRIBUTE_READONLY, GetFileAttributesW, SetFileAttributesW,
  };

  let wide = path.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
  if attributes == u32::MAX {
    let error = std::io::Error::last_os_error();
    return if error.kind() == std::io::ErrorKind::NotFound { Ok(()) } else { Err(error) };
  }
  if attributes & FILE_ATTRIBUTE_READONLY != 0 {
    let result =
      unsafe { SetFileAttributesW(wide.as_ptr(), attributes & !FILE_ATTRIBUTE_READONLY) };
    if result == 0 {
      return Err(std::io::Error::last_os_error());
    }
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
    PackagePlanTarget::Audio => "audio",
    PackagePlanTarget::Switch => "switch",
    PackagePlanTarget::Install => "install",
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
  use super::*;

  struct TestTaskRoot(PathBuf);

  impl TestTaskRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvatguide-task-scan-{}", Uuid::new_v4()));
      fs::create_dir_all(path.join("tasks")).expect("create test task root");
      Self(path)
    }

    fn task_directory(&self, task_id: &str) -> PathBuf {
      self.0.join("tasks").join(task_id)
    }
  }

  impl Drop for TestTaskRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  #[test]
  fn scans_every_directory_and_only_removes_strict_plan_only_records() {
    let root = TestTaskRoot::new();
    let removable_id = Uuid::new_v4().to_string();
    let abnormal_id = Uuid::new_v4().to_string();
    let removable_directory = root.task_directory(&removable_id);
    let abnormal_directory = root.task_directory(&abnormal_id);
    fs::create_dir_all(&removable_directory).expect("create removable task");
    fs::write(removable_directory.join("plan.json"), b"{}").expect("write removable plan");
    fs::create_dir_all(&abnormal_directory).expect("create abnormal task");
    fs::write(abnormal_directory.join("plan.json"), b"{}").expect("write abnormal plan");
    fs::write(abnormal_directory.join("unexpected.bin"), b"residue")
      .expect("write abnormal residue");

    let records = scan_records(&root.0).expect("scan task records");
    assert_eq!(records.len(), 2);
    assert!(records.iter().any(|record| {
      matches!(
        record,
        TaskDirectoryRecord::PlanOnly { task_id, .. } if task_id == &removable_id
      )
    }));
    assert!(records.iter().any(|record| {
      matches!(
        record,
        TaskDirectoryRecord::Invalid { task_id, .. } if task_id == &abnormal_id
      )
    }));

    let summary = cleanup_task_record(&root.0, &HashSet::new(), &removable_id)
      .expect("remove strict plan-only task");
    assert_eq!(summary.removed_task_ids, vec![removable_id]);
    assert!(!removable_directory.exists());
    assert!(cleanup_task_record(&root.0, &HashSet::new(), &abnormal_id).is_err());
    assert!(abnormal_directory.exists());
  }
}
