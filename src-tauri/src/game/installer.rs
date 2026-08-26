//! Fresh game installation drafts, staging, publication and registration.
//!
//! An installation draft is deliberately kept outside `GameInstallation` until
//! the final tree has been published and inspected successfully.

use super::{
  assembler,
  installation::{
    audio_marker, derive_installation_id, inspect_executable, normalize_audio_languages,
  },
  journal::{INSTALL_COMMIT_TOTAL_STEPS, TaskJournal},
  model::{GameInstallation, PackagePlanTarget, PackageTaskState, SchemeId},
  path_guard::{normalize_manifest_path, prepare_manifest_output_file},
  planner::{InstallOverlay, PersistedPlan},
  scheme::{canonical_channel, scheme_id_key, sdk_is_consistent},
};
use chrono::Utc;
use md5::{Digest as Md5Digest, Md5};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::SqlitePool;
use std::{
  collections::{BTreeMap, HashMap, HashSet},
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::{
    Arc, LazyLock, Mutex, Weak,
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};
use uuid::Uuid;
use walkdir::WalkDir;
use zip::ZipArchive;

const DRAFT_SCHEMA_VERSION: u32 = 2;
const MARKER_SCHEMA_VERSION: u32 = 2;
const MARKER_SCHEMA_VERSION_LEGACY: u32 = 1;
pub(crate) const MARKER_FILE_NAME: &str = ".teyvatguide-install.marker";
const MAX_DRAFT_BYTES: u64 = 1024 * 1024;
const MAX_MARKER_BYTES: u64 = 64 * 1024;
const MAX_SDK_ZIP_ENTRIES: usize = 512;
const MAX_SDK_VERSION_BYTES: u64 = 256 * 1024;
const MAX_SDK_VERSION_FILES: usize = 512;
const MAX_SDK_DECOMPRESSED_BYTES: u64 = 512 * 1024 * 1024;
const INSTALL_SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;

// Draft mutations are keyed so an unrelated draft does not wait for filesystem cleanup of
// another draft. The task-root key additionally makes create's active-check and persist one
// operation for concurrent creators.
static DRAFT_MUTATION_LOCKS: LazyLock<Mutex<HashMap<String, Weak<Mutex<()>>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Default)]
pub(crate) struct InstallValidationTiming {
  pub(crate) assembly: assembler::AssemblyTiming,
  pub(crate) staging_tree_micros: u64,
  pub(crate) staging_tree_count: u64,
  pub(crate) post_publish_micros: u64,
  pub(crate) post_publish_count: u64,
  pub(crate) journal_attempt_count: u64,
  pub(crate) journal_write_count: u64,
  pub(crate) journal_serialized_bytes: u64,
  pub(crate) journal_serialize_micros: u64,
  pub(crate) journal_write_micros: u64,
  pub(crate) journal_file_sync_count: u64,
  pub(crate) journal_file_sync_micros: u64,
  pub(crate) journal_rename_micros: u64,
  pub(crate) journal_directory_sync_count: u64,
  pub(crate) journal_directory_sync_micros: u64,
  pub(crate) journal_lock_wait_micros: u64,
}

impl InstallValidationTiming {
  fn record_staging_tree(&mut self, elapsed: Duration) {
    self.staging_tree_count = self.staging_tree_count.saturating_add(1);
    self.staging_tree_micros = self.staging_tree_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_post_publish(&mut self, elapsed: Duration) {
    self.post_publish_count = self.post_publish_count.saturating_add(1);
    self.post_publish_micros = self.post_publish_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_journal(&mut self, sample: &super::journal::JournalPersistTiming) {
    self.journal_attempt_count = self.journal_attempt_count.saturating_add(1);
    self.journal_write_count = self.journal_write_count.saturating_add(u64::from(sample.persisted));
    self.journal_serialized_bytes =
      self.journal_serialized_bytes.saturating_add(sample.serialized_bytes);
    self.journal_serialize_micros =
      self.journal_serialize_micros.saturating_add(sample.serialize_micros);
    self.journal_write_micros = self.journal_write_micros.saturating_add(sample.write_micros);
    self.journal_file_sync_count =
      self.journal_file_sync_count.saturating_add(sample.file_sync_count);
    self.journal_file_sync_micros =
      self.journal_file_sync_micros.saturating_add(sample.file_sync_micros);
    self.journal_rename_micros = self.journal_rename_micros.saturating_add(sample.rename_micros);
    self.journal_directory_sync_count =
      self.journal_directory_sync_count.saturating_add(sample.directory_sync_count);
    self.journal_directory_sync_micros =
      self.journal_directory_sync_micros.saturating_add(sample.directory_sync_micros);
    self.journal_lock_wait_micros =
      self.journal_lock_wait_micros.saturating_add(sample.lock_wait_micros);
  }
}

fn duration_micros(duration: Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

fn persist_install_journal(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut InstallValidationTiming,
) -> Result<(), String> {
  let mut sample = super::journal::JournalPersistTiming::default();
  let result = super::journal::persist_timed(task_root, journal, &mut sample);
  timing.record_journal(&sample);
  result
}

fn persist_install_progress(
  task_root: &Path,
  journal: &TaskJournal,
  timing: &mut InstallValidationTiming,
) -> Result<(), String> {
  let mut sample = super::journal::JournalPersistTiming::default();
  let result = super::journal::persist_progress_timed(task_root, journal, &mut sample);
  timing.record_journal(&sample);
  result
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum InstallDraftState {
  Created,
  Planned,
  Downloading,
  ReadyToApply,
  Assembling,
  CommitPrepared,
  PublishPending,
  Published,
  Verified,
  RegistrationPending,
  Completed,
  RecoveryRequired,
  Canceled,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallDraft {
  pub(crate) schema_version: u32,
  pub(crate) draft_id: String,
  pub(crate) install_id: String,
  pub(crate) library_root: String,
  pub(crate) game_root: String,
  pub(crate) staging_root: String,
  #[serde(default)]
  pub(crate) library_volume_serial: u64,
  #[serde(default)]
  pub(crate) library_file_id: u64,
  #[serde(default)]
  pub(crate) target_volume_serial: u64,
  #[serde(default)]
  pub(crate) target_file_id: u64,
  pub(crate) expected_executable: String,
  pub(crate) marker_nonce: String,
  pub(crate) scheme: SchemeId,
  pub(crate) audio_languages: Vec<String>,
  pub(crate) state: InstallDraftState,
  pub(crate) plan_id: Option<String>,
  pub(crate) target_tag: Option<String>,
  #[serde(default)]
  pub(crate) manifest_digest: Option<String>,
  #[serde(default)]
  pub(crate) sdk_version: Option<String>,
  #[serde(default)]
  pub(crate) sdk_md5: Option<String>,
  pub(crate) created_at: String,
  pub(crate) updated_at: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallDraftSummary {
  pub(crate) draft_id: String,
  pub(crate) install_id: String,
  pub(crate) install_root: String,
  pub(crate) scheme: SchemeId,
  pub(crate) audio_languages: Vec<String>,
  pub(crate) state: InstallDraftState,
  pub(crate) plan_id: Option<String>,
  pub(crate) target_tag: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum InstallLocationKind {
  Empty,
  Existing,
  Occupied,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallLocationSummary {
  pub(crate) kind: InstallLocationKind,
  pub(crate) installation: Option<GameInstallation>,
  pub(crate) message: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallMarker {
  schema_version: u32,
  plan_id: String,
  install_id: String,
  marker_nonce: String,
  game_root: String,
  target_path_sha256: String,
  scheme: SchemeId,
  directory_volume_serial: u64,
  directory_file_id: u64,
  manifest_digest: String,
  tree_digest: String,
  config_sha256: String,
  #[serde(default)]
  evidence_sha256: String,
}

pub(crate) fn create_draft(
  task_root: &Path,
  install_root_input: &str,
  scheme: SchemeId,
  audio_languages: Vec<String>,
  machine_uid: &str,
  protected_roots: &[PathBuf],
) -> Result<InstallDraftSummary, String> {
  ensure_windows_install_platform()?;
  let game_root = validate_install_root(install_root_input, protected_roots)?;
  if !is_directory_empty(&game_root)? {
    return Err("安装目录不是空目录，请选择空目录或已有游戏目录进行完整性校验".to_string());
  }
  let library_root =
    game_root.parent().ok_or_else(|| "安装目录缺少父目录".to_string())?.to_path_buf();
  let audio_languages = normalize_audio_languages(audio_languages)?;
  let draft_id = Uuid::new_v4().to_string();
  let marker_nonce = marker_nonce();
  let expected_executable = game_root.join("YuanShen.exe");
  let staging_root =
    library_root.join(format!(".teyvatguide-install-{draft_id}-{}", &marker_nonce[..12]));
  if path_occupied(&staging_root)? {
    return Err("安装暂存目录已存在，请重新选择安装位置".to_string());
  }
  let (library_volume_serial, library_file_id) = directory_identity(&library_root)?;
  let (target_volume_serial, target_file_id) = directory_identity(&game_root)?;
  let draft = InstallDraft {
    schema_version: DRAFT_SCHEMA_VERSION,
    draft_id: draft_id.clone(),
    install_id: derive_installation_id(&expected_executable.to_string_lossy(), machine_uid),
    library_root: path_text(&library_root),
    game_root: path_text(&game_root),
    staging_root: path_text(&staging_root),
    library_volume_serial,
    library_file_id,
    target_volume_serial,
    target_file_id,
    expected_executable: path_text(&expected_executable),
    marker_nonce,
    scheme,
    audio_languages,
    state: InstallDraftState::Created,
    plan_id: None,
    target_tag: None,
    manifest_digest: None,
    sdk_version: None,
    sdk_md5: None,
    created_at: Utc::now().to_rfc3339(),
    updated_at: Utc::now().to_rfc3339(),
  };
  let lock = draft_mutation_lock(&task_root_lock_key(task_root))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  if has_active_draft(task_root, &expected_executable, machine_uid)? {
    return Err("该游戏库目录已有未完成的安装草稿，请先恢复或取消原任务。".to_string());
  }
  persist_draft(task_root, &draft)?;
  Ok(draft.summary())
}

/// 读取所有仍需用户处理的全新安装草稿。
pub(crate) fn list_draft_summaries(task_root: &Path) -> Result<Vec<InstallDraftSummary>, String> {
  let directory = task_root.join("install-drafts");
  let entries = match fs::read_dir(&directory) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
    Err(error) => return Err(format!("读取安装草稿目录失败：{error}")),
  };
  let mut drafts = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取安装草稿失败：{error}"))?;
    let Some(name) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let Some(draft_id) = name.strip_suffix(".json") else {
      continue;
    };
    let draft = match load_draft(task_root, draft_id) {
      Ok(draft) => draft,
      Err(error) => {
        log::warn!("[game-install] 忽略无法读取的安装草稿 {draft_id}：{error}");
        continue;
      }
    };
    if matches!(draft.state, InstallDraftState::Canceled | InstallDraftState::Completed) {
      continue;
    }
    drafts.push(draft.summary());
  }
  drafts.sort_by(|left, right| left.draft_id.cmp(&right.draft_id));
  Ok(drafts)
}

pub(crate) fn inspect_install_location(
  install_root_input: &str,
  machine_uid: &str,
  protected_roots: &[PathBuf],
  registered_roots: &[PathBuf],
) -> Result<InstallLocationSummary, String> {
  ensure_windows_install_platform()?;
  let install_root = validate_install_root(install_root_input, protected_roots)?;
  if registered_roots
    .iter()
    .any(|root| !same_path(&install_root, root) && is_related(&install_root, root))
  {
    return Err("安装目录不能是已登记游戏目录的父级或子目录".to_string());
  }

  let executable = install_root.join("YuanShen.exe");
  if path_occupied(&executable)? {
    let executable_text = executable.to_string_lossy();
    return match inspect_executable(executable_text.as_ref(), machine_uid) {
      Ok(installation) => Ok(InstallLocationSummary {
        kind: InstallLocationKind::Existing,
        installation: Some(installation),
        message: None,
      }),
      Err(error) => Ok(InstallLocationSummary {
        kind: InstallLocationKind::Occupied,
        installation: None,
        message: Some(format!("检测到 YuanShen.exe，但不是可用的游戏目录：{error}")),
      }),
    };
  }

  if !is_directory_empty(&install_root)? {
    return Ok(InstallLocationSummary {
      kind: InstallLocationKind::Occupied,
      installation: None,
      message: Some("安装目录不是空目录，请选择空目录或已有完整游戏目录".to_string()),
    });
  }
  Ok(InstallLocationSummary { kind: InstallLocationKind::Empty, installation: None, message: None })
}

pub(crate) fn load_draft(task_root: &Path, draft_id: &str) -> Result<InstallDraft, String> {
  if Uuid::parse_str(draft_id).is_err() {
    return Err("安装草稿 ID 无效".to_string());
  }
  let path = draft_path(task_root, draft_id);
  let metadata =
    fs::symlink_metadata(&path).map_err(|error| format!("读取安装草稿失败：{error}"))?;
  if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_file() {
    return Err("安装草稿不是安全的普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_DRAFT_BYTES {
    return Err("安装草稿大小无效".to_string());
  }
  let bytes = fs::read(&path).map_err(|error| format!("读取安装草稿失败：{error}"))?;
  let draft: InstallDraft =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析安装草稿失败：{error}"))?;
  validate_draft(&draft, draft_id)?;
  Ok(draft)
}

pub(crate) fn persist_draft(task_root: &Path, draft: &InstallDraft) -> Result<(), String> {
  let lock = draft_mutation_lock(&draft_lock_key(task_root, &draft.draft_id))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  persist_draft_unlocked(task_root, draft)
}

fn persist_draft_unlocked(task_root: &Path, draft: &InstallDraft) -> Result<(), String> {
  validate_draft(draft, &draft.draft_id)?;
  let directory = task_root.join("install-drafts");
  fs::create_dir_all(&directory).map_err(|error| format!("创建安装草稿目录失败：{error}"))?;
  let metadata =
    fs::symlink_metadata(&directory).map_err(|error| format!("读取安装草稿目录失败：{error}"))?;
  if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_dir() {
    return Err("安装草稿目录不是安全的普通目录".to_string());
  }
  let content =
    serde_json::to_vec_pretty(draft).map_err(|error| format!("序列化安装草稿失败：{error}"))?;
  if content.is_empty() || content.len() as u64 > MAX_DRAFT_BYTES {
    return Err("安装草稿大小无效".to_string());
  }
  atomic_write(&draft_path(task_root, &draft.draft_id), &content)
}

pub(crate) fn mark_draft_plan(
  task_root: &Path,
  draft_id: &str,
  plan: &PersistedPlan,
) -> Result<InstallDraft, String> {
  let lock = draft_mutation_lock(&draft_lock_key(task_root, draft_id))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  let mut draft = load_draft(task_root, draft_id)?;
  validate_draft_state_transition(draft.state, InstallDraftState::Planned)?;
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  if plan.installation_id != draft.install_id
    || plan.target != PackagePlanTarget::Install
    || plan.strategy != super::model::PackagePlanStrategy::Full
  {
    return Err("安装草稿与计划身份不匹配".to_string());
  }
  draft.plan_id = Some(plan.plan_id.clone());
  draft.target_tag = Some(plan.target_tag.clone());
  draft.manifest_digest = Some(plan.manifest_digest.clone());
  draft.sdk_version = overlay.sdk.as_ref().map(|sdk| sdk.version.clone());
  draft.sdk_md5 = overlay.sdk.as_ref().map(|sdk| sdk.md5.clone());
  draft.state = InstallDraftState::Planned;
  draft.updated_at = Utc::now().to_rfc3339();
  persist_draft_unlocked(task_root, &draft)?;
  Ok(draft)
}

pub(crate) fn set_draft_state(
  task_root: &Path,
  draft_id: &str,
  state: InstallDraftState,
) -> Result<InstallDraft, String> {
  let lock = draft_mutation_lock(&draft_lock_key(task_root, draft_id))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  set_draft_state_unlocked(task_root, draft_id, state)
}

fn set_draft_state_unlocked(
  task_root: &Path,
  draft_id: &str,
  state: InstallDraftState,
) -> Result<InstallDraft, String> {
  let mut draft = load_draft(task_root, draft_id)?;
  validate_draft_state_transition(draft.state, state)?;
  draft.state = state;
  draft.updated_at = Utc::now().to_rfc3339();
  persist_draft_unlocked(task_root, &draft)?;
  Ok(draft)
}

pub(crate) fn overlay_for_draft(draft: &InstallDraft, target_tag: &str) -> InstallOverlay {
  let spool_root = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-spool-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  InstallOverlay {
    library_root: draft.library_root.clone(),
    game_root: draft.game_root.clone(),
    staging_root: draft.staging_root.clone(),
    spool_root: path_text(&spool_root),
    target_path_sha256: path_digest(Path::new(&draft.game_root)),
    library_volume_serial: draft.library_volume_serial,
    library_file_id: draft.library_file_id,
    target_volume_serial: draft.target_volume_serial,
    target_file_id: draft.target_file_id,
    marker_nonce: draft.marker_nonce.clone(),
    expected_executable: draft.expected_executable.clone(),
    channel: canonical_channel(draft.scheme).0,
    sub_channel: canonical_channel(draft.scheme).1,
    audio_languages: draft.audio_languages.clone(),
    config: build_config(draft.scheme, target_tag),
    config_sha256: String::new(),
    sdk: None,
  }
}

pub(crate) fn build_config(scheme: SchemeId, target_tag: &str) -> String {
  let (channel, sub_channel) = canonical_channel(scheme);
  let cps = match scheme {
    SchemeId::CnOfficial => "mihoyo",
    SchemeId::CnBilibili => "bilibili",
  };
  format!(
    "[general]\r\nchannel={channel}\r\nsub_channel={sub_channel}\r\ngame_version={target_tag}\r\ncps={cps}\r\ngame_biz=hk4e_cn\r\n"
  )
}

pub(crate) fn execute_install(
  plan: &PersistedPlan,
  task_root: &Path,
  machine_uid: &str,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  emit: &dyn Fn(&TaskJournal),
  timing: &mut InstallValidationTiming,
) -> Result<GameInstallation, String> {
  ensure_windows_install_platform()?;
  if plan.target != PackagePlanTarget::Install
    || plan.strategy != super::model::PackagePlanStrategy::Full
  {
    return Err("安装提交需要 Full 安装计划".to_string());
  }
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let draft_id = find_draft_id(task_root, &plan.installation_id)?;
  let draft = load_draft(task_root, &draft_id)?;
  validate_plan_draft(plan, overlay, &draft)?;
  check_canceled(canceled)?;
  let staging_root = PathBuf::from(&overlay.staging_root);
  let game_root = PathBuf::from(&overlay.game_root);
  if path_occupied(&game_root)? {
    validate_empty_install_target(&game_root, &draft)?;
  }
  let marker_path = staging_root.join(MARKER_FILE_NAME);
  let staging_has_marker = path_occupied(&marker_path)?;
  if !staging_has_marker {
    ensure_install_space(plan, &game_root)?;
  }
  create_exclusive_staging(&staging_root, &draft)?;
  let assembly_total_bytes = plan.assets.iter().try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "组装资源总大小溢出".to_string())
  })?;
  let assembly_completed_count = journal.completed_asset_cursor.min(plan.assets.len());
  let assembly_completed_bytes = plan.assets[..assembly_completed_count]
    .iter()
    .fold(0_u64, |total, asset| total.saturating_add(asset.size));
  journal.update_assembly_progress(
    assembly_completed_count,
    plan.assets.len(),
    assembly_completed_bytes,
    assembly_total_bytes,
    None,
  );
  journal.commit_completed_count = 0;
  journal.commit_total_count = INSTALL_COMMIT_TOTAL_STEPS;
  journal.commit_current_step = Some("正在校验暂存目录".to_string());
  journal.verification_completed_count = 0;
  journal.verification_total_count = 0;
  journal.verification_completed_bytes = 0;
  journal.verification_total_bytes = 0;
  set_task_state(task_root, journal, PackageTaskState::Assembling, emit, timing)?;
  journal.current_file = Some(if assembly_completed_count == plan.assets.len() {
    "准备校验安装内容".to_string()
  } else {
    "组装资源文件".to_string()
  });
  journal.touch();
  persist_install_journal(task_root, journal, timing)?;
  emit(journal);
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::Assembling)?;
  let (marker, sdk_files) = if staging_has_marker {
    let marker = read_marker(&staging_root)?;
    validate_marker_identity(&marker, plan, overlay, &draft, &game_root)?;
    let evidence = if marker.evidence_sha256.is_empty() {
      BTreeMap::new()
    } else {
      let evidence = super::evidence::load_evidence_set(task_root, plan)?;
      if super::evidence::evidence_digest(&evidence) == marker.evidence_sha256 {
        evidence
      } else {
        // 证据缺失或失配：回退全量内容校验，不允许仅凭证据快速路径。
        BTreeMap::new()
      }
    };
    let sdk_files = overlay
      .sdk
      .as_ref()
      .map(|sdk| collect_published_sdk_files_with_evidence(&staging_root, sdk, &evidence))
      .transpose()?
      .unwrap_or_default();
    let files = if evidence.is_empty() {
      verify_install_tree_timed(
        plan,
        overlay,
        &staging_root,
        &sdk_files,
        timing,
        journal,
        emit,
        "校验暂存目录",
      )?
    } else {
      verify_install_tree_parallel_timed(
        plan,
        overlay,
        &staging_root,
        &sdk_files,
        &evidence,
        task_root,
        false,
        timing,
        journal,
        emit,
        "校验暂存目录",
      )?
    };
    if tree_digest(&files) != marker.tree_digest {
      return Err("安装暂存目录摘要不一致，需要恢复".to_string());
    }
    journal.update_assembly_progress(
      plan.assets.len(),
      plan.assets.len(),
      assembly_total_bytes,
      assembly_total_bytes,
      Some("校验安装内容".to_string()),
    );
    journal.touch();
    emit(journal);
    (marker, sdk_files)
  } else {
    {
      let spool_root = Path::new(&overlay.spool_root);
      let shared_cache_root = task_root.join("cache/chunks");
      let start_cursor = journal.completed_asset_cursor.min(plan.assets.len());
      let download_index = assembler::FullInstallDownloadIndex::from_plan(plan)?;
      // 已组装文件的逐文件校验统一由随后的并行「校验暂存目录」承担：证据完整时只做
      // 身份核对，证据缺失/失配时并行回退内容 hash 并补写证据；此处不再单独复检。
      for index in start_cursor..plan.assets.len() {
        check_canceled(canceled)?;
        assembler::assemble_full_install_asset_with_timing_observer(
          plan,
          &download_index,
          index,
          &staging_root,
          &shared_cache_root,
          spool_root,
          canceled,
          &mut timing.assembly,
        )?;
        super::evidence::capture_and_persist_asset_evidence(task_root, plan, index, &staging_root)?;
        let completed = index + 1;
        let completed_bytes = plan.assets[..completed].iter().map(|asset| asset.size).sum();
        journal.update_assembly_progress(
          completed,
          plan.assets.len(),
          completed_bytes,
          assembly_total_bytes,
          Some(plan.assets[index].name.clone()),
        );
        journal.completed_asset_cursor = completed;
        journal.assembly_completed_bytes_total = completed_bytes;
        journal.spool_bytes = spool_bytes(spool_root)?;
        journal.touch();
        persist_install_journal(task_root, journal, timing)?;
        let released =
          release_consumed_spool_chunks(plan, completed, spool_root, &shared_cache_root)?;
        journal.released_bytes = journal.released_bytes.saturating_add(released);
        journal.spool_bytes = spool_bytes(spool_root)?;
        journal.touch();
        persist_install_progress(task_root, journal, timing)?;
        emit(journal);
      }
    }
    check_canceled(canceled)?;
    journal.current_file = Some("准备安装附加文件".to_string());
    journal.touch();
    emit(journal);
    let sdk_files = if let Some(sdk) = overlay.sdk.as_ref() {
      extract_and_verify_sdk(
        plan,
        task_root,
        &staging_root,
        &PathBuf::from(&overlay.spool_root),
        sdk,
        journal,
        emit,
      )?
    } else {
      if draft.scheme != SchemeId::CnOfficial {
        return Err("B 服安装计划缺少渠道 SDK".to_string());
      }
      BTreeMap::new()
    };
    journal.commit_current_step = Some("写入安装配置".to_string());
    journal.current_file = journal.commit_current_step.clone();
    journal.touch();
    emit(journal);
    let config_actual = write_config(&staging_root, &overlay.config, &overlay.config_sha256)?;
    journal.commit_current_step = Some("安装配置已提交".to_string());
    journal.current_file = journal.commit_current_step.clone();
    journal.touch();
    emit(journal);
    super::evidence::capture_and_persist_additional_evidence(
      task_root,
      plan,
      &staging_root,
      "config.ini",
      config_actual.0,
      &config_actual.1,
    )?;
    let evidence = super::evidence::load_evidence_set(task_root, plan)?;
    let expected = verify_install_tree_parallel_timed(
      plan,
      overlay,
      &staging_root,
      &sdk_files,
      &evidence,
      task_root,
      true,
      timing,
      journal,
      emit,
      "校验暂存目录",
    )?;
    let expected_tree_digest = tree_digest(&expected);
    // 校验可能补写缺失的证据，重新加载后再计算摘要写入 marker。
    let healed_evidence = super::evidence::load_evidence_set(task_root, plan)?;
    let evidence_sha256 = super::evidence::evidence_digest(&healed_evidence);
    let (directory_volume_serial, directory_file_id) = directory_identity(&staging_root)?;
    let marker = InstallMarker {
      schema_version: MARKER_SCHEMA_VERSION,
      plan_id: plan.plan_id.clone(),
      install_id: plan.installation_id.clone(),
      marker_nonce: draft.marker_nonce.clone(),
      game_root: path_text(&game_root),
      target_path_sha256: overlay.target_path_sha256.clone(),
      scheme: draft.scheme,
      directory_volume_serial,
      directory_file_id,
      manifest_digest: plan.manifest_digest.clone(),
      tree_digest: expected_tree_digest,
      config_sha256: overlay.config_sha256.clone(),
      evidence_sha256,
    };
    write_marker(&staging_root, &marker)?;
    (marker, sdk_files)
  };
  update_commit_progress(journal, 1, "暂存目录校验完成", emit);
  update_commit_progress(journal, 2, "提交准备完成", emit);
  set_task_state(task_root, journal, PackageTaskState::CommitPrepared, emit, timing)?;
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::CommitPrepared)?;
  check_canceled(canceled)?;
  ensure_publish_facts(plan, overlay, &draft, &staging_root, &game_root, &marker)?;
  update_commit_progress(journal, 3, "发布前检查完成", emit);
  set_task_state(task_root, journal, PackageTaskState::PublishPending, emit, timing)?;
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::PublishPending)?;
  check_canceled(canceled)?;
  prepare_publish_target(&game_root, &draft)?;
  publish_directory(&staging_root, &game_root)?;
  update_commit_progress(journal, 4, "游戏目录已发布", emit);
  set_task_state(task_root, journal, PackageTaskState::Published, emit, timing)?;
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::Published)?;
  let post_publish_started_at = Instant::now();
  let post_publish_result = (|| {
    verify_marker(&game_root, &marker)?;
    if directory_identity(&game_root)? != (marker.directory_volume_serial, marker.directory_file_id)
    {
      return Err("发布后的游戏目录身份发生变化，需要恢复".to_string());
    }
    let published_files = if marker.evidence_sha256.is_empty() {
      verify_install_tree_with_journal_progress(
        plan,
        overlay,
        &game_root,
        &sdk_files,
        journal,
        emit,
        "复检最终目录",
      )?
    } else {
      let evidence = super::evidence::load_evidence_set(task_root, plan)?;
      if super::evidence::evidence_digest(&evidence) != marker.evidence_sha256 {
        verify_install_tree_with_journal_progress(
          plan,
          overlay,
          &game_root,
          &sdk_files,
          journal,
          emit,
          "复检最终目录",
        )?
      } else {
        verify_install_tree_parallel_with_journal_progress(
          plan,
          overlay,
          &game_root,
          &sdk_files,
          &evidence,
          task_root,
          false,
          journal,
          emit,
          "复检最终目录",
        )?
      }
    };
    if tree_digest(&published_files) != marker.tree_digest {
      return Err("发布后的游戏树摘要不一致".to_string());
    }
    let installation = inspect_executable(&overlay.expected_executable, machine_uid)?;
    if installation.id != plan.installation_id
      || installation.scheme_id != Some(draft.scheme)
      || installation.version.as_deref() != Some(plan.target_tag.as_str())
      || !sdk_is_consistent(draft.scheme, installation.has_channel_sdk)
    {
      return Err("发布后的游戏安装复验不通过".to_string());
    }
    Ok(installation)
  })();
  timing.record_post_publish(post_publish_started_at.elapsed());
  let installation = post_publish_result?;
  update_commit_progress(journal, 5, "最终目录复检完成", emit);
  set_task_state(task_root, journal, PackageTaskState::Verified, emit, timing)?;
  journal.commit_current_step = Some("正在登记游戏安装".to_string());
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::Verified)?;
  set_task_state(task_root, journal, PackageTaskState::RegistrationPending, emit, timing)?;
  set_draft_state(task_root, &draft.draft_id, InstallDraftState::RegistrationPending)?;
  Ok(installation)
}

pub(crate) fn prepare_install_assembly(
  plan: &PersistedPlan,
  task_root: &Path,
) -> Result<PathBuf, String> {
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let draft_id = find_draft_id(task_root, &plan.installation_id)?;
  let draft = load_draft(task_root, &draft_id)?;
  validate_plan_draft(plan, overlay, &draft)?;
  let game_root = PathBuf::from(&overlay.game_root);
  if path_occupied(&game_root)? {
    validate_empty_install_target(&game_root, &draft)?;
  }
  let staging_root = PathBuf::from(&overlay.staging_root);
  if path_occupied(&staging_root.join(MARKER_FILE_NAME))? {
    return Err("安装暂存目录已经进入发布边界，请使用恢复入口".to_string());
  }
  create_exclusive_staging(&staging_root, &draft)?;
  Ok(staging_root)
}

pub(crate) async fn register_installation(
  pool: &SqlitePool,
  installation: &GameInstallation,
) -> Result<(), String> {
  let audio_languages = serde_json::to_string(&installation.audio_languages)
    .map_err(|error| format!("序列化安装语音包失败：{error}"))?;
  let mut transaction =
    pool.begin().await.map_err(|error| format!("开始安装登记事务失败：{error}"))?;
  sqlx::query("UPDATE GameInstallation SET isChosen = 0 WHERE isChosen = 1")
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("清理当前安装失败：{error}"))?;
  sqlx::query(
    "INSERT INTO GameInstallation
       (id, executablePath, rootPath, preferredScheme, audioLanguages, isChosen, lastSeen)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       executablePath = excluded.executablePath,
       rootPath = excluded.rootPath,
       preferredScheme = excluded.preferredScheme,
       audioLanguages = excluded.audioLanguages,
       isChosen = 1,
       lastSeen = excluded.lastSeen",
  )
  .bind(&installation.id)
  .bind(&installation.executable_path)
  .bind(&installation.root_path)
  .bind(installation.scheme_id.map(scheme_id_key))
  .bind(audio_languages)
  .bind(&installation.last_seen)
  .execute(&mut *transaction)
  .await
  .map_err(|error| format!("登记游戏安装失败：{error}"))?;
  transaction.commit().await.map_err(|error| format!("提交安装登记事务失败：{error}"))
}

pub(crate) fn verify_published_installation(
  task_root: &Path,
  plan: &PersistedPlan,
  machine_uid: &str,
) -> Result<GameInstallation, String> {
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let draft_id = find_recovery_draft_id(task_root, &plan.installation_id)?;
  let draft = load_draft(task_root, &draft_id)?;
  validate_plan_draft(plan, overlay, &draft)?;
  let game_root = PathBuf::from(&overlay.game_root);
  if path_occupied(&PathBuf::from(&overlay.staging_root))? {
    return Err("安装暂存目录与最终目录同时存在，需要恢复".to_string());
  }
  let marker = read_marker(&game_root)?;
  validate_marker_identity(&marker, plan, overlay, &draft, &game_root)?;
  if directory_identity(&game_root)? != (marker.directory_volume_serial, marker.directory_file_id) {
    return Err("发布后的游戏目录身份不匹配".to_string());
  }
  let evidence = if marker.evidence_sha256.is_empty() {
    BTreeMap::new()
  } else {
    let evidence = super::evidence::load_evidence_set(task_root, plan)?;
    if super::evidence::evidence_digest(&evidence) == marker.evidence_sha256 {
      evidence
    } else {
      // 证据缺失或失配：回退全量内容校验。
      BTreeMap::new()
    }
  };
  let sdk_files = overlay
    .sdk
    .as_ref()
    .map(|sdk| collect_published_sdk_files_with_evidence(&game_root, sdk, &evidence))
    .transpose()?
    .unwrap_or_default();
  let files = if evidence.is_empty() {
    verify_install_tree(plan, overlay, &game_root, &sdk_files)?
  } else {
    verify_install_tree_parallel_with_progress(
      plan,
      overlay,
      &game_root,
      &sdk_files,
      &evidence,
      task_root,
      false,
      super::package::default_concurrency(),
      &mut |_, _, _, _| {},
    )?
  };
  if tree_digest(&files) != marker.tree_digest {
    return Err("发布后的游戏树摘要不一致".to_string());
  }
  let installation = inspect_executable(&overlay.expected_executable, machine_uid)?;
  if installation.id != plan.installation_id
    || installation.scheme_id != Some(draft.scheme)
    || installation.version.as_deref() != Some(plan.target_tag.as_str())
    || !sdk_is_consistent(draft.scheme, installation.has_channel_sdk)
  {
    return Err("发布后的游戏安装复验不通过".to_string());
  }
  Ok(installation)
}

/// 判断最终目录是否已经越过发布边界，避免把用户预先创建的空目录当成已发布安装。
pub(crate) fn has_published_installation(draft: &InstallDraft) -> Result<bool, String> {
  let game_root = Path::new(&draft.game_root);
  let published_state = matches!(
    draft.state,
    InstallDraftState::Published
      | InstallDraftState::Verified
      | InstallDraftState::RegistrationPending
      | InstallDraftState::Completed
  );
  if !path_occupied(game_root)? {
    if published_state {
      return Err("安装草稿显示最终目录已发布，但目录不存在，需要人工恢复".to_string());
    }
    return Ok(false);
  }

  if path_occupied(&game_root.join(MARKER_FILE_NAME))? {
    return Ok(true);
  }
  if is_directory_empty(game_root)? {
    if published_state {
      return Err("已发布的最终游戏目录缺少安装标记，需要人工恢复".to_string());
    }
    return Ok(false);
  }
  Err("最终游戏目录缺少安装标记，需要人工恢复".to_string())
}

pub(crate) fn cancel_draft(
  task_root: &Path,
  draft_id: &str,
) -> Result<InstallDraftSummary, String> {
  let lock = draft_mutation_lock(&draft_lock_key(task_root, draft_id))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  let draft = load_draft(task_root, draft_id)?;
  if matches!(
    draft.state,
    InstallDraftState::Published
      | InstallDraftState::Verified
      | InstallDraftState::RegistrationPending
      | InstallDraftState::Completed
  ) {
    return Err("安装已经发布，不能取消或删除最终目录".to_string());
  }
  let staging = PathBuf::from(&draft.staging_root);
  if path_occupied(&staging)? {
    remove_owned_staging(&staging, &draft)?;
  }
  let spool = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-spool-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  if path_occupied(&spool)? {
    if directory_identity(spool.parent().ok_or_else(|| "任务 spool 缺少父目录".to_string())?)?
      != (draft.library_volume_serial, draft.library_file_id)
    {
      return Err("任务 spool 身份不匹配，拒绝删除".to_string());
    }
    validate_no_links(&spool)?;
    fs::remove_dir_all(spool).map_err(|error| format!("清理安装任务 spool 失败：{error}"))?;
  }
  let draft = set_draft_state_unlocked(task_root, draft_id, InstallDraftState::Canceled)?;
  Ok(draft.summary())
}

/// 放弃已经发布但尚未完成登记的安装任务；只清理草稿状态，不删除最终游戏目录。
pub(crate) fn abandon_published_draft(
  task_root: &Path,
  draft_id: &str,
) -> Result<InstallDraftSummary, String> {
  let lock = draft_mutation_lock(&draft_lock_key(task_root, draft_id))?;
  let _guard = lock.lock().map_err(|_| "安装草稿锁已损坏".to_string())?;
  let draft = load_draft(task_root, draft_id)?;
  if draft.state == InstallDraftState::Canceled {
    return Err("安装草稿已经结束，不能重复放弃".to_string());
  }
  if !path_occupied(Path::new(&draft.game_root))? {
    return Err("最终游戏目录不存在，不能放弃已发布安装".to_string());
  }
  if path_occupied(Path::new(&draft.staging_root))? {
    return Err("安装暂存目录仍存在，不能放弃已发布安装".to_string());
  }
  if draft.state == InstallDraftState::Completed {
    return Ok(draft.summary());
  }
  let draft = set_draft_state_unlocked(task_root, draft_id, InstallDraftState::Canceled)?;
  Ok(draft.summary())
}

impl InstallDraft {
  fn summary(&self) -> InstallDraftSummary {
    InstallDraftSummary {
      draft_id: self.draft_id.clone(),
      install_id: self.install_id.clone(),
      install_root: self.game_root.clone(),
      scheme: self.scheme,
      audio_languages: self.audio_languages.clone(),
      state: self.state,
      plan_id: self.plan_id.clone(),
      target_tag: self.target_tag.clone(),
    }
  }
}

fn validate_install_root(input: &str, protected_roots: &[PathBuf]) -> Result<PathBuf, String> {
  if input.trim().is_empty() || input.contains('\0') {
    return Err("安装位置无效".to_string());
  }
  let requested = PathBuf::from(input);
  if !requested.is_absolute() {
    return Err("安装位置必须是绝对路径".to_string());
  }
  #[cfg(target_os = "windows")]
  super::installation::validate_windows_path(&requested)?;
  let metadata =
    fs::symlink_metadata(&requested).map_err(|error| format!("读取安装位置失败：{error}"))?;
  if !metadata.is_dir() || metadata.file_type().is_symlink() {
    return Err("安装位置必须是普通目录".to_string());
  }
  let library_root =
    fs::canonicalize(&requested).map_err(|error| format!("解析安装位置失败：{error}"))?;
  #[cfg(target_os = "windows")]
  let library_root =
    super::installation::normalize_windows_local_path(library_root.to_string_lossy().as_ref())?;
  #[cfg(target_os = "windows")]
  {
    if library_root.components().count() <= 2 {
      return Err("不能把磁盘根目录作为安装目录".to_string());
    }
    let lower = library_root.to_string_lossy().to_ascii_lowercase();
    for variable in ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "WINDIR"] {
      if let Ok(value) = std::env::var(variable) {
        let path = PathBuf::from(value);
        if path.is_absolute() && is_related(&library_root, &path) {
          return Err("不能把系统或程序目录作为安装目录".to_string());
        }
      }
    }
    if lower.contains("\\windows\\") || lower.ends_with("\\windows") {
      return Err("不能把系统目录作为安装目录".to_string());
    }
  }
  if protected_roots.iter().any(|root| is_related(&library_root, root)) {
    return Err("安装目录不能与应用数据、缓存或已登记游戏目录重叠".to_string());
  }
  Ok(library_root)
}

fn is_directory_empty(path: &Path) -> Result<bool, String> {
  let mut entries = fs::read_dir(path).map_err(|error| format!("读取安装目录失败：{error}"))?;
  match entries.next() {
    None => Ok(true),
    Some(Ok(_)) => Ok(false),
    Some(Err(error)) => Err(format!("读取安装目录失败：{error}")),
  }
}

fn validate_draft(draft: &InstallDraft, draft_id: &str) -> Result<(), String> {
  if draft.schema_version != DRAFT_SCHEMA_VERSION {
    return Err(format!(
      "安装草稿版本不兼容：文件版本为 {}，当前版本为 {DRAFT_SCHEMA_VERSION}",
      draft.schema_version
    ));
  }
  let library_root = Path::new(&draft.library_root);
  let game_root = Path::new(&draft.game_root);
  let staging_root = Path::new(&draft.staging_root);
  let Some(expected_library_root) = game_root.parent() else {
    return Err("安装草稿字段无效".to_string());
  };
  let expected_executable = game_root.join("YuanShen.exe");
  let nonce_fragment = draft.marker_nonce.get(..12).unwrap_or_default();
  let expected_staging_root =
    library_root.join(format!(".teyvatguide-install-{}-{}", draft.draft_id, nonce_fragment));
  let plan_fields_valid = match draft.state {
    InstallDraftState::Created => {
      draft.plan_id.is_none() && draft.target_tag.is_none() && draft.manifest_digest.is_none()
    }
    InstallDraftState::Canceled => {
      (draft.plan_id.is_none() && draft.target_tag.is_none() && draft.manifest_digest.is_none())
        || (draft.plan_id.is_some()
          && draft.target_tag.is_some()
          && draft.manifest_digest.is_some())
    }
    _ => draft.plan_id.is_some() && draft.target_tag.is_some() && draft.manifest_digest.is_some(),
  };
  if draft.draft_id != draft_id
    || Uuid::parse_str(&draft.draft_id).is_err()
    || draft.install_id.is_empty()
    || draft.marker_nonce.len() != 64
    || !draft.marker_nonce.bytes().all(|byte| byte.is_ascii_hexdigit())
    || draft.audio_languages.is_empty()
    || normalize_audio_languages(draft.audio_languages.clone()).is_err()
    || !library_root.is_absolute()
    || !is_stable_library_root(library_root)
    || !same_path(library_root, expected_library_root)
    || !same_path(Path::new(&draft.expected_executable), &expected_executable)
    || !same_path(staging_root, &expected_staging_root)
    || !plan_fields_valid
    || draft.manifest_digest.as_deref().is_some_and(|value| !is_sha256(value))
    || draft.sdk_md5.as_deref().is_some_and(|value| !is_md5_value(value))
  {
    return Err("安装草稿字段无效".to_string());
  }
  Ok(())
}

fn is_stable_library_root(path: &Path) -> bool {
  let Ok(metadata) = fs::symlink_metadata(path) else {
    return false;
  };
  if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_dir() {
    return false;
  }
  #[cfg(target_os = "windows")]
  if super::installation::validate_windows_path(path).is_err() {
    return false;
  }
  let Ok(canonical) = fs::canonicalize(path) else {
    return false;
  };
  #[cfg(target_os = "windows")]
  let Ok(canonical) =
    super::installation::normalize_windows_local_path(canonical.to_string_lossy().as_ref())
  else {
    return false;
  };
  same_path(&canonical, path)
}

fn validate_plan_draft(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  draft: &InstallDraft,
) -> Result<(), String> {
  if draft.install_id != plan.installation_id
    || draft.plan_id.as_deref() != Some(plan.plan_id.as_str())
    || !same_path(Path::new(&draft.library_root), Path::new(&overlay.library_root))
    || !same_path(Path::new(&draft.game_root), Path::new(&overlay.game_root))
    || !same_path(Path::new(&draft.staging_root), Path::new(&overlay.staging_root))
    || !same_path(
      Path::new(&overlay.spool_root),
      &Path::new(&draft.library_root).join(format!(
        ".teyvatguide-spool-{}-{}",
        draft.draft_id,
        &draft.marker_nonce[..12]
      )),
    )
    || !same_path(Path::new(&draft.expected_executable), Path::new(&overlay.expected_executable))
    || draft.marker_nonce != overlay.marker_nonce
    || draft.library_volume_serial != overlay.library_volume_serial
    || draft.library_file_id != overlay.library_file_id
    || draft.target_volume_serial != overlay.target_volume_serial
    || draft.target_file_id != overlay.target_file_id
    || draft.manifest_digest.as_deref() != Some(plan.manifest_digest.as_str())
    || draft.sdk_version.as_deref() != overlay.sdk.as_ref().map(|sdk| sdk.version.as_str())
    || draft.sdk_md5.as_deref() != overlay.sdk.as_ref().map(|sdk| sdk.md5.as_str())
    || overlay.target_path_sha256 != path_digest(Path::new(&overlay.game_root))
    || draft.scheme != plan.source_scheme
    || plan.target_scheme != draft.scheme
    || draft.target_tag.as_deref() != Some(plan.target_tag.as_str())
    || draft.audio_languages != overlay.audio_languages
    || overlay.config_sha256 != sha256_bytes(overlay.config.as_bytes())
    || !sdk_is_consistent(draft.scheme, overlay.sdk.is_some())
  {
    return Err("安装草稿与安装计划不匹配".to_string());
  }
  if overlay.channel != canonical_channel(draft.scheme).0
    || overlay.sub_channel != canonical_channel(draft.scheme).1
    || overlay.config != build_config(draft.scheme, &plan.target_tag)
  {
    return Err("安装渠道配置与计划不匹配".to_string());
  }
  Ok(())
}

pub(crate) fn prepare_install_spool(
  task_root: &Path,
  draft_id: &str,
  overlay: &InstallOverlay,
) -> Result<PathBuf, String> {
  let draft = load_draft(task_root, draft_id)?;
  let expected = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-spool-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  if !same_path(Path::new(&overlay.spool_root), &expected)
    || directory_identity(expected.parent().ok_or_else(|| "任务 spool 缺少父目录".to_string())?)?
      != (draft.library_volume_serial, draft.library_file_id)
  {
    return Err("安装任务 spool 身份不匹配".to_string());
  }
  fs::create_dir_all(&expected).map_err(|error| format!("创建安装任务 spool 失败：{error}"))?;
  let metadata =
    fs::symlink_metadata(&expected).map_err(|error| format!("读取安装任务 spool 失败：{error}"))?;
  if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_dir() {
    return Err("安装任务 spool 不是安全的普通目录".to_string());
  }
  Ok(expected)
}

pub(crate) fn cleanup_install_spool(
  task_root: &Path,
  draft_id: &str,
  overlay: &InstallOverlay,
) -> Result<(), String> {
  let draft = load_draft(task_root, draft_id)?;
  let expected = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-spool-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  if !same_path(Path::new(&overlay.spool_root), &expected) {
    return Err("安装任务 spool 身份不匹配".to_string());
  }
  if !path_occupied(&expected)? {
    return Ok(());
  }
  let path = expected;
  validate_no_links(&path)?;
  fs::remove_dir_all(path).map_err(|error| format!("清理安装任务 spool 失败：{error}"))
}

fn create_exclusive_staging(path: &Path, draft: &InstallDraft) -> Result<(), String> {
  if path_occupied(path)? {
    let metadata =
      fs::symlink_metadata(path).map_err(|error| format!("读取安装暂存目录失败：{error}"))?;
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_dir() {
      return Err("安装暂存目录不是安全的普通目录".to_string());
    }
    if !matches!(
      draft.state,
      InstallDraftState::Planned
        | InstallDraftState::Downloading
        | InstallDraftState::ReadyToApply
        | InstallDraftState::Assembling
        | InstallDraftState::CommitPrepared
        | InstallDraftState::PublishPending
    ) {
      return Err("安装暂存目录已存在，需要执行恢复".to_string());
    }
    let parent = path.parent().ok_or_else(|| "安装暂存目录缺少父目录".to_string())?;
    if directory_identity(parent)? != (draft.library_volume_serial, draft.library_file_id) {
      return Err("安装暂存目录父目录身份不匹配".to_string());
    }
    return Ok(());
  }
  let parent = path.parent().ok_or_else(|| "安装暂存目录缺少父目录".to_string())?;
  if directory_identity(parent)? != (draft.library_volume_serial, draft.library_file_id) {
    return Err("安装暂存目录父目录身份不匹配".to_string());
  }
  fs::create_dir(path).map_err(|error| format!("创建安装暂存目录失败：{error}"))?;
  if !same_path(path, Path::new(&draft.staging_root))
    || directory_identity(parent)? != (draft.library_volume_serial, draft.library_file_id)
  {
    return Err("安装暂存目录身份不匹配".to_string());
  }
  Ok(())
}

/// 原子写入 `config.ini` 并返回实际大小与 MD5，供逐文件证据使用。
///
/// 已存在且内容一致时视为幂等成功；内容不一致则失败，不允许覆盖。
fn write_config(
  staging_root: &Path,
  config: &str,
  expected_sha256: &str,
) -> Result<(u64, String), String> {
  if sha256_bytes(config.as_bytes()) != expected_sha256 {
    return Err("安装配置摘要不匹配".to_string());
  }
  let path = prepare_manifest_output_file(staging_root, "config.ini")?;
  if path.exists() {
    let existing =
      fs::read_to_string(&path).map_err(|error| format!("读取安装配置失败：{error}"))?;
    if existing != config {
      return Err("安装暂存配置已经被修改".to_string());
    }
    return file_size_md5(&path);
  }
  let partial = partial_for(&path);
  remove_stale_partial_file(&partial)?;
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&partial)
    .map_err(|error| format!("创建安装配置临时文件失败：{error}"))?;
  let result = (|| {
    file.write_all(config.as_bytes()).map_err(|error| format!("写入安装配置失败：{error}"))?;
    file.sync_all().map_err(|error| format!("同步安装配置失败：{error}"))?;
    drop(file);
    let actual = file_size_md5(&partial)?;
    if actual.0 != config.len() as u64 {
      return Err("安装配置长度校验失败".to_string());
    }
    fs::rename(&partial, &path).map_err(|error| format!("提交安装配置失败：{error}"))?;
    Ok(actual)
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn partial_for(path: &Path) -> PathBuf {
  let mut name = path.file_name().unwrap_or_default().to_os_string();
  name.push(".part");
  path.with_file_name(name)
}

fn remove_stale_partial_file(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理过期临时文件失败：{error}")),
  }
}

fn extract_and_verify_sdk(
  plan: &PersistedPlan,
  task_root: &Path,
  staging_root: &Path,
  spool_root: &Path,
  sdk: &super::planner::InstallSdk,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let shared_path = task_root.join("cache/chunks").join(&sdk.cache_key);
  let spool_path = spool_root.join(&sdk.cache_key);
  let cache_path = match file_size_md5(&shared_path) {
    Ok((size, md5)) if size == sdk.size && md5.eq_ignore_ascii_case(&sdk.md5) => shared_path,
    _ => spool_path,
  };
  let (size, md5) = file_size_md5(&cache_path)?;
  if size != sdk.size || !md5.eq_ignore_ascii_case(&sdk.md5) {
    return Err("渠道 SDK 缓存完整性校验失败".to_string());
  }
  let file = File::open(&cache_path).map_err(|error| format!("打开渠道 SDK 失败：{error}"))?;
  let mut archive = ZipArchive::new(file).map_err(|error| format!("解析渠道 SDK 失败：{error}"))?;
  if archive.len() > MAX_SDK_ZIP_ENTRIES {
    return Err("渠道 SDK 条目数超过安全上限".to_string());
  }
  let version_name = normalize_manifest_path(&sdk.pkg_version_file_name)?;
  let mut total = 0_u64;
  let mut files = BTreeMap::new();
  let mut last_emit = Instant::now();
  let total_entries = archive.len();
  for index in 0..archive.len() {
    let mut entry =
      archive.by_index(index).map_err(|error| format!("读取渠道 SDK 失败：{error}"))?;
    if entry.is_dir() {
      continue;
    }
    if entry.encrypted() {
      return Err("渠道 SDK 不能包含加密条目".to_string());
    }
    if entry.unix_mode().is_some_and(|mode| mode & 0o170000 == 0o120000) {
      return Err("渠道 SDK 不能包含符号链接".to_string());
    }
    let name = normalize_manifest_path(entry.name())?;
    if name == "config.ini" || name == MARKER_FILE_NAME || files.contains_key(&name) {
      return Err("渠道 SDK 包含受保护或重复路径".to_string());
    }
    let entry_size = entry.size();
    total = total.checked_add(entry_size).ok_or_else(|| "渠道 SDK 解压大小溢出".to_string())?;
    let decompressed_limit =
      sdk.decompressed_size.saturating_mul(2).min(MAX_SDK_DECOMPRESSED_BYTES);
    if total > decompressed_limit {
      return Err("渠道 SDK 解压大小超过安全上限".to_string());
    }
    journal.commit_current_step =
      Some(format!("解压渠道 SDK：{}/{} 个条目", index + 1, total_entries));
    journal.current_file = Some(name.clone());
    journal.touch();
    if last_emit.elapsed() >= Duration::from_millis(250) {
      emit(journal);
      last_emit = Instant::now();
    }
    let target = prepare_manifest_output_file(staging_root, &name)?;
    if path_occupied(&target)? {
      let metadata =
        fs::symlink_metadata(&target).map_err(|error| format!("读取已有 SDK 文件失败：{error}"))?;
      if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("SDK 解压目标不是安全的普通文件".to_string());
      }
      fs::remove_file(&target).map_err(|error| format!("清理已有 SDK 文件失败：{error}"))?;
    }
    let partial = partial_for(&target);
    remove_stale_partial_file(&partial)?;
    let mut output = OpenOptions::new()
      .create_new(true)
      .write(true)
      .open(&partial)
      .map_err(|error| format!("创建渠道 SDK 临时文件失败：{error}"))?;
    let result = (|| {
      std::io::copy(&mut entry, &mut output)
        .map_err(|error| format!("解压渠道 SDK 失败：{error}"))?;
      output.sync_all().map_err(|error| format!("同步渠道 SDK 失败：{error}"))?;
      drop(output);
      let actual = file_size_md5(&partial)?;
      if actual.0 != entry_size {
        return Err("渠道 SDK 条目长度校验失败".to_string());
      }
      fs::rename(&partial, &target).map_err(|error| format!("提交渠道 SDK 文件失败：{error}"))?;
      files.insert(name.clone(), actual);
      Ok(())
    })();
    if result.is_err() {
      let _ = fs::remove_file(&partial);
    }
    result?;
  }
  let version_path = staging_root.join(&version_name);
  let metadata = fs::symlink_metadata(&version_path)
    .map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("sdk_pkg_version 不是普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_SDK_VERSION_BYTES {
    return Err("sdk_pkg_version 大小无效".to_string());
  }
  let text = fs::read_to_string(&version_path)
    .map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  let mut listed = HashSet::new();
  for line in text.lines().filter(|line| !line.trim().is_empty()) {
    let value: SdkVersionEntry =
      serde_json::from_str(line).map_err(|error| format!("解析 sdk_pkg_version 失败：{error}"))?;
    let name = normalize_manifest_path(&value.remote_name)?;
    if value.md5.len() != 32
      || !value.md5.bytes().all(|byte| byte.is_ascii_hexdigit())
      || !listed.insert(name.clone())
      || listed.len() > MAX_SDK_VERSION_FILES
    {
      return Err("sdk_pkg_version 内容无效".to_string());
    }
    let actual = files.get(&name).ok_or_else(|| format!("渠道 SDK 缺少文件：{name}"))?;
    if actual.0 != value.file_size || !actual.1.eq_ignore_ascii_case(&value.md5) {
      return Err(format!("渠道 SDK 文件与 sdk_pkg_version 不一致：{name}"));
    }
  }
  if listed.is_empty() {
    return Err("sdk_pkg_version 没有可安装文件".to_string());
  }
  let mut allowed = listed;
  allowed.insert(version_name);
  if allowed.len() != files.len() || files.keys().any(|name| !allowed.contains(name)) {
    return Err("渠道 SDK 包含未在 sdk_pkg_version 列出的文件".to_string());
  }
  journal.commit_current_step = Some("渠道 SDK 版本清单校验完成".to_string());
  journal.current_file = None;
  journal.touch();
  emit(journal);
  for (name, (size, md5)) in &files {
    super::evidence::capture_and_persist_additional_evidence(
      task_root,
      plan,
      staging_root,
      name,
      *size,
      md5,
    )?;
  }
  Ok(files)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SdkVersionEntry {
  remote_name: String,
  md5: String,
  file_size: u64,
}

fn collect_published_sdk_files_with_evidence(
  root: &Path,
  sdk: &super::planner::InstallSdk,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let version_name = normalize_manifest_path(&sdk.pkg_version_file_name)?;
  let path = root.join(&version_name);
  let metadata =
    fs::symlink_metadata(&path).map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("sdk_pkg_version 不是普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_SDK_VERSION_BYTES {
    return Err("sdk_pkg_version 大小无效".to_string());
  }
  let text =
    fs::read_to_string(&path).map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  let mut files = BTreeMap::new();
  let mut names = HashSet::new();
  for line in text.lines().filter(|line| !line.trim().is_empty()) {
    let value: SdkVersionEntry =
      serde_json::from_str(line).map_err(|error| format!("解析 sdk_pkg_version 失败：{error}"))?;
    let name = normalize_manifest_path(&value.remote_name)?;
    if value.md5.len() != 32
      || !value.md5.bytes().all(|byte| byte.is_ascii_hexdigit())
      || !names.insert(name.clone())
      || names.len() > MAX_SDK_VERSION_FILES
    {
      return Err("sdk_pkg_version 内容无效".to_string());
    }
    let actual = if evidence.is_empty() {
      None
    } else {
      let root_identity = directory_identity(root)?;
      trusted_file_value(root, root_identity, evidence, &name, value.file_size, &value.md5)?
    }
    .unwrap_or(file_size_md5(&root.join(&name))?);
    if actual.0 != value.file_size || !actual.1.eq_ignore_ascii_case(&value.md5) {
      return Err(format!("已发布 SDK 文件与 sdk_pkg_version 不一致：{name}"));
    }
    files.insert(name, actual);
  }
  if files.is_empty() {
    return Err("sdk_pkg_version 没有可安装文件".to_string());
  }
  let version_actual = if evidence.is_empty() {
    None
  } else {
    let root_identity = directory_identity(root)?;
    trusted_file_value(
      root,
      root_identity,
      evidence,
      &version_name,
      text.len() as u64,
      &md5_hex(text.as_bytes()),
    )?
  }
  .unwrap_or(file_size_md5(&root.join(&version_name))?);
  files.insert(version_name.clone(), version_actual);
  Ok(files)
}

fn verify_install_tree(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  verify_install_tree_with_evidence(plan, overlay, root, sdk_files, &BTreeMap::new())
}

fn verify_install_tree_with_evidence(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  verify_install_tree_with_evidence_and_progress(
    plan,
    overlay,
    root,
    sdk_files,
    evidence,
    &mut |_, _, _, _| {},
  )
}

fn install_verification_total_bytes(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  sdk_files: &BTreeMap<String, (u64, String)>,
) -> u64 {
  plan
    .inventory
    .iter()
    .fold(overlay.config.len() as u64, |total, file| total.saturating_add(file.size))
    .saturating_add(sdk_files.values().fold(0_u64, |total, (size, _)| total.saturating_add(*size)))
}

/// 轻量全树校验：证据可信任的文件只做身份/元数据核对，不再读取内容；证据缺失或失配时
/// 回退到单文件完整 hash。config 内容始终校验，SDK/config 同样优先复用证据。
fn verify_install_tree_with_evidence_and_progress(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  progress: &mut dyn FnMut(usize, usize, u64, u64),
) -> Result<BTreeMap<String, (u64, String)>, String> {
  validate_no_links(root)?;
  let root_identity = directory_identity(root)?;
  let total_count = plan.inventory.len().saturating_add(1).saturating_add(sdk_files.len());
  let total_bytes = install_verification_total_bytes(plan, overlay, sdk_files);
  let mut completed_count = 0_usize;
  let mut completed_bytes = 0_u64;
  let mut expected = BTreeMap::new();
  for file in &plan.inventory {
    let path = root.join(&file.name);
    let actual =
      trusted_file_value(root, root_identity, evidence, &file.name, file.size, &file.md5)?
        .unwrap_or(file_size_md5(&path)?);
    if actual.0 != file.size || !actual.1.eq_ignore_ascii_case(&file.md5) {
      return Err(format!("安装资源校验失败：{}", file.name));
    }
    expected.insert(file.name.clone(), actual);
    completed_count = completed_count.saturating_add(1);
    completed_bytes = completed_bytes.saturating_add(file.size).min(total_bytes);
    progress(completed_count, total_count, completed_bytes, total_bytes);
  }
  if !expected.contains_key("YuanShen.exe")
    || !expected.keys().any(|name| name.starts_with("YuanShen_Data/"))
  {
    return Err("安装资源缺少 YuanShen.exe 或 YuanShen_Data".to_string());
  }
  for language in &overlay.audio_languages {
    let marker = audio_marker(language).ok_or_else(|| format!("不支持的语音包：{language}"))?;
    if !expected.contains_key(marker) {
      return Err(format!("安装资源缺少语音包：{language}"));
    }
  }
  let config = root.join("config.ini");
  let config_bytes = fs::read(&config).map_err(|error| format!("读取安装配置失败：{error}"))?;
  if sha256_bytes(&config_bytes) != overlay.config_sha256 {
    return Err("安装配置校验失败".to_string());
  }
  let config_actual = trusted_file_value(
    root,
    root_identity,
    evidence,
    "config.ini",
    config_bytes.len() as u64,
    &md5_hex(&config_bytes),
  )?
  .unwrap_or(file_size_md5(&config)?);
  let config_completed_bytes = config_actual.0;
  expected.insert("config.ini".to_string(), config_actual);
  completed_count = completed_count.saturating_add(1);
  completed_bytes = completed_bytes.saturating_add(config_completed_bytes).min(total_bytes);
  progress(completed_count, total_count, completed_bytes, total_bytes);
  for (name, value) in sdk_files {
    let actual = trusted_file_value(root, root_identity, evidence, name, value.0, &value.1)?
      .unwrap_or(file_size_md5(&root.join(name))?);
    if &actual != value {
      return Err(format!("渠道 SDK 文件校验失败：{name}"));
    }
    let actual_bytes = actual.0;
    expected.insert(name.clone(), actual);
    completed_count = completed_count.saturating_add(1);
    completed_bytes = completed_bytes.saturating_add(actual_bytes).min(total_bytes);
    progress(completed_count, total_count, completed_bytes, total_bytes);
  }
  validate_tree_structure(root, &expected)?;
  progress(total_count, total_count, total_bytes, total_bytes);
  Ok(expected)
}

fn validate_tree_structure(
  root: &Path,
  expected: &BTreeMap<String, (u64, String)>,
) -> Result<(), String> {
  let mut allowed_directories = HashSet::new();
  for name in expected.keys() {
    let mut current = Path::new(name);
    while let Some(parent) = current.parent() {
      if parent.as_os_str().is_empty() {
        break;
      }
      allowed_directories.insert(parent.to_string_lossy().replace('\\', "/"));
      current = parent;
    }
  }
  let mut seen = HashSet::new();
  for entry in WalkDir::new(root).follow_links(false) {
    let entry = entry.map_err(|error| format!("扫描安装树失败：{error}"))?;
    let path = entry.path();
    if path == root {
      continue;
    }
    let metadata =
      fs::symlink_metadata(path).map_err(|error| format!("读取安装树失败：{error}"))?;
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
      return Err("安装树不能包含符号链接".to_string());
    }
    if metadata.is_dir() {
      let relative = path.strip_prefix(root).map_err(|_| "安装树相对路径计算失败".to_string())?;
      let name = normalize_manifest_path(&relative.to_string_lossy())?;
      if !allowed_directories.contains(&name) {
        return Err("安装树包含计划之外的目录".to_string());
      }
      continue;
    }
    if path.file_name().and_then(|name| name.to_str()) == Some(MARKER_FILE_NAME) {
      if path.parent() == Some(root) {
        continue;
      }
      return Err("安装树只能在根目录包含安装 marker".to_string());
    }
    let relative = path.strip_prefix(root).map_err(|_| "安装树相对路径计算失败".to_string())?;
    let name = normalize_manifest_path(&relative.to_string_lossy())?;
    if !expected.contains_key(&name) || !seen.insert(name) {
      return Err("安装树包含计划之外的文件".to_string());
    }
  }
  if seen.len() != expected.len() {
    return Err("安装树缺少计划文件".to_string());
  }
  Ok(())
}

/// 当证据绑定、暂存根身份与文件身份/元数据全部一致时返回可信值；否则返回 `None` 由调用方
/// 回退完整 hash。
fn trusted_file_value(
  root: &Path,
  root_identity: (u64, u64),
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  path: &str,
  expected_size: u64,
  expected_md5: &str,
) -> Result<Option<(u64, String)>, String> {
  let Some(entry) = evidence.get(path) else {
    return Ok(None);
  };
  if entry.path != path
    || entry.expected_size != expected_size
    || !entry.expected_md5.eq_ignore_ascii_case(expected_md5)
    || entry.staging_volume_serial != root_identity.0
    || entry.staging_file_id != root_identity.1
    || !super::evidence::file_matches_evidence(root, entry)?
  {
    return Ok(None);
  }
  Ok(Some((entry.actual_size, entry.actual_md5.clone())))
}

fn md5_hex(bytes: &[u8]) -> String {
  let mut hasher = Md5::new();
  hasher.update(bytes);
  format!("{:x}", hasher.finalize())
}

fn verify_install_tree_timed(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  timing: &mut InstallValidationTiming,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
  phase: &str,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let started_at = Instant::now();
  let result =
    verify_install_tree_with_journal_progress(plan, overlay, root, sdk_files, journal, emit, phase);
  timing.record_staging_tree(started_at.elapsed());
  result
}

fn verify_install_tree_with_journal_progress(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
  phase: &str,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  verify_install_tree_with_evidence_with_journal_progress(
    plan,
    overlay,
    root,
    sdk_files,
    &BTreeMap::new(),
    journal,
    emit,
    phase,
  )
}

/// 并行「校验暂存目录」：逐清单文件并发做证据核对/回退 hash，证据缺失时补写证据，
/// 主线程合并结果后执行 config/SDK 校验与全树结构扫描。
fn verify_install_tree_parallel_timed(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  task_root: &Path,
  heal_evidence: bool,
  timing: &mut InstallValidationTiming,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
  phase: &str,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let started_at = Instant::now();
  let result = verify_install_tree_parallel_with_journal_progress(
    plan,
    overlay,
    root,
    sdk_files,
    evidence,
    task_root,
    heal_evidence,
    journal,
    emit,
    phase,
  );
  timing.record_staging_tree(started_at.elapsed());
  result
}

fn verify_install_tree_parallel_with_journal_progress(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  task_root: &Path,
  heal_evidence: bool,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
  phase: &str,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let total_count = plan.inventory.len().saturating_add(1).saturating_add(sdk_files.len());
  let total_bytes = install_verification_total_bytes(plan, overlay, sdk_files);
  journal.verification_completed_count = 0;
  journal.verification_total_count = total_count;
  journal.verification_completed_bytes = 0;
  journal.verification_total_bytes = total_bytes;
  journal.commit_current_step = Some(format!("{phase}：扫描目录安全性"));
  journal.current_file = journal.commit_current_step.clone();
  journal.touch();
  emit(journal);
  let mut last_emit = Instant::now() - Duration::from_millis(250);
  let mut observer = |completed_count: usize,
                      observed_total_count: usize,
                      completed_bytes: u64,
                      observed_total_bytes: u64| {
    journal.verification_completed_count = completed_count.min(observed_total_count);
    journal.verification_total_count = observed_total_count;
    journal.verification_completed_bytes = completed_bytes.min(observed_total_bytes);
    journal.verification_total_bytes = observed_total_bytes;
    if completed_count == observed_total_count || last_emit.elapsed() >= Duration::from_millis(250)
    {
      journal.commit_current_step =
        Some(format!("{phase}：校验文件 {completed_count}/{observed_total_count}"));
      journal.current_file = journal.commit_current_step.clone();
      journal.touch();
      emit(journal);
      last_emit = Instant::now();
    }
  };
  let result = verify_install_tree_parallel_with_progress(
    plan,
    overlay,
    root,
    sdk_files,
    evidence,
    task_root,
    heal_evidence,
    super::package::default_concurrency(),
    &mut observer,
  );
  if result.is_ok() {
    journal.verification_completed_count = total_count;
    journal.verification_completed_bytes = total_bytes;
    journal.commit_current_step = Some(format!("{phase}：目录清单检查完成"));
    journal.current_file = journal.commit_current_step.clone();
    journal.touch();
    emit(journal);
  }
  result
}

fn verify_install_tree_parallel_with_progress(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  task_root: &Path,
  heal_evidence: bool,
  workers: usize,
  progress: &mut dyn FnMut(usize, usize, u64, u64),
) -> Result<BTreeMap<String, (u64, String)>, String> {
  validate_no_links(root)?;
  let root_identity = directory_identity(root)?;
  let total_count = plan.inventory.len().saturating_add(1).saturating_add(sdk_files.len());
  let total_bytes = install_verification_total_bytes(plan, overlay, sdk_files);
  let asset_index_by_name = plan
    .assets
    .iter()
    .enumerate()
    .map(|(index, asset)| (asset.name.as_str(), index))
    .collect::<HashMap<_, _>>();
  let mut expected = if plan.inventory.is_empty() {
    BTreeMap::new()
  } else {
    let inventory = &plan.inventory;
    let next_index = Arc::new(AtomicUsize::new(0));
    let completed_count = Arc::new(AtomicUsize::new(0));
    let completed_bytes = Arc::new(AtomicU64::new(0));
    let first_error = Arc::new(Mutex::new(None::<String>));
    let results = Arc::new(Mutex::new(Vec::<(String, (u64, String))>::new()));
    let worker_count = workers.clamp(1, 16);
    std::thread::scope(|scope| {
      let mut handles = Vec::new();
      for _ in 0..worker_count {
        let inventory = &*inventory;
        let plan = &*plan;
        let root = &*root;
        let evidence = &*evidence;
        let task_root = &*task_root;
        let asset_index_by_name = &asset_index_by_name;
        let next_index = Arc::clone(&next_index);
        let completed_count = Arc::clone(&completed_count);
        let completed_bytes = Arc::clone(&completed_bytes);
        let first_error = Arc::clone(&first_error);
        let results = Arc::clone(&results);
        handles.push(scope.spawn(move || {
          loop {
            if first_error.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).is_some() {
              break;
            }
            let index = next_index.fetch_add(1, Ordering::Relaxed);
            let Some(file) = inventory.get(index) else {
              break;
            };
            match verify_one_inventory_file_parallel(
              plan,
              root,
              root_identity,
              evidence,
              task_root,
              heal_evidence,
              &asset_index_by_name,
              file,
            ) {
              Ok(value) => {
                results.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).push(value);
                completed_count.fetch_add(1, Ordering::Relaxed);
                completed_bytes.fetch_add(file.size, Ordering::Relaxed);
              }
              Err(error) => {
                let mut slot = first_error.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                if slot.is_none() {
                  *slot = Some(error);
                }
                break;
              }
            }
          }
        }));
      }
      let mut last_emit = Instant::now();
      loop {
        if handles.iter().all(|handle| handle.is_finished()) {
          break;
        }
        std::thread::sleep(Duration::from_millis(50));
        if last_emit.elapsed() >= Duration::from_millis(250) {
          progress(
            completed_count.load(Ordering::Relaxed),
            total_count,
            completed_bytes.load(Ordering::Relaxed).min(total_bytes),
            total_bytes,
          );
          last_emit = Instant::now();
        }
      }
      progress(
        completed_count.load(Ordering::Relaxed),
        total_count,
        completed_bytes.load(Ordering::Relaxed).min(total_bytes),
        total_bytes,
      );
    });
    if let Some(error) = first_error.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).clone()
    {
      return Err(error);
    }
    let mut expected = BTreeMap::new();
    for (name, value) in results.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).drain(..) {
      expected.insert(name, value);
    }
    expected
  };
  let mut completed_bytes =
    expected.values().fold(0_u64, |total, (size, _)| total.saturating_add(*size));
  progress(expected.len(), total_count, completed_bytes.min(total_bytes), total_bytes);
  if !expected.contains_key("YuanShen.exe")
    || !expected.keys().any(|name| name.starts_with("YuanShen_Data/"))
  {
    return Err("安装资源缺少 YuanShen.exe 或 YuanShen_Data".to_string());
  }
  for language in &overlay.audio_languages {
    let marker = audio_marker(language).ok_or_else(|| format!("不支持的语音包：{language}"))?;
    if !expected.contains_key(marker) {
      return Err(format!("安装资源缺少语音包：{language}"));
    }
  }
  let config = root.join("config.ini");
  let config_bytes = fs::read(&config).map_err(|error| format!("读取安装配置失败：{error}"))?;
  if sha256_bytes(&config_bytes) != overlay.config_sha256 {
    return Err("安装配置校验失败".to_string());
  }
  let config_actual = match trusted_file_value(
    root,
    root_identity,
    evidence,
    "config.ini",
    config_bytes.len() as u64,
    &md5_hex(&config_bytes),
  )? {
    Some(value) => value,
    None => {
      let value = file_size_md5(&config)?;
      if heal_evidence {
        super::evidence::capture_and_persist_additional_evidence(
          task_root,
          plan,
          root,
          "config.ini",
          value.0,
          &value.1,
        )?;
      }
      value
    }
  };
  let config_completed_bytes = config_actual.0;
  expected.insert("config.ini".to_string(), config_actual);
  completed_bytes = completed_bytes.saturating_add(config_completed_bytes).min(total_bytes);
  progress(expected.len(), total_count, completed_bytes, total_bytes);
  for (name, value) in sdk_files {
    let actual = match trusted_file_value(root, root_identity, evidence, name, value.0, &value.1)? {
      Some(value) => value,
      None => {
        let actual = file_size_md5(&root.join(name))?;
        if heal_evidence {
          super::evidence::capture_and_persist_additional_evidence(
            task_root, plan, root, name, actual.0, &actual.1,
          )?;
        }
        actual
      }
    };
    if &actual != value {
      return Err(format!("渠道 SDK 文件校验失败：{name}"));
    }
    let actual_bytes = actual.0;
    expected.insert(name.clone(), actual);
    completed_bytes = completed_bytes.saturating_add(actual_bytes).min(total_bytes);
    progress(expected.len(), total_count, completed_bytes, total_bytes);
  }
  validate_tree_structure(root, &expected)?;
  progress(total_count, total_count, total_bytes, total_bytes);
  Ok(expected)
}

fn verify_one_inventory_file_parallel(
  plan: &PersistedPlan,
  root: &Path,
  root_identity: (u64, u64),
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  task_root: &Path,
  heal_evidence: bool,
  asset_index_by_name: &HashMap<&str, usize>,
  file: &super::planner::PlanFile,
) -> Result<(String, (u64, String)), String> {
  let path = root.join(&file.name);
  let actual =
    match trusted_file_value(root, root_identity, evidence, &file.name, file.size, &file.md5)? {
      Some(value) => value,
      None => {
        let value = file_size_md5(&path)?;
        if heal_evidence && value.0 == file.size && value.1.eq_ignore_ascii_case(&file.md5) {
          if let Some(&index) = asset_index_by_name.get(file.name.as_str()) {
            super::evidence::capture_and_persist_asset_evidence(task_root, plan, index, root)?;
          } else {
            super::evidence::capture_and_persist_additional_evidence(
              task_root, plan, root, &file.name, value.0, &value.1,
            )?;
          }
        }
        value
      }
    };
  if actual.0 != file.size || !actual.1.eq_ignore_ascii_case(&file.md5) {
    return Err(format!("安装资源校验失败：{}", file.name));
  }
  Ok((file.name.clone(), actual))
}

fn verify_install_tree_with_evidence_with_journal_progress(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  root: &Path,
  sdk_files: &BTreeMap<String, (u64, String)>,
  evidence: &BTreeMap<String, super::evidence::FileEvidence>,
  journal: &mut TaskJournal,
  emit: &dyn Fn(&TaskJournal),
  phase: &str,
) -> Result<BTreeMap<String, (u64, String)>, String> {
  let total_count = plan.inventory.len().saturating_add(1).saturating_add(sdk_files.len());
  let total_bytes = install_verification_total_bytes(plan, overlay, sdk_files);
  journal.verification_completed_count = 0;
  journal.verification_total_count = total_count;
  journal.verification_completed_bytes = 0;
  journal.verification_total_bytes = total_bytes;
  journal.commit_current_step = Some(format!("{phase}：扫描目录安全性"));
  journal.current_file = journal.commit_current_step.clone();
  journal.touch();
  emit(journal);
  let mut last_emit = Instant::now() - Duration::from_millis(250);
  let mut observer = |completed_count: usize,
                      observed_total_count: usize,
                      completed_bytes: u64,
                      observed_total_bytes: u64| {
    journal.verification_completed_count = completed_count.min(observed_total_count);
    journal.verification_total_count = observed_total_count;
    journal.verification_completed_bytes = completed_bytes.min(observed_total_bytes);
    journal.verification_total_bytes = observed_total_bytes;
    if completed_count == observed_total_count || last_emit.elapsed() >= Duration::from_millis(250)
    {
      journal.commit_current_step =
        Some(format!("{phase}：校验文件 {completed_count}/{observed_total_count}"));
      journal.current_file = journal.commit_current_step.clone();
      journal.touch();
      emit(journal);
      last_emit = Instant::now();
    }
  };
  let result = verify_install_tree_with_evidence_and_progress(
    plan,
    overlay,
    root,
    sdk_files,
    evidence,
    &mut observer,
  );
  if result.is_ok() {
    journal.verification_completed_count = total_count;
    journal.verification_completed_bytes = total_bytes;
    journal.commit_current_step = Some(format!("{phase}：目录清单检查完成"));
    journal.current_file = journal.commit_current_step.clone();
    journal.touch();
    emit(journal);
  }
  result
}

fn update_commit_progress(
  journal: &mut TaskJournal,
  completed_count: usize,
  current_step: &str,
  emit: &dyn Fn(&TaskJournal),
) {
  journal.commit_completed_count = completed_count.min(journal.commit_total_count);
  journal.commit_current_step = Some(current_step.to_string());
  journal.current_file = journal.commit_current_step.clone();
  journal.touch();
  emit(journal);
}

fn tree_digest(files: &BTreeMap<String, (u64, String)>) -> String {
  let mut bytes = Vec::new();
  for (name, (size, md5)) in files {
    bytes.extend_from_slice(name.as_bytes());
    bytes.extend_from_slice(b"\0");
    bytes.extend_from_slice(size.to_string().as_bytes());
    bytes.extend_from_slice(b"\0");
    bytes.extend_from_slice(md5.to_ascii_lowercase().as_bytes());
    bytes.extend_from_slice(b"\n");
  }
  sha256_bytes(&bytes)
}

fn write_marker(root: &Path, marker: &InstallMarker) -> Result<(), String> {
  let content =
    serde_json::to_vec_pretty(marker).map_err(|error| format!("序列化安装标记失败：{error}"))?;
  if content.len() as u64 > MAX_MARKER_BYTES {
    return Err("安装标记过大".to_string());
  }
  let path = root.join(MARKER_FILE_NAME);
  if path_occupied(&path)? {
    return verify_marker(root, marker);
  }
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&path)
    .map_err(|error| format!("创建安装标记失败：{error}"))?;
  file.write_all(&content).map_err(|error| format!("写入安装标记失败：{error}"))?;
  file.sync_all().map_err(|error| format!("同步安装标记失败：{error}"))
}

fn verify_marker(root: &Path, expected: &InstallMarker) -> Result<(), String> {
  let actual = read_marker(root)?;
  if !matches!(actual.schema_version, MARKER_SCHEMA_VERSION | MARKER_SCHEMA_VERSION_LEGACY)
    || &actual != expected
  {
    return Err("安装标记身份不匹配".to_string());
  }
  Ok(())
}

fn read_marker(root: &Path) -> Result<InstallMarker, String> {
  let path = root.join(MARKER_FILE_NAME);
  let metadata =
    fs::symlink_metadata(&path).map_err(|error| format!("读取安装标记失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("安装标记不是普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_MARKER_BYTES {
    return Err("安装标记大小无效".to_string());
  }
  serde_json::from_slice(&fs::read(&path).map_err(|error| format!("读取安装标记失败：{error}"))?)
    .map_err(|error| format!("解析安装标记失败：{error}"))
}

fn validate_marker_identity(
  marker: &InstallMarker,
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  draft: &InstallDraft,
  game_root: &Path,
) -> Result<(), String> {
  if !matches!(marker.schema_version, MARKER_SCHEMA_VERSION | MARKER_SCHEMA_VERSION_LEGACY)
    || marker.plan_id != plan.plan_id
    || marker.install_id != plan.installation_id
    || marker.marker_nonce != overlay.marker_nonce
    || !same_path(Path::new(&marker.game_root), game_root)
    || marker.target_path_sha256 != overlay.target_path_sha256
    || marker.target_path_sha256 != path_digest(game_root)
    || marker.scheme != draft.scheme
    || marker.manifest_digest != plan.manifest_digest
    || marker.config_sha256 != overlay.config_sha256
  {
    return Err("安装标记身份不匹配".to_string());
  }
  Ok(())
}

fn ensure_install_space(plan: &PersistedPlan, game_root: &Path) -> Result<(), String> {
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let install_bytes = plan
    .assets
    .iter()
    .try_fold(overlay.config.len() as u64, |total, asset| {
      total.checked_add(asset.size).ok_or_else(|| "安装大小溢出".to_string())
    })?
    .checked_add(overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size))
    .ok_or_else(|| "安装大小溢出".to_string())?;
  let required = install_bytes
    .checked_add(INSTALL_SAFETY_MARGIN_BYTES)
    .ok_or_else(|| "安装空间需求溢出".to_string())?;
  let parent = game_root.parent().ok_or_else(|| "安装目标缺少父目录".to_string())?;
  let available =
    fs2::available_space(parent).map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
  if available < required {
    return Err(format!("安装磁盘空间不足：需要 {required} 字节，可用 {available} 字节"));
  }
  Ok(())
}

fn spool_bytes(root: &Path) -> Result<u64, String> {
  let mut total = 0_u64;
  let entries = match fs::read_dir(root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(0),
    Err(error) => return Err(format!("读取安装任务 spool 失败：{error}")),
  };
  for entry in entries {
    let path = entry.map_err(|error| format!("读取安装任务 spool 条目失败：{error}"))?.path();
    let metadata = fs::symlink_metadata(&path)
      .map_err(|error| format!("读取安装任务 spool 文件失败：{error}"))?;
    if metadata.is_file() {
      total = total.saturating_add(metadata.len());
    }
  }
  Ok(total)
}

fn release_consumed_spool_chunks(
  plan: &PersistedPlan,
  completed_assets: usize,
  spool_root: &Path,
  shared_cache_root: &Path,
) -> Result<u64, String> {
  let mut retained = HashSet::new();
  for asset in plan.assets.iter().skip(completed_assets) {
    for chunk in &asset.chunks {
      if chunk.reuse.is_none() {
        retained.insert(chunk.id.as_str());
      }
    }
  }
  let mut released = 0_u64;
  for download in &plan.downloads {
    if retained.contains(download.id.as_str())
      || path_occupied(&shared_cache_root.join(&download.cache_key))?
      || plan
        .install_overlay
        .as_ref()
        .and_then(|overlay| overlay.sdk.as_ref())
        .is_some_and(|sdk| sdk.cache_key == download.cache_key)
    {
      continue;
    }
    let path = spool_root.join(&download.cache_key);
    if !path_occupied(&path)? {
      continue;
    }
    let metadata =
      fs::symlink_metadata(&path).map_err(|error| format!("读取待回收 spool 文件失败：{error}"))?;
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.is_file() {
      return Err("待回收 spool 文件不是安全的普通文件".to_string());
    }
    let bytes = metadata.len();
    fs::remove_file(&path).map_err(|error| format!("回收安装任务 spool 失败：{error}"))?;
    released = released.saturating_add(bytes);
  }
  Ok(released)
}

fn validate_empty_install_target(game_root: &Path, draft: &InstallDraft) -> Result<(), String> {
  if directory_identity(game_root)? != (draft.target_volume_serial, draft.target_file_id) {
    return Err("安装目标目录身份发生变化，需要重新选择安装目录".to_string());
  }
  if !is_directory_empty(game_root)? {
    return Err("安装目标目录已经被占用，拒绝覆盖".to_string());
  }
  Ok(())
}

fn prepare_publish_target(game_root: &Path, draft: &InstallDraft) -> Result<(), String> {
  if !path_occupied(game_root)? {
    return Ok(());
  }
  validate_empty_install_target(game_root, draft)?;
  fs::remove_dir(game_root).map_err(|error| format!("清理空安装目录失败：{error}"))?;
  if path_occupied(game_root)? {
    return Err("安装目标目录未能安全移除，需要恢复".to_string());
  }
  Ok(())
}

fn ensure_publish_facts(
  plan: &PersistedPlan,
  overlay: &InstallOverlay,
  draft: &InstallDraft,
  staging_root: &Path,
  game_root: &Path,
  marker: &InstallMarker,
) -> Result<(), String> {
  if path_occupied(game_root)? {
    validate_empty_install_target(game_root, draft)?;
  }
  let parent = game_root.parent().ok_or_else(|| "安装目标缺少父目录".to_string())?;
  if directory_identity(parent)? != (draft.library_volume_serial, draft.library_file_id)
    || directory_identity(staging_root)?
      != (marker.directory_volume_serial, marker.directory_file_id)
    || marker.directory_volume_serial != draft.library_volume_serial
  {
    return Err("发布前目录身份发生变化，需要恢复".to_string());
  }
  validate_marker_identity(marker, plan, overlay, draft, game_root)?;
  let available =
    fs2::available_space(parent).map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
  if available < INSTALL_SAFETY_MARGIN_BYTES {
    return Err("发布前安装磁盘安全余量不足，需要恢复".to_string());
  }
  Ok(())
}

pub(crate) fn path_occupied(path: &Path) -> Result<bool, String> {
  match fs::symlink_metadata(path) {
    Ok(_) => Ok(true),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
    Err(error) => Err(format!("读取安装路径失败：{error}")),
  }
}

fn same_path(left: &Path, right: &Path) -> bool {
  normalized_path_key(left) == normalized_path_key(right)
}

fn normalized_path_key(path: &Path) -> String {
  let value = path.to_string_lossy().replace('/', "\\");
  #[cfg(target_os = "windows")]
  return value.to_ascii_lowercase();
  #[cfg(not(target_os = "windows"))]
  value
}

fn path_digest(path: &Path) -> String {
  sha256_bytes(normalized_path_key(path).as_bytes())
}

fn is_sha256(value: &str) -> bool {
  value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn is_md5_value(value: &str) -> bool {
  value.len() == 32 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

pub(crate) fn directory_identity(path: &Path) -> Result<(u64, u64), String> {
  #[cfg(target_os = "windows")]
  super::installation::validate_windows_path(path)?;
  let metadata =
    fs::symlink_metadata(path).map_err(|error| format!("读取目录身份失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_dir() {
    return Err("目录身份目标不是安全的普通目录".to_string());
  }
  #[cfg(target_os = "windows")]
  {
    use std::{
      os::windows::ffi::OsStrExt,
      ptr::{null, null_mut},
    };
    use windows_sys::Win32::{
      Foundation::{CloseHandle, GENERIC_READ, INVALID_HANDLE_VALUE},
      Storage::FileSystem::{
        BY_HANDLE_FILE_INFORMATION, CreateFileW, FILE_FLAG_BACKUP_SEMANTICS, FILE_SHARE_DELETE,
        FILE_SHARE_READ, FILE_SHARE_WRITE, GetFileInformationByHandle, OPEN_EXISTING,
      },
    };
    let wide = path.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    let handle = unsafe {
      CreateFileW(
        wide.as_ptr(),
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        null(),
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        null_mut(),
      )
    };
    if handle == INVALID_HANDLE_VALUE {
      return Err(format!("打开目录身份失败：{}", std::io::Error::last_os_error()));
    }
    let mut info = std::mem::MaybeUninit::<BY_HANDLE_FILE_INFORMATION>::zeroed();
    let result = unsafe { GetFileInformationByHandle(handle, info.as_mut_ptr()) };
    unsafe { CloseHandle(handle) };
    if result == 0 {
      return Err(format!("读取目录身份失败：{}", std::io::Error::last_os_error()));
    }
    let info = unsafe { info.assume_init() };
    return Ok((
      u64::from(info.dwVolumeSerialNumber),
      (u64::from(info.nFileIndexHigh) << 32) | u64::from(info.nFileIndexLow),
    ));
  }
  #[cfg(unix)]
  {
    use std::os::unix::fs::MetadataExt;
    return Ok((metadata.dev(), metadata.ino()));
  }
  #[cfg(not(any(target_os = "windows", unix)))]
  {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    normalized_path_key(path).hash(&mut hasher);
    Ok((0, hasher.finish()))
  }
}

pub(crate) fn is_reparse_point(metadata: &fs::Metadata) -> bool {
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::fs::MetadataExt;
    return metadata.file_attributes() & 0x400 != 0;
  }
  #[cfg(not(target_os = "windows"))]
  {
    let _ = metadata;
    false
  }
}

fn validate_no_links(root: &Path) -> Result<(), String> {
  for entry in WalkDir::new(root).follow_links(false) {
    let entry = entry.map_err(|error| format!("扫描安装暂存目录失败：{error}"))?;
    let metadata = fs::symlink_metadata(entry.path())
      .map_err(|error| format!("读取安装暂存目录失败：{error}"))?;
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
      return Err("安装暂存目录包含符号链接或重解析点".to_string());
    }
  }
  Ok(())
}

fn publish_directory(source: &Path, target: &Path) -> Result<(), String> {
  if path_occupied(target)? {
    return Err("安装目标目录已存在，拒绝覆盖".to_string());
  }
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MOVEFILE_WRITE_THROUGH, MoveFileExW};
    let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    if unsafe { MoveFileExW(source.as_ptr(), target.as_ptr(), MOVEFILE_WRITE_THROUGH) } == 0 {
      return Err(format!("原子发布游戏目录失败：{}", std::io::Error::last_os_error()));
    }
    return Ok(());
  }
  #[cfg(not(target_os = "windows"))]
  fs::rename(source, target).map_err(|error| format!("原子发布游戏目录失败：{error}"))
}

fn remove_owned_staging(path: &Path, draft: &InstallDraft) -> Result<(), String> {
  if !path_occupied(path)? {
    return Ok(());
  }
  let expected_staging = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-install-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  if !same_path(path, &expected_staging)
    || directory_identity(path.parent().ok_or_else(|| "暂存目录缺少父目录".to_string())?)?
      != (draft.library_volume_serial, draft.library_file_id)
  {
    return Err("暂存目录身份不匹配，拒绝删除".to_string());
  }
  if path_occupied(&path.join(MARKER_FILE_NAME))? {
    return Err("已写入安装标记的暂存目录不能直接删除".to_string());
  }
  validate_no_links(path)?;
  fs::remove_dir_all(path).map_err(|error| format!("清理安装暂存目录失败：{error}"))
}

fn set_task_state(
  task_root: &Path,
  journal: &mut TaskJournal,
  state: PackageTaskState,
  emit: &dyn Fn(&TaskJournal),
  timing: &mut InstallValidationTiming,
) -> Result<(), String> {
  journal.state = state;
  journal.current_file = None;
  journal.error_message = None;
  journal.touch();
  persist_install_journal(task_root, journal, timing)?;
  emit(journal);
  Ok(())
}

pub(crate) fn find_draft_id(task_root: &Path, install_id: &str) -> Result<String, String> {
  let directory = task_root.join("install-drafts");
  let entries = match fs::read_dir(directory) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      return Err("找不到安装草稿".to_string());
    }
    Err(error) => return Err(format!("读取安装草稿目录失败：{error}")),
  };
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取安装草稿失败：{error}"))?;
    let Some(name) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let Some(draft_id) = name.strip_suffix(".json") else {
      continue;
    };
    if let Ok(draft) = load_draft(task_root, draft_id)
      && draft.install_id == install_id
      && !matches!(draft.state, InstallDraftState::Canceled | InstallDraftState::Completed)
    {
      return Ok(draft_id.to_string());
    }
  }
  Err("找不到安装草稿".to_string())
}

pub(crate) fn find_recovery_draft_id(task_root: &Path, install_id: &str) -> Result<String, String> {
  if let Ok(draft_id) = find_draft_id(task_root, install_id) {
    return Ok(draft_id);
  }
  let directory = task_root.join("install-drafts");
  let entries =
    fs::read_dir(directory).map_err(|error| format!("读取安装草稿目录失败：{error}"))?;
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取安装草稿失败：{error}"))?;
    let Some(name) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let Some(draft_id) = name.strip_suffix(".json") else {
      continue;
    };
    if let Ok(draft) = load_draft(task_root, draft_id)
      && draft.install_id == install_id
      && draft.state != InstallDraftState::Canceled
    {
      return Ok(draft_id.to_string());
    }
  }
  Err("找不到可恢复的安装草稿".to_string())
}

fn has_active_draft(
  task_root: &Path,
  expected_executable: &Path,
  machine_uid: &str,
) -> Result<bool, String> {
  let directory = task_root.join("install-drafts");
  let entries = match fs::read_dir(directory) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
    Err(error) => return Err(format!("读取安装草稿目录失败：{error}")),
  };
  let install_id = derive_installation_id(&path_text(expected_executable), machine_uid);
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取安装草稿失败：{error}"))?;
    let Some(name) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let Some(draft_id) = name.strip_suffix(".json") else {
      continue;
    };
    if let Ok(draft) = load_draft(task_root, draft_id)
      && draft.install_id == install_id
      && !matches!(draft.state, InstallDraftState::Canceled | InstallDraftState::Completed)
    {
      return Ok(true);
    }
  }
  Ok(false)
}

fn check_canceled(canceled: &AtomicBool) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) { Err("安装任务已取消".to_string()) } else { Ok(()) }
}

fn validate_draft_state_transition(
  current: InstallDraftState,
  next: InstallDraftState,
) -> Result<(), String> {
  if matches!(current, InstallDraftState::Canceled | InstallDraftState::Completed)
    && current != next
  {
    return Err("安装草稿已经结束".to_string());
  }
  Ok(())
}

pub(crate) fn ensure_windows_install_platform() -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    Ok(())
  }
  #[cfg(not(target_os = "windows"))]
  {
    Err("游戏本体安装仅支持 Windows".to_string())
  }
}

fn draft_path(task_root: &Path, draft_id: &str) -> PathBuf {
  task_root.join("install-drafts").join(format!("{draft_id}.json"))
}

fn draft_mutation_lock(key: &str) -> Result<Arc<Mutex<()>>, String> {
  let mut locks = DRAFT_MUTATION_LOCKS.lock().map_err(|_| "安装草稿锁注册表已损坏".to_string())?;
  if let Some(lock) = locks.get(key).and_then(Weak::upgrade) {
    return Ok(lock);
  }
  let lock = Arc::new(Mutex::new(()));
  locks.insert(key.to_string(), Arc::downgrade(&lock));
  Ok(lock)
}

fn task_root_lock_key(task_root: &Path) -> String {
  format!("task\0{}", path_text(task_root))
}

fn draft_lock_key(task_root: &Path, draft_id: &str) -> String {
  format!("draft\0{}\0{draft_id}", path_text(task_root))
}

fn path_text(path: &Path) -> String {
  path.to_string_lossy().into_owned()
}

fn marker_nonce() -> String {
  let first = Uuid::new_v4();
  let second = Uuid::new_v4();
  let mut bytes = [0_u8; 32];
  bytes[..16].copy_from_slice(first.as_bytes());
  bytes[16..].copy_from_slice(second.as_bytes());
  bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn file_size_md5(path: &Path) -> Result<(u64, String), String> {
  let metadata =
    fs::symlink_metadata(path).map_err(|error| format!("读取文件状态失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("安装树条目不是普通文件".to_string());
  }
  let mut file = File::open(path).map_err(|error| format!("打开文件失败：{error}"))?;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; 1024 * 1024];
  loop {
    let read = file.read(&mut buffer).map_err(|error| format!("读取文件失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  Ok((metadata.len(), format!("{:x}", hasher.finalize())))
}

fn sha256_bytes(bytes: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(bytes);
  format!("{:x}", hasher.finalize())
}

fn is_related(left: &Path, right: &Path) -> bool {
  let left = left.to_string_lossy().replace('/', "\\").to_ascii_lowercase();
  let right = right.to_string_lossy().replace('/', "\\").to_ascii_lowercase();
  left == right
    || left.strip_prefix(&(right.clone() + "\\")).is_some()
    || right.strip_prefix(&(left + "\\")).is_some()
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
  let parent = path.parent().ok_or_else(|| "持久化路径缺少父目录".to_string())?;
  fs::create_dir_all(parent).map_err(|error| format!("创建持久化目录失败：{error}"))?;
  let temporary = parent.join(format!(
    ".{}.tmp-{}",
    path.file_name().unwrap_or_default().to_string_lossy(),
    Uuid::new_v4()
  ));
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建持久化临时文件失败：{error}"))?;
  file.write_all(content).map_err(|error| format!("写入持久化临时文件失败：{error}"))?;
  file.sync_all().map_err(|error| format!("同步持久化临时文件失败：{error}"))?;
  drop(file);
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
      MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
    };
    let source = temporary.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    let target = path.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    if unsafe {
      MoveFileExW(
        source.as_ptr(),
        target.as_ptr(),
        MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
      )
    } == 0
    {
      let _ = fs::remove_file(&temporary);
      return Err(format!("原子替换持久化文件失败：{}", std::io::Error::last_os_error()));
    }
  }
  #[cfg(not(target_os = "windows"))]
  fs::rename(&temporary, path).map_err(|error| format!("原子替换持久化文件失败：{error}"))?;
  Ok(())
}
