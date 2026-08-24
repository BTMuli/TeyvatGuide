//! 将已验证 staging 资源以可恢复事务提交到游戏目录。
//! @since Beta v0.11.5

use super::{
  assembler::{
    assemble_manifest_plan_with_progress_concurrent,
    assemble_plan_to_root_with_progress_concurrent, default_assembly_concurrency,
  },
  journal::{
    self, ActiveCommitStep, ApplyJournal, CommitStepKind, CommitStepPhase, ConfigCommitPhase,
    RepairJournal, TaskJournal,
  },
  model::{PackagePlanStrategy, PackageTaskState},
  path_guard::{
    prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file, resolve_optional_manifest_file,
  },
  planner::{PersistedPlan, PlanAssetAction, PlanFile},
};
use md5::{Digest as Md5Digest, Md5};
use sha2::Sha256;
use std::{
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::atomic::{AtomicBool, Ordering},
  time::{Duration, Instant},
};

const COPY_BUFFER_SIZE: usize = 128 * 1024;
const ASSEMBLY_PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(250);
const TRANSACTION_DIRECTORY: &str = ".teyvatguide-update";
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;

/// 提交结果：完整完成，或资源已提交但仍需修复未变化文件。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ApplyOutcome {
  Completed,
  RepairNeeded,
}

#[derive(Clone)]
struct InventoryIssue {
  name: String,
  message: String,
  repairable: bool,
}

#[derive(Clone)]
struct CommitStep {
  kind: CommitStepKind,
  name: String,
  source_size: Option<u64>,
  source_md5: Option<String>,
  size: u64,
  md5: String,
}

struct FileCommitPlan {
  plan_id: String,
  digest: String,
  steps: Vec<CommitStep>,
}

/// 换服提交所需的已校验文件步骤；不含完整游戏 inventory。
#[derive(Clone, Debug)]
pub(crate) struct SwitchFileStep {
  pub kind: CommitStepKind,
  pub name: String,
  pub size: u64,
  pub md5: String,
  pub source_size: Option<u64>,
  pub source_md5: Option<String>,
}

/// 换服写前日志绑定的不可变提交请求。
#[derive(Clone, Debug)]
pub(crate) struct SwitchApplyRequest {
  pub plan_id: String,
  pub digest: String,
  pub target_channel: u32,
  pub target_sub_channel: u32,
  pub files: Vec<SwitchFileStep>,
}

/// 组装、提交并验证一个 ReadyToApply 任务。
pub(crate) fn execute_apply<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  emit: F,
) -> Result<ApplyOutcome, String>
where
  F: Fn(&TaskJournal),
{
  if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch) {
    return Err("当前提交器只支持 manifest-diff 或 patch 资源计划".to_string());
  }
  if plan.inventory.is_empty() {
    return Err("资源计划缺少完整目标文件清单，请重新评估".to_string());
  }
  if journal.state != PackageTaskState::ReadyToApply {
    return Err("资源任务尚未完成下载，不能应用更新".to_string());
  }
  let incoming_bytes = plan.assets.iter().try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "提交空间需求溢出".to_string())
  })?;
  let required = incoming_bytes
    .checked_add(SAFETY_MARGIN_BYTES)
    .ok_or_else(|| "提交空间需求溢出".to_string())?;
  let available = fs2::available_space(game_root)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  if available < required {
    return Err(format!("游戏磁盘空间不足：至少需要 {required} 字节，可用 {available} 字节"));
  }

  journal.state = PackageTaskState::Assembling;
  journal.error_message = None;
  journal.reset_assembly_progress(plan.assets.len(), incoming_bytes);
  journal.current_file = Some("组装资源文件".to_string());
  persist_and_emit(task_root, journal, &emit)?;
  let result = (|| {
    let incoming_root = prepare_apply_assembly(plan, game_root)?;
    {
      let mut last_emit = Instant::now();
      let mut on_progress = |progress: &super::assembler::AssemblyProgress| {
        journal.update_assembly_progress(
          progress.completed_count,
          progress.total_count,
          progress.completed_bytes,
          progress.total_bytes,
          progress.current_file.clone(),
        );
        if progress.completed_count == progress.total_count
          || last_emit.elapsed() >= ASSEMBLY_PROGRESS_EMIT_INTERVAL
        {
          journal.touch();
          emit(&journal);
          last_emit = Instant::now();
        }
      };
      assemble_plan_to_root_with_progress_concurrent(
        plan,
        game_root,
        task_root,
        &incoming_root,
        canceled,
        default_assembly_concurrency(),
        &mut on_progress,
      )?;
    }
    check_canceled(canceled)?;
    prepare_transaction(plan, game_root, task_root, journal)?;
    ensure_game_stopped()?;
    journal.state = PackageTaskState::CommitPrepared;
    journal.current_file = Some("准备提交事务".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    check_canceled(canceled)?;
    journal.state = PackageTaskState::Committing;
    persist_and_emit(task_root, journal, &emit)?;
    commit_resources(plan, game_root, journal, task_root, canceled, &emit)?;
    journal.state = PackageTaskState::Verifying;
    journal.current_file = Some("校验目标清单".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    let issues = inspect_inventory(plan, game_root, canceled)?;
    if let Some(error) = commit_integrity_error(plan, &issues) {
      return Err(error);
    }
    let repair_files = repairable_files(plan, &issues);
    if !repair_files.is_empty() {
      journal.repair = Some(RepairJournal { files: repair_files.clone(), apply: None });
      journal.state = PackageTaskState::RepairRequired;
      journal.error_message = Some(format!(
        "完整清单发现 {} 个未变化文件缺失或损坏，需修复后才能提交版本",
        repair_files.len()
      ));
      journal.current_file = None;
      persist_and_emit(task_root, journal, &emit)?;
      return Ok(ApplyOutcome::RepairNeeded);
    }
    commit_version(plan, game_root, task_root, journal, &emit)?;
    verify_inventory(plan, game_root, canceled)?;
    journal.state = PackageTaskState::Completed;
    journal.error_message = None;
    journal.current_file = None;
    persist_and_emit(task_root, journal, &emit)?;
    Ok(ApplyOutcome::Completed)
  })();

  match result {
    Ok(ApplyOutcome::Completed) => {
      cleanup_known_transaction_files(plan, game_root, task_root);
      Ok(ApplyOutcome::Completed)
    }
    Ok(ApplyOutcome::RepairNeeded) => Ok(ApplyOutcome::RepairNeeded),
    Err(error) => {
      let canceled = canceled.load(Ordering::Acquire);
      finish_failed_apply(plan, game_root, task_root, journal, canceled, error, &emit)
        .map(|()| ApplyOutcome::Completed)
    }
  }
}

/// 下载并提交未变化文件的修复子计划，完整清单通过后再写入版本号。
pub(crate) fn execute_repair<F>(
  plan: &PersistedPlan,
  repair_plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.state != PackageTaskState::RepairRequired {
    return Err("资源任务当前不需要修复".to_string());
  }
  if journal.apply.is_none() {
    return Err("资源任务缺少已提交的更新日志，不能继续修复".to_string());
  }
  if repair_plan.plan_id != plan.plan_id
    || repair_plan.assets.iter().any(|asset| asset.action != PlanAssetAction::Repair)
    || !repair_plan.delete_files.is_empty()
  {
    return Err("修复计划与当前资源任务不匹配".to_string());
  }
  let incoming_bytes = repair_plan.assets.iter().try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "修复空间需求溢出".to_string())
  })?;
  let required = incoming_bytes
    .checked_add(SAFETY_MARGIN_BYTES)
    .ok_or_else(|| "修复空间需求溢出".to_string())?;
  let available = fs2::available_space(game_root)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  if available < required {
    return Err(format!("游戏磁盘空间不足：至少需要 {required} 字节，可用 {available} 字节"));
  }

  journal.state = PackageTaskState::Assembling;
  journal.error_message = None;
  journal.reset_assembly_progress(repair_plan.assets.len(), incoming_bytes);
  journal.current_file = Some("组装修复文件".to_string());
  persist_and_emit(task_root, journal, &emit)?;
  let result = (|| {
    {
      let mut last_emit = Instant::now();
      let mut on_progress = |progress: &super::assembler::AssemblyProgress| {
        journal.update_assembly_progress(
          progress.completed_count,
          progress.total_count,
          progress.completed_bytes,
          progress.total_bytes,
          progress.current_file.clone(),
        );
        if progress.completed_count == progress.total_count
          || last_emit.elapsed() >= ASSEMBLY_PROGRESS_EMIT_INTERVAL
        {
          journal.touch();
          emit(&journal);
          last_emit = Instant::now();
        }
      };
      assemble_manifest_plan_with_progress_concurrent(
        repair_plan,
        game_root,
        task_root,
        canceled,
        default_assembly_concurrency(),
        &mut on_progress,
      )?;
    }
    check_canceled(canceled)?;
    prepare_repair_transaction(plan, repair_plan, game_root, task_root, journal)?;
    ensure_game_stopped()?;
    journal.state = PackageTaskState::Committing;
    persist_and_emit(task_root, journal, &emit)?;
    commit_repair_resources(repair_plan, game_root, journal, task_root, canceled, &emit)?;
    journal.state = PackageTaskState::Verifying;
    journal.current_file = Some("校验目标清单".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    verify_inventory(plan, game_root, canceled)?;
    commit_version(plan, game_root, task_root, journal, &emit)?;
    verify_inventory(plan, game_root, canceled)?;
    journal.repair = None;
    journal.state = PackageTaskState::Completed;
    journal.error_message = None;
    journal.current_file = None;
    persist_and_emit(task_root, journal, &emit)
  })();
  if let Err(error) = result {
    let canceled = canceled.load(Ordering::Acquire);
    return finish_failed_repair(
      plan,
      repair_plan,
      game_root,
      task_root,
      journal,
      canceled,
      error,
      &emit,
    );
  }
  cleanup_known_transaction_files(plan, game_root, task_root);
  cleanup_repair_files(repair_plan, game_root, task_root);
  Ok(())
}

/// 回滚一个尚未完成的提交；无法证明安全状态时保留备份并进入 RecoveryRequired。
pub(crate) fn rollback_apply<F>(
  plan: &PersistedPlan,
  repair_plan: Option<&PersistedPlan>,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  retry: bool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
    let repair_plan = repair_plan.ok_or_else(|| "修复提交尚未回滚，缺少修复计划".to_string())?;
    revert_incomplete_repair(repair_plan, game_root, task_root, journal)?;
  }
  if journal.apply.is_some() {
    journal.state = PackageTaskState::RollingBack;
    persist_and_emit(task_root, journal, &emit)?;
    if let Err(error) = rollback_file_transaction(&file_commit_from_plan(plan)?, game_root, journal)
    {
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(error.clone());
      let _ = persist_and_emit(task_root, journal, &emit);
      return Err(error);
    }
  }
  cleanup_repair_files(plan, game_root, task_root);
  cleanup_known_transaction_files(plan, game_root, task_root);
  journal.apply = None;
  journal.repair = None;
  journal.state = if retry { PackageTaskState::ReadyToApply } else { PackageTaskState::Canceled };
  journal.error_message = None;
  persist_and_emit(task_root, journal, &emit)
}

/// 提交渠道 SDK 与废弃文件，最后才写入 channel/sub_channel，不改 game_version。
pub(crate) fn execute_switch<F>(
  request: &SwitchApplyRequest,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.state != PackageTaskState::ReadyToApply {
    return Err("换服资源尚未准备完成，不能提交".to_string());
  }
  let commit = file_commit_from_switch(request);
  let incoming_bytes = commit.steps.iter().try_fold(0_u64, |total, step| {
    if step.kind == CommitStepKind::Delete {
      return Ok(total);
    }
    total.checked_add(step.size).ok_or_else(|| "换服提交空间需求溢出".to_string())
  })?;
  let required = incoming_bytes
    .checked_add(SAFETY_MARGIN_BYTES)
    .ok_or_else(|| "换服提交空间需求溢出".to_string())?;
  let available = fs2::available_space(game_root)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  if available < required {
    return Err(format!("游戏磁盘空间不足：至少需要 {required} 字节，可用 {available} 字节"));
  }

  journal.state = PackageTaskState::Assembling;
  journal.error_message = None;
  journal.current_file = Some("准备渠道文件".to_string());
  journal.download_current_file = None;
  journal.assembly_current_file = Some("准备渠道文件：校验 SDK 解压结果".to_string());
  journal.bytes_per_second = 0;
  journal.eta_seconds = None;
  persist_and_emit(task_root, journal, &emit)?;
  let result = (|| {
    let config_path = resolve_existing_manifest_file(game_root, "config.ini")?;
    let original =
      fs::read(&config_path).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
    let target = patch_channel(&original, request.target_channel, request.target_sub_channel)?;
    prepare_file_transaction(&commit, &original, &target, game_root, task_root, journal)?;
    ensure_game_stopped()?;
    journal.state = PackageTaskState::CommitPrepared;
    journal.current_file = Some("准备提交事务".to_string());
    journal.assembly_current_file = Some("准备提交事务：生成渠道文件变更清单".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    check_canceled(canceled)?;
    journal.state = PackageTaskState::Committing;
    journal.assembly_current_file = Some("提交事务：写入渠道文件".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    commit_file_resources(&commit, game_root, journal, task_root, canceled, &emit)?;
    journal.state = PackageTaskState::Verifying;
    journal.current_file = Some("校验渠道文件".to_string());
    journal.assembly_current_file = Some("校验渠道文件：确认文件完整性".to_string());
    persist_and_emit(task_root, journal, &emit)?;
    verify_switch_files(&commit, game_root, canceled)?;
    commit_config(&commit.plan_id, game_root, task_root, journal, &emit)?;
    verify_switch_files(&commit, game_root, canceled)?;
    verify_switch_config(game_root, request.target_channel, request.target_sub_channel, &original)?;
    journal.state = PackageTaskState::Completed;
    journal.error_message = None;
    journal.current_file = None;
    journal.download_current_file = None;
    journal.assembly_current_file = None;
    persist_and_emit(task_root, journal, &emit)?;
    Ok(())
  })();

  match result {
    Ok(()) => {
      cleanup_file_transaction(&commit, game_root, task_root);
      Ok(())
    }
    Err(error) => {
      let canceled = canceled.load(Ordering::Acquire);
      finish_failed_switch(&commit, game_root, task_root, journal, canceled, error, &emit)
    }
  }
}

/// 回滚未完成的换服提交；无法证明安全时进入 RecoveryRequired。
pub(crate) fn rollback_switch<F>(
  request: &SwitchApplyRequest,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  retry: bool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  let commit = file_commit_from_switch(request);
  if journal.apply.is_some() {
    journal.state = PackageTaskState::RollingBack;
    persist_and_emit(task_root, journal, &emit)?;
    if let Err(error) = rollback_file_transaction(&commit, game_root, journal) {
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(error.clone());
      let _ = persist_and_emit(task_root, journal, &emit);
      return Err(error);
    }
  }
  cleanup_file_transaction(&commit, game_root, task_root);
  journal.apply = None;
  journal.state = if retry { PackageTaskState::ReadyToApply } else { PackageTaskState::Canceled };
  journal.error_message = None;
  persist_and_emit(task_root, journal, &emit)
}

fn prepare_repair_transaction(
  original: &PersistedPlan,
  repair_plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  let steps = repair_steps(repair_plan);
  if steps.is_empty() {
    return Err("修复计划没有可提交的资源".to_string());
  }
  let original_apply = apply(journal)?.clone();
  let incoming_root = transaction_subdirectory(game_root, &original.plan_id, "repair-incoming")?;
  let backup_root = transaction_subdirectory(game_root, &original.plan_id, "repair-backup")?;
  let staging_root = task_root.join("tasks").join(&repair_plan.plan_id).join("staging");
  for step in &steps {
    if resolve_optional_manifest_file(&backup_root, &step.name)?.is_some() {
      return Err(format!("修复备份目录包含未恢复文件：{}", step.name));
    }
    let source = resolve_existing_manifest_file(&staging_root, &step.name)?;
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    copy_verified(&source, &incoming, step.size, &step.md5)?;
  }
  let repair = journal.repair.as_mut().ok_or_else(|| "资源任务缺少修复清单".to_string())?;
  repair.apply = Some(ApplyJournal {
    plan_sha256: plan_sha256(repair_plan)?,
    steps_digest: steps_digest(&steps),
    step_count: steps.len(),
    cursor: 0,
    active_step: None,
    config_original_sha256: original_apply.config_original_sha256,
    config_target_sha256: original_apply.config_target_sha256,
    config_phase: ConfigCommitPhase::Prepared,
  });
  Ok(())
}

fn commit_repair_resources<F>(
  repair_plan: &PersistedPlan,
  game_root: &Path,
  journal: &mut TaskJournal,
  task_root: &Path,
  canceled: &AtomicBool,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  let steps = repair_steps(repair_plan);
  let incoming_root = transaction_subdirectory(game_root, &repair_plan.plan_id, "repair-incoming")?;
  let backup_root = transaction_subdirectory(game_root, &repair_plan.plan_id, "repair-backup")?;
  let start = repair_apply(journal)?.cursor;
  for (index, step) in steps.iter().enumerate().skip(start) {
    check_canceled(canceled)?;
    let target = prepare_manifest_output_file(game_root, &step.name)?;
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    let backup = prepare_manifest_output_file(&backup_root, &step.name)?;
    if resolve_optional_manifest_file(game_root, &step.name)?.is_some() {
      ensure_game_stopped()?;
      if resolve_optional_manifest_file(&backup_root, &step.name)?.is_some() {
        return Err(format!("修复备份目标已存在：{}", step.name));
      }
      set_repair_active_step(journal, index, step, CommitStepPhase::BackupPending);
      persist_and_emit(task_root, journal, emit)?;
      ensure_game_stopped()?;
      fs::rename(&target, &backup)
        .map_err(|error| format!("备份待修复资源失败：{}：{error}", step.name))?;
      set_repair_active_step(journal, index, step, CommitStepPhase::BackedUp);
      persist_and_emit(task_root, journal, emit)?;
    }
    ensure_game_stopped()?;
    let incoming_path = resolve_existing_manifest_file(&incoming_root, &step.name)?;
    if !file_matches(&incoming_path, step.size, &step.md5)? {
      return Err(format!("修复 incoming 资源在提交前校验失败：{}", step.name));
    }
    if resolve_optional_manifest_file(game_root, &step.name)?.is_some() {
      return Err(format!("待修复资源目标在提交前意外存在：{}", step.name));
    }
    set_repair_active_step(journal, index, step, CommitStepPhase::InstallPending);
    persist_and_emit(task_root, journal, emit)?;
    ensure_game_stopped()?;
    fs::rename(&incoming, &target)
      .map_err(|error| format!("提交修复资源失败：{}：{error}", step.name))?;
    set_repair_active_step(journal, index, step, CommitStepPhase::Installed);
    persist_and_emit(task_root, journal, emit)?;
    let apply = repair_apply_mut(journal)?;
    apply.cursor = index + 1;
    apply.active_step = None;
    persist_and_emit(task_root, journal, emit)?;
  }
  Ok(())
}

fn finish_failed_repair<F>(
  plan: &PersistedPlan,
  repair_plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: bool,
  error: String,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  let _ = plan;
  if journal.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
    journal.state = PackageTaskState::RollingBack;
    journal.error_message = Some(error.clone());
    let _ = persist_and_emit(task_root, journal, emit);
    if let Err(rollback_error) = rollback_repair(repair_plan, game_root, journal) {
      let combined = format!("{error}；修复回滚失败：{rollback_error}");
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(combined.clone());
      let _ = persist_and_emit(task_root, journal, emit);
      return Err(combined);
    }
  }
  cleanup_repair_files(repair_plan, game_root, task_root);
  if let Some(repair) = journal.repair.as_mut() {
    repair.apply = None;
  }
  journal.state = PackageTaskState::RepairRequired;
  journal.error_message = (!canceled).then_some(error.clone());
  let _ = persist_and_emit(task_root, journal, emit);
  Err(if canceled { "应用更新已取消".to_string() } else { error })
}

pub(crate) fn revert_incomplete_repair(
  repair_plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  if journal.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
    if let Err(error) = rollback_repair(repair_plan, game_root, journal) {
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(error.clone());
      journal.touch();
      let _ = journal::persist(task_root, journal);
      return Err(error);
    }
  }
  cleanup_repair_files(repair_plan, game_root, task_root);
  if let Some(repair) = journal.repair.as_mut() {
    repair.apply = None;
  }
  journal.state = PackageTaskState::RepairRequired;
  journal.error_message = None;
  journal.current_file = None;
  journal.touch();
  journal::persist(task_root, journal)
}

fn rollback_repair(
  repair_plan: &PersistedPlan,
  game_root: &Path,
  journal: &TaskJournal,
) -> Result<(), String> {
  let steps = repair_steps(repair_plan);
  let apply = repair_apply(journal)?;
  if apply.steps_digest != steps_digest(&steps) || apply.step_count != steps.len() {
    return Err("修复提交日志与资源步骤不匹配".to_string());
  }
  if apply.plan_sha256 != plan_sha256(repair_plan)? {
    return Err("修复提交日志与修复计划不匹配".to_string());
  }
  let incoming_root = transaction_subdirectory(game_root, &repair_plan.plan_id, "repair-incoming")?;
  let backup_root = transaction_subdirectory(game_root, &repair_plan.plan_id, "repair-backup")?;
  for step in steps.iter().rev() {
    let target = resolve_optional_manifest_file(game_root, &step.name)?;
    let incoming = resolve_optional_manifest_file(&incoming_root, &step.name)?;
    let backup = resolve_optional_manifest_file(&backup_root, &step.name)?;
    match backup {
      Some(backup) => {
        if let Some(incoming_file) = &incoming {
          if !file_matches(incoming_file, step.size, &step.md5)? {
            return Err(format!("修复 incoming 完整性校验失败：{}", step.name));
          }
        }
        if let Some(target) = target {
          if !file_matches(&target, step.size, &step.md5)? || incoming.is_some() {
            return Err(format!("修复资源处于未知状态：{}", step.name));
          }
          let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
          ensure_game_stopped()?;
          fs::rename(target, incoming)
            .map_err(|error| format!("移出修复资源失败：{}：{error}", step.name))?;
        }
        let target = prepare_manifest_output_file(game_root, &step.name)?;
        ensure_game_stopped()?;
        fs::rename(backup, target)
          .map_err(|error| format!("恢复待修复资源失败：{}：{error}", step.name))?;
      }
      None => match target {
        Some(path) if file_matches(&path, step.size, &step.md5)? && incoming.is_none() => {
          let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
          ensure_game_stopped()?;
          fs::rename(path, incoming)
            .map_err(|error| format!("回滚修复新增资源失败：{}：{error}", step.name))?;
        }
        Some(_) => return Err(format!("修复资源处于未知状态：{}", step.name)),
        None => {
          if let Some(incoming) = incoming {
            if !file_matches(&incoming, step.size, &step.md5)? {
              return Err(format!("修复 incoming 完整性校验失败：{}", step.name));
            }
          }
        }
      },
    }
  }
  Ok(())
}

fn repair_steps(plan: &PersistedPlan) -> Vec<CommitStep> {
  plan
    .assets
    .iter()
    .map(|asset| CommitStep {
      kind: CommitStepKind::Repair,
      name: asset.name.clone(),
      source_size: None,
      source_md5: None,
      size: asset.size,
      md5: asset.md5.clone(),
    })
    .collect()
}

fn prepare_transaction(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  let commit = file_commit_from_plan(plan)?;
  let config_path = resolve_existing_manifest_file(game_root, "config.ini")?;
  let original =
    fs::read(&config_path).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  let target = if plan.source_tag.as_deref() == Some(plan.target_tag.as_str()) {
    original.clone()
  } else {
    patch_game_version(&original, &plan.target_tag)?
  };
  prepare_file_transaction(&commit, &original, &target, game_root, task_root, journal)
}

fn prepare_apply_assembly(plan: &PersistedPlan, game_root: &Path) -> Result<PathBuf, String> {
  transaction_subdirectory(game_root, &plan.plan_id, "incoming")
}

fn prepare_file_transaction(
  commit: &FileCommitPlan,
  original: &[u8],
  target: &[u8],
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  preflight_targets(&commit.steps, game_root)?;
  let incoming_root = transaction_subdirectory(game_root, &commit.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &commit.plan_id, "backup")?;
  let staging_root = task_root.join("tasks").join(&commit.plan_id).join("staging");
  for step in &commit.steps {
    if resolve_optional_manifest_file(&backup_root, &step.name)?.is_some() {
      return Err(format!("提交备份目录包含未恢复文件：{}", step.name));
    }
    if step.kind == CommitStepKind::Delete {
      continue;
    }
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    if resolve_optional_manifest_file(&incoming_root, &step.name)?.is_none() {
      let source = resolve_existing_manifest_file(&staging_root, &step.name)?;
      copy_verified(&source, &incoming, step.size, &step.md5)?;
    }
    if !file_matches(&incoming, step.size, &step.md5)? {
      return Err(format!("incoming 资源在提交前校验失败：{}", step.name));
    }
  }

  let config_root = transaction_subdirectory(game_root, &commit.plan_id, "config")?;
  write_verified_bytes(&config_root.join("original"), original)?;
  write_verified_bytes(&config_root.join("target"), target)?;
  journal.schema_version = journal::JOURNAL_SCHEMA_VERSION;
  journal.apply = Some(ApplyJournal {
    plan_sha256: commit.digest.clone(),
    steps_digest: steps_digest(&commit.steps),
    step_count: commit.steps.len(),
    cursor: 0,
    active_step: None,
    config_original_sha256: sha256_bytes(original),
    config_target_sha256: sha256_bytes(target),
    config_phase: ConfigCommitPhase::Prepared,
  });
  Ok(())
}

fn preflight_targets(steps: &[CommitStep], game_root: &Path) -> Result<(), String> {
  for step in steps {
    let current = resolve_optional_manifest_file(game_root, &step.name)?;
    match step.kind {
      CommitStepKind::Add if current.is_some() => {
        return Err(format!("新增资源目标已存在，拒绝覆盖未知文件：{}", step.name));
      }
      CommitStepKind::Modify if current.is_none() => {
        return Err(format!("待更新资源已缺失，请先执行修复：{}", step.name));
      }
      CommitStepKind::Modify => {
        let path = current.ok_or_else(|| format!("待更新资源已缺失：{}", step.name))?;
        if !source_file_matches(&path, step)? {
          return Err(format!("待更新资源与计划源文件不一致：{}", step.name));
        }
      }
      CommitStepKind::Delete => {
        let path = current.ok_or_else(|| format!("待删除资源已缺失：{}", step.name))?;
        if !file_matches(&path, step.size, &step.md5)? {
          return Err(format!("待删除资源与计划源文件不一致：{}", step.name));
        }
      }
      CommitStepKind::Repair => {}
      _ => {}
    }
  }
  Ok(())
}

fn commit_resources<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  journal: &mut TaskJournal,
  task_root: &Path,
  canceled: &AtomicBool,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  commit_file_resources(
    &file_commit_from_plan(plan)?,
    game_root,
    journal,
    task_root,
    canceled,
    emit,
  )
}

fn commit_file_resources<F>(
  commit: &FileCommitPlan,
  game_root: &Path,
  journal: &mut TaskJournal,
  task_root: &Path,
  canceled: &AtomicBool,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  validate_plan_digest(journal, &commit.digest)?;
  validate_apply_identity(journal, &commit.steps)?;
  let incoming_root = transaction_subdirectory(game_root, &commit.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &commit.plan_id, "backup")?;
  for (index, step) in commit.steps.iter().enumerate().skip(apply(journal)?.cursor) {
    check_canceled(canceled)?;
    let target = prepare_manifest_output_file(game_root, &step.name)?;
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    let backup = prepare_manifest_output_file(&backup_root, &step.name)?;
    let backup_existing = match step.kind {
      CommitStepKind::Add => false,
      CommitStepKind::Repair => resolve_optional_manifest_file(game_root, &step.name)?.is_some(),
      CommitStepKind::Modify | CommitStepKind::Delete => true,
    };
    if backup_existing {
      ensure_game_stopped()?;
      let current = resolve_existing_manifest_file(game_root, &step.name)?;
      if step.kind != CommitStepKind::Repair && !source_file_matches(&current, step)? {
        return Err(format!("游戏资源在提交前发生变化：{}", step.name));
      }
      if resolve_optional_manifest_file(&backup_root, &step.name)?.is_some() {
        return Err(format!("游戏资源备份目标已存在：{}", step.name));
      }
      set_active_step(journal, index, step, CommitStepPhase::BackupPending);
      persist_and_emit(task_root, journal, emit)?;
      ensure_game_stopped()?;
      fs::rename(&target, &backup)
        .map_err(|error| format!("备份游戏资源失败：{}：{error}", step.name))?;
      set_active_step(journal, index, step, CommitStepPhase::BackedUp);
      persist_and_emit(task_root, journal, emit)?;
    }
    if step.kind != CommitStepKind::Delete {
      ensure_game_stopped()?;
      let incoming_path = resolve_existing_manifest_file(&incoming_root, &step.name)?;
      if !file_matches(&incoming_path, step.size, &step.md5)? {
        return Err(format!("incoming 资源在提交前校验失败：{}", step.name));
      }
      if resolve_optional_manifest_file(game_root, &step.name)?.is_some() {
        return Err(format!("游戏资源目标在提交前意外存在：{}", step.name));
      }
      set_active_step(journal, index, step, CommitStepPhase::InstallPending);
      persist_and_emit(task_root, journal, emit)?;
      ensure_game_stopped()?;
      fs::rename(&incoming, &target)
        .map_err(|error| format!("提交游戏资源失败：{}：{error}", step.name))?;
    }
    set_active_step(journal, index, step, CommitStepPhase::Installed);
    persist_and_emit(task_root, journal, emit)?;
    let apply = apply_mut(journal)?;
    apply.cursor = index + 1;
    apply.active_step = None;
    persist_and_emit(task_root, journal, emit)?;
  }
  Ok(())
}

fn commit_version<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  commit_config(&plan.plan_id, game_root, task_root, journal, emit)
}

fn commit_config<F>(
  plan_id: &str,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  let config_path = resolve_existing_manifest_file(game_root, "config.ini")?;
  let current = fs::read(&config_path).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  if sha256_bytes(&current) != apply(journal)?.config_original_sha256 {
    return Err("config.ini 在提交期间发生变化，拒绝更新配置".to_string());
  }
  if apply(journal)?.config_original_sha256 == apply(journal)?.config_target_sha256 {
    apply_mut(journal)?.config_phase = ConfigCommitPhase::Replaced;
    persist_and_emit(task_root, journal, emit)?;
    return Ok(());
  }
  ensure_game_stopped()?;
  apply_mut(journal)?.config_phase = ConfigCommitPhase::ReplacePending;
  persist_and_emit(task_root, journal, emit)?;
  let config_root = transaction_subdirectory(game_root, plan_id, "config")?;
  let target = resolve_existing_manifest_file(&config_root, "target")?;
  let target_bytes =
    fs::read(&target).map_err(|error| format!("读取目标 config.ini 失败：{error}"))?;
  if sha256_bytes(&target_bytes) != apply(journal)?.config_target_sha256 {
    return Err("目标 config.ini 事务文件完整性校验失败".to_string());
  }
  ensure_game_stopped()?;
  atomic_replace(&target, &config_path)?;
  let actual = fs::read(&config_path).map_err(|error| format!("复验 config.ini 失败：{error}"))?;
  if sha256_bytes(&actual) != apply(journal)?.config_target_sha256 {
    return Err("config.ini 提交后完整性校验失败".to_string());
  }
  apply_mut(journal)?.config_phase = ConfigCommitPhase::Replaced;
  persist_and_emit(task_root, journal, emit)
}

fn verify_inventory(
  plan: &PersistedPlan,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let issues = inspect_inventory(plan, game_root, canceled)?;
  issues.first().map_or(Ok(()), |issue| Err(issue.message.clone()))
}

fn inspect_inventory(
  plan: &PersistedPlan,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<Vec<InventoryIssue>, String> {
  let mut issues = Vec::new();
  let changed = changed_names(plan);
  for file in &plan.inventory {
    check_canceled(canceled)?;
    match resolve_optional_manifest_file(game_root, &file.name)? {
      None => issues.push(InventoryIssue {
        name: file.name.clone(),
        message: format!("目标清单文件缺失：{}", file.name),
        repairable: !changed.contains(&file.name),
      }),
      Some(path) => {
        if !file_matches(&path, file.size, &file.md5)? {
          issues.push(InventoryIssue {
            name: file.name.clone(),
            message: format!("目标清单文件校验失败：{}", file.name),
            repairable: !changed.contains(&file.name),
          });
        }
      }
    }
  }
  for deleted in &plan.delete_files {
    check_canceled(canceled)?;
    if resolve_optional_manifest_file(game_root, &deleted.name)?.is_some() {
      issues.push(InventoryIssue {
        name: deleted.name.clone(),
        message: format!("目标版本应删除的文件仍然存在：{}", deleted.name),
        repairable: false,
      });
    }
  }
  Ok(issues)
}

fn changed_names(plan: &PersistedPlan) -> std::collections::HashSet<String> {
  plan
    .assets
    .iter()
    .map(|asset| asset.name.clone())
    .chain(plan.delete_files.iter().map(|file| file.name.clone()))
    .collect()
}

fn commit_integrity_error(plan: &PersistedPlan, issues: &[InventoryIssue]) -> Option<String> {
  let _ = plan;
  issues.iter().find(|issue| !issue.repairable).map(|issue| issue.message.clone())
}

fn repairable_files(plan: &PersistedPlan, issues: &[InventoryIssue]) -> Vec<PlanFile> {
  let inventory = plan
    .inventory
    .iter()
    .map(|file| (file.name.as_str(), file))
    .collect::<std::collections::HashMap<_, _>>();
  issues
    .iter()
    .filter(|issue| issue.repairable)
    .filter_map(|issue| inventory.get(issue.name.as_str()).cloned().cloned())
    .collect()
}

fn finish_failed_apply<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: bool,
  error: String,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.apply.is_some() {
    journal.state = PackageTaskState::RollingBack;
    journal.error_message = Some(error.clone());
    let _ = persist_and_emit(task_root, journal, emit);
    if let Err(rollback_error) =
      rollback_file_transaction(&file_commit_from_plan(plan)?, game_root, journal)
    {
      let combined = format!("{error}；自动回滚失败：{rollback_error}");
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(combined.clone());
      let _ = persist_and_emit(task_root, journal, emit);
      return Err(combined);
    }
  }
  cleanup_known_transaction_files(plan, game_root, task_root);
  journal.apply = None;
  journal.state = PackageTaskState::ReadyToApply;
  journal.error_message = (!canceled).then_some(error.clone());
  let _ = persist_and_emit(task_root, journal, emit);
  Err(if canceled { "应用更新已取消".to_string() } else { error })
}

fn rollback_file_transaction(
  commit: &FileCommitPlan,
  game_root: &Path,
  journal: &TaskJournal,
) -> Result<(), String> {
  validate_plan_digest(journal, &commit.digest)?;
  validate_apply_identity(journal, &commit.steps)?;
  rollback_config(&commit.plan_id, game_root, journal)?;
  let incoming_root = transaction_subdirectory(game_root, &commit.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &commit.plan_id, "backup")?;
  for step in commit.steps.iter().rev() {
    let target = resolve_optional_manifest_file(game_root, &step.name)?;
    let incoming = resolve_optional_manifest_file(&incoming_root, &step.name)?;
    let backup = resolve_optional_manifest_file(&backup_root, &step.name)?;
    match step.kind {
      CommitStepKind::Add => {
        if backup.is_some() {
          return Err(format!("新增资源存在意外备份：{}", step.name));
        }
        match target {
          Some(path) if file_matches(&path, step.size, &step.md5)? && incoming.is_none() => {
            let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
            ensure_game_stopped()?;
            fs::rename(path, incoming)
              .map_err(|error| format!("回滚新增资源失败：{}：{error}", step.name))?;
          }
          Some(_) => return Err(format!("新增资源处于未知状态：{}", step.name)),
          None => {
            if let Some(incoming) = incoming {
              if !file_matches(&incoming, step.size, &step.md5)? {
                return Err(format!("新增资源 incoming 完整性校验失败：{}", step.name));
              }
            }
          }
        }
      }
      CommitStepKind::Modify => match backup {
        Some(backup) => {
          if !source_file_matches(&backup, step)? {
            return Err(format!("修改资源备份完整性校验失败：{}", step.name));
          }
          if let Some(incoming) = &incoming {
            if !file_matches(incoming, step.size, &step.md5)? {
              return Err(format!("修改资源 incoming 完整性校验失败：{}", step.name));
            }
          }
          if let Some(target) = target {
            if !file_matches(&target, step.size, &step.md5)? || incoming.is_some() {
              return Err(format!("修改资源处于未知状态：{}", step.name));
            }
            let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
            ensure_game_stopped()?;
            fs::rename(target, incoming)
              .map_err(|error| format!("移出新资源失败：{}：{error}", step.name))?;
          }
          let target = prepare_manifest_output_file(game_root, &step.name)?;
          ensure_game_stopped()?;
          fs::rename(backup, target)
            .map_err(|error| format!("恢复资源备份失败：{}：{error}", step.name))?;
          let restored = resolve_existing_manifest_file(game_root, &step.name)?;
          if !source_file_matches(&restored, step)? {
            return Err(format!("恢复后的资源校验失败：{}", step.name));
          }
        }
        None => {
          let target = target.ok_or_else(|| format!("修改资源及其备份均缺失：{}", step.name))?;
          if !source_file_matches(&target, step)? {
            return Err(format!("修改资源已恢复状态校验失败：{}", step.name));
          }
          if let Some(incoming) = incoming {
            if !file_matches(&incoming, step.size, &step.md5)? {
              return Err(format!("修改资源 incoming 完整性校验失败：{}", step.name));
            }
          }
        }
      },
      CommitStepKind::Delete => {
        if incoming.is_some() {
          return Err(format!("删除资源存在意外 incoming 文件：{}", step.name));
        }
        match (target, backup) {
          (None, Some(backup)) => {
            if !source_file_matches(&backup, step)? {
              return Err(format!("删除资源备份完整性校验失败：{}", step.name));
            }
            let target = prepare_manifest_output_file(game_root, &step.name)?;
            ensure_game_stopped()?;
            fs::rename(backup, target)
              .map_err(|error| format!("恢复已删除资源失败：{}：{error}", step.name))?;
            let restored = resolve_existing_manifest_file(game_root, &step.name)?;
            if !source_file_matches(&restored, step)? {
              return Err(format!("恢复后的删除资源校验失败：{}", step.name));
            }
          }
          (Some(target), None) => {
            if !source_file_matches(&target, step)? {
              return Err(format!("删除资源已恢复状态校验失败：{}", step.name));
            }
          }
          _ => return Err(format!("删除资源处于未知状态：{}", step.name)),
        }
      }
      CommitStepKind::Repair => match backup {
        Some(backup) => {
          if let Some(incoming_file) = &incoming {
            if !file_matches(incoming_file, step.size, &step.md5)? {
              return Err(format!("修复资源 incoming 完整性校验失败：{}", step.name));
            }
          }
          if let Some(target) = target {
            if !file_matches(&target, step.size, &step.md5)? || incoming.is_some() {
              return Err(format!("修复资源处于未知状态：{}", step.name));
            }
            let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
            ensure_game_stopped()?;
            fs::rename(target, incoming)
              .map_err(|error| format!("移出修复资源失败：{}：{error}", step.name))?;
          }
          let target = prepare_manifest_output_file(game_root, &step.name)?;
          ensure_game_stopped()?;
          fs::rename(backup, target)
            .map_err(|error| format!("恢复待修复资源失败：{}：{error}", step.name))?;
        }
        None => match target {
          Some(path) if file_matches(&path, step.size, &step.md5)? && incoming.is_none() => {
            let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
            ensure_game_stopped()?;
            fs::rename(path, incoming)
              .map_err(|error| format!("回滚修复新增资源失败：{}：{error}", step.name))?;
          }
          Some(_) => return Err(format!("修复资源处于未知状态：{}", step.name)),
          None => {
            if let Some(incoming) = incoming {
              if !file_matches(&incoming, step.size, &step.md5)? {
                return Err(format!("修复资源 incoming 完整性校验失败：{}", step.name));
              }
            }
          }
        },
      },
    }
  }
  Ok(())
}

fn rollback_config(plan_id: &str, game_root: &Path, journal: &TaskJournal) -> Result<(), String> {
  let config = resolve_existing_manifest_file(game_root, "config.ini")?;
  let current = fs::read(&config).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  let current_hash = sha256_bytes(&current);
  let apply = apply(journal)?;
  if current_hash == apply.config_original_sha256 {
    return Ok(());
  }
  if current_hash != apply.config_target_sha256 {
    return Err("config.ini 既不匹配源配置也不匹配目标配置".to_string());
  }
  let config_root = transaction_subdirectory(game_root, plan_id, "config")?;
  let original = resolve_existing_manifest_file(&config_root, "original")?;
  let original_bytes =
    fs::read(&original).map_err(|error| format!("读取源 config.ini 备份失败：{error}"))?;
  if sha256_bytes(&original_bytes) != apply.config_original_sha256 {
    return Err("源 config.ini 备份完整性校验失败".to_string());
  }
  ensure_game_stopped()?;
  atomic_replace(&original, &config)?;
  let restored = fs::read(&config).map_err(|error| format!("复验 config.ini 失败：{error}"))?;
  if sha256_bytes(&restored) != apply.config_original_sha256 {
    return Err("恢复后的 config.ini 完整性校验失败".to_string());
  }
  Ok(())
}

fn commit_steps(plan: &PersistedPlan) -> Vec<CommitStep> {
  let mut steps = plan
    .assets
    .iter()
    .map(|asset| CommitStep {
      kind: match asset.action {
        PlanAssetAction::Add => CommitStepKind::Add,
        PlanAssetAction::Modify => CommitStepKind::Modify,
        PlanAssetAction::Repair => CommitStepKind::Repair,
      },
      name: asset.name.clone(),
      source_size: asset.source.as_ref().map(|source| source.size),
      source_md5: asset.source.as_ref().map(|source| source.md5.clone()),
      size: asset.size,
      md5: asset.md5.clone(),
    })
    .collect::<Vec<_>>();
  steps.extend(plan.delete_files.iter().map(|file| CommitStep {
    kind: CommitStepKind::Delete,
    name: file.name.clone(),
    source_size: Some(file.size),
    source_md5: Some(file.md5.clone()),
    size: file.size,
    md5: file.md5.clone(),
  }));
  steps
}

fn steps_digest(steps: &[CommitStep]) -> String {
  let mut hasher = Sha256::new();
  for step in steps {
    hasher.update([match step.kind {
      CommitStepKind::Add => 1,
      CommitStepKind::Modify => 2,
      CommitStepKind::Delete => 3,
      CommitStepKind::Repair => 4,
    }]);
    hasher.update(step.name.as_bytes());
    hasher.update([0]);
    hasher.update(step.source_size.unwrap_or_default().to_le_bytes());
    hasher.update(step.source_md5.as_deref().unwrap_or_default().as_bytes());
    hasher.update([0]);
    hasher.update(step.size.to_le_bytes());
    hasher.update(step.md5.as_bytes());
  }
  format!("{:x}", hasher.finalize())
}

fn source_file_matches(path: &Path, step: &CommitStep) -> Result<bool, String> {
  let size = step.source_size.ok_or_else(|| format!("资源步骤缺少源大小：{}", step.name))?;
  let md5 =
    step.source_md5.as_deref().ok_or_else(|| format!("资源步骤缺少源 MD5：{}", step.name))?;
  file_matches(path, size, md5)
}

fn validate_apply_identity(journal: &TaskJournal, steps: &[CommitStep]) -> Result<(), String> {
  let apply = apply(journal)?;
  if apply.steps_digest != steps_digest(steps) || apply.step_count != steps.len() {
    return Err("提交日志与资源步骤不匹配".to_string());
  }
  Ok(())
}

fn validate_plan_digest(journal: &TaskJournal, digest: &str) -> Result<(), String> {
  if apply(journal)?.plan_sha256 != digest {
    return Err("提交日志与完整资源计划不匹配".to_string());
  }
  Ok(())
}

fn plan_sha256(plan: &PersistedPlan) -> Result<String, String> {
  let bytes = serde_json::to_vec(plan).map_err(|error| format!("序列化资源计划失败：{error}"))?;
  Ok(sha256_bytes(&bytes))
}

fn set_repair_active_step(
  journal: &mut TaskJournal,
  index: usize,
  step: &CommitStep,
  phase: CommitStepPhase,
) {
  journal.current_file = Some(step.name.clone());
  if let Some(apply) = journal.repair.as_mut().and_then(|repair| repair.apply.as_mut()) {
    apply.active_step =
      Some(ActiveCommitStep { index, kind: step.kind, phase, relative_path: step.name.clone() });
  }
}

fn repair_apply(journal: &TaskJournal) -> Result<&ApplyJournal, String> {
  journal
    .repair
    .as_ref()
    .and_then(|repair| repair.apply.as_ref())
    .ok_or_else(|| "资源任务缺少修复提交日志".to_string())
}

fn repair_apply_mut(journal: &mut TaskJournal) -> Result<&mut ApplyJournal, String> {
  journal
    .repair
    .as_mut()
    .and_then(|repair| repair.apply.as_mut())
    .ok_or_else(|| "资源任务缺少修复提交日志".to_string())
}

fn set_active_step(
  journal: &mut TaskJournal,
  index: usize,
  step: &CommitStep,
  phase: CommitStepPhase,
) {
  journal.current_file = Some(step.name.clone());
  if let Some(apply) = &mut journal.apply {
    apply.active_step =
      Some(ActiveCommitStep { index, kind: step.kind, phase, relative_path: step.name.clone() });
  }
}

fn apply(journal: &TaskJournal) -> Result<&ApplyJournal, String> {
  journal.apply.as_ref().ok_or_else(|| "资源任务缺少提交日志".to_string())
}

fn apply_mut(journal: &mut TaskJournal) -> Result<&mut ApplyJournal, String> {
  journal.apply.as_mut().ok_or_else(|| "资源任务缺少提交日志".to_string())
}

fn persist_and_emit<F>(task_root: &Path, journal: &mut TaskJournal, emit: &F) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  journal.touch();
  journal::persist(task_root, journal)?;
  emit(journal);
  Ok(())
}

fn transaction_subdirectory(
  game_root: &Path,
  task_id: &str,
  child: &str,
) -> Result<PathBuf, String> {
  prepare_guarded_manifest_directory(
    game_root,
    &format!("{TRANSACTION_DIRECTORY}/{task_id}/{child}"),
  )
}

fn copy_verified(source: &Path, target: &Path, size: u64, md5: &str) -> Result<(), String> {
  let partial = sibling_with_suffix(target, ".part")?;
  remove_optional_file(&partial)?;
  remove_optional_file(target)?;
  copy_plain(source, &partial)?;
  if !file_matches(&partial, size, md5)? {
    let _ = fs::remove_file(&partial);
    return Err("同卷 incoming 资源完整性校验失败".to_string());
  }
  fs::rename(&partial, target).map_err(|error| format!("提交同卷 incoming 资源失败：{error}"))
}

fn copy_plain(source: &Path, target: &Path) -> Result<(), String> {
  remove_optional_file(target)?;
  let mut source = File::open(source).map_err(|error| format!("打开复制源文件失败：{error}"))?;
  let mut target_file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(target)
    .map_err(|error| format!("创建复制目标文件失败：{error}"))?;
  std::io::copy(&mut source, &mut target_file)
    .map_err(|error| format!("复制资源文件失败：{error}"))?;
  target_file.sync_all().map_err(|error| format!("同步资源文件失败：{error}"))
}

fn write_verified_bytes(path: &Path, content: &[u8]) -> Result<(), String> {
  remove_optional_file(path)?;
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(path)
    .map_err(|error| format!("创建提交配置文件失败：{error}"))?;
  file
    .write_all(content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入提交配置文件失败：{error}"))
}

fn file_matches(path: &Path, size: u64, md5: &str) -> Result<bool, String> {
  let metadata = fs::metadata(path).map_err(|error| format!("读取资源文件状态失败：{error}"))?;
  if metadata.len() != size {
    return Ok(false);
  }
  let mut file = File::open(path).map_err(|error| format!("打开资源文件失败：{error}"))?;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  loop {
    let read = file.read(&mut buffer).map_err(|error| format!("读取资源文件失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  Ok(format!("{:x}", hasher.finalize()).eq_ignore_ascii_case(md5))
}

fn file_commit_from_plan(plan: &PersistedPlan) -> Result<FileCommitPlan, String> {
  Ok(FileCommitPlan {
    plan_id: plan.plan_id.clone(),
    digest: plan_sha256(plan)?,
    steps: commit_steps(plan),
  })
}

fn file_commit_from_switch(request: &SwitchApplyRequest) -> FileCommitPlan {
  FileCommitPlan {
    plan_id: request.plan_id.clone(),
    digest: request.digest.clone(),
    steps: request
      .files
      .iter()
      .map(|file| CommitStep {
        kind: file.kind,
        name: file.name.clone(),
        source_size: file.source_size,
        source_md5: file.source_md5.clone(),
        size: file.size,
        md5: file.md5.clone(),
      })
      .collect(),
  }
}

fn verify_switch_files(
  commit: &FileCommitPlan,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  for step in &commit.steps {
    check_canceled(canceled)?;
    match step.kind {
      CommitStepKind::Add | CommitStepKind::Modify => {
        let path = resolve_existing_manifest_file(game_root, &step.name)?;
        if !file_matches(&path, step.size, &step.md5)? {
          return Err(format!("换服文件校验失败：{}", step.name));
        }
      }
      CommitStepKind::Delete => {
        if resolve_optional_manifest_file(game_root, &step.name)?.is_some() {
          return Err(format!("换服应移出的文件仍存在：{}", step.name));
        }
      }
      CommitStepKind::Repair => return Err("换服提交不能包含修复步骤".to_string()),
    }
  }
  Ok(())
}

fn verify_switch_config(
  game_root: &Path,
  channel: u32,
  sub_channel: u32,
  original: &[u8],
) -> Result<(), String> {
  let config = resolve_existing_manifest_file(game_root, "config.ini")?;
  let current = fs::read(&config).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  let expected = patch_channel(original, channel, sub_channel)?;
  if sha256_bytes(&current) != sha256_bytes(&expected) {
    return Err("换服后的 config.ini 与目标渠道配置不一致".to_string());
  }
  let original_version = general_value(original, "game_version")?;
  let current_version = general_value(&current, "game_version")?;
  if original_version != current_version {
    return Err("换服不能改写 game_version".to_string());
  }
  Ok(())
}

fn general_value(content: &[u8], key: &str) -> Result<Option<String>, String> {
  let body = content.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(content);
  let text = std::str::from_utf8(body).map_err(|_| "config.ini 不是有效 UTF-8".to_string())?;
  let mut in_general = false;
  let mut found = None;
  for line in text.lines() {
    let trimmed = line.trim();
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
      let name = trimmed[1..trimmed.len() - 1].trim();
      if in_general {
        break;
      }
      in_general = name.eq_ignore_ascii_case("general");
      continue;
    }
    if !in_general {
      continue;
    }
    let Some((line_key, value)) = line.split_once('=') else {
      continue;
    };
    if line_key.trim().eq_ignore_ascii_case(key) {
      if found.replace(value.trim().to_string()).is_some() {
        return Err(format!("config.ini 包含重复的 {key}"));
      }
    }
  }
  Ok(found)
}

fn finish_failed_switch<F>(
  commit: &FileCommitPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: bool,
  error: String,
  emit: &F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.apply.is_some() {
    journal.state = PackageTaskState::RollingBack;
    journal.error_message = Some(error.clone());
    let _ = persist_and_emit(task_root, journal, emit);
    if let Err(rollback_error) = rollback_file_transaction(commit, game_root, journal) {
      let combined = format!("{error}；自动回滚失败：{rollback_error}");
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(combined.clone());
      let _ = persist_and_emit(task_root, journal, emit);
      return Err(combined);
    }
  }
  cleanup_file_transaction(commit, game_root, task_root);
  journal.apply = None;
  journal.state = if canceled { PackageTaskState::Canceled } else { PackageTaskState::Failed };
  journal.error_message = (!canceled).then_some(error.clone());
  journal.current_file = None;
  journal.download_current_file = None;
  journal.assembly_current_file = None;
  journal.bytes_per_second = 0;
  journal.eta_seconds = None;
  let _ = persist_and_emit(task_root, journal, emit);
  Err(if canceled { "换服已取消".to_string() } else { error })
}

fn patch_game_version(original: &[u8], target_version: &str) -> Result<Vec<u8>, String> {
  patch_general_keys(original, &[("game_version", target_version)])
}

fn patch_channel(original: &[u8], channel: u32, sub_channel: u32) -> Result<Vec<u8>, String> {
  let channel = channel.to_string();
  let sub_channel = sub_channel.to_string();
  patch_general_keys(original, &[("channel", &channel), ("sub_channel", &sub_channel)])
}

fn patch_general_keys(original: &[u8], updates: &[(&str, &str)]) -> Result<Vec<u8>, String> {
  let (bom, body) = original
    .strip_prefix(&[0xef, 0xbb, 0xbf])
    .map_or((&[][..], original), |body| (&[0xef, 0xbb, 0xbf][..], body));
  let text = std::str::from_utf8(body).map_err(|_| "config.ini 不是有效 UTF-8".to_string())?;
  let newline = if text.contains("\r\n") { "\r\n" } else { "\n" };
  let had_trailing_newline = text.ends_with('\n');
  let mut lines = text.lines().map(str::to_string).collect::<Vec<_>>();
  let mut general_start = None;
  let mut general_end = lines.len();
  for (index, line) in lines.iter().enumerate() {
    let trimmed = line.trim();
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
      let name = trimmed[1..trimmed.len() - 1].trim();
      if name.eq_ignore_ascii_case("general") {
        if general_start.is_some() {
          return Err("config.ini 包含重复的 [general] 节".to_string());
        }
        general_start = Some(index);
      } else if general_start.is_some() && general_end == lines.len() {
        general_end = index;
      }
    }
  }
  let start = general_start.ok_or_else(|| "config.ini 缺少 [general] 节".to_string())?;
  for (key, value) in updates {
    let mut key_index = None;
    for (index, line) in lines.iter().enumerate().take(general_end).skip(start + 1) {
      let Some((line_key, _)) = line.split_once('=') else {
        continue;
      };
      if line_key.trim().eq_ignore_ascii_case(key) {
        if key_index.replace(index).is_some() {
          return Err(format!("config.ini 包含重复的 {key}"));
        }
      }
    }
    if let Some(index) = key_index {
      let (line_key, old_value) =
        lines[index].split_once('=').ok_or_else(|| format!("config.ini 的 {key} 格式无效"))?;
      let value_prefix = &old_value[..old_value.len() - old_value.trim_start().len()];
      lines[index] = format!("{line_key}={value_prefix}{value}");
    } else {
      lines.insert(general_end, format!("{key}={value}"));
      general_end += 1;
    }
  }
  let extra: usize = updates.iter().map(|(_, value)| value.len()).sum();
  let mut output = Vec::with_capacity(original.len().saturating_add(extra));
  output.extend_from_slice(bom);
  output.extend_from_slice(lines.join(newline).as_bytes());
  if had_trailing_newline {
    output.extend_from_slice(newline.as_bytes());
  }
  Ok(output)
}

fn sha256_bytes(content: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(content);
  format!("{:x}", hasher.finalize())
}

fn sibling_with_suffix(path: &Path, suffix: &str) -> Result<PathBuf, String> {
  let name = path.file_name().ok_or_else(|| "提交路径缺少文件名".to_string())?;
  let mut partial = name.to_os_string();
  partial.push(suffix);
  Ok(path.with_file_name(partial))
}

fn remove_optional_file(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理任务私有文件失败：{error}")),
  }
}

fn cleanup_known_transaction_files(plan: &PersistedPlan, game_root: &Path, task_root: &Path) {
  if let Ok(commit) = file_commit_from_plan(plan) {
    cleanup_file_transaction(&commit, game_root, task_root);
  }
}

fn cleanup_file_transaction(commit: &FileCommitPlan, game_root: &Path, task_root: &Path) {
  let Ok(incoming_root) = transaction_subdirectory(game_root, &commit.plan_id, "incoming") else {
    return;
  };
  let Ok(backup_root) = transaction_subdirectory(game_root, &commit.plan_id, "backup") else {
    return;
  };
  for step in &commit.steps {
    for root in [&incoming_root, &backup_root] {
      if let Ok(path) = prepare_manifest_output_file(root, &step.name) {
        let _ = remove_optional_file(&path);
        if let Ok(partial) = sibling_with_suffix(&path, ".part") {
          let _ = remove_optional_file(&partial);
        }
      }
    }
  }
  if let Ok(config_root) = transaction_subdirectory(game_root, &commit.plan_id, "config") {
    for name in ["original", "target"] {
      let _ = remove_optional_file(&config_root.join(name));
    }
  }
  let staging_root = task_root.join("tasks").join(&commit.plan_id).join("staging");
  for step in &commit.steps {
    if step.kind == CommitStepKind::Delete {
      continue;
    }
    if let Ok(path) = prepare_manifest_output_file(&staging_root, &step.name) {
      let _ = remove_optional_file(&path);
      if let Ok(partial) = sibling_with_suffix(&path, ".part") {
        let _ = remove_optional_file(&partial);
      }
    }
  }
}

fn cleanup_repair_files(plan: &PersistedPlan, game_root: &Path, task_root: &Path) {
  let Ok(incoming_root) = transaction_subdirectory(game_root, &plan.plan_id, "repair-incoming")
  else {
    return;
  };
  let Ok(backup_root) = transaction_subdirectory(game_root, &plan.plan_id, "repair-backup") else {
    return;
  };
  for file in journal_repair_names(plan, task_root) {
    for root in [&incoming_root, &backup_root] {
      if let Ok(path) = prepare_manifest_output_file(root, &file) {
        let _ = remove_optional_file(&path);
        if let Ok(partial) = sibling_with_suffix(&path, ".part") {
          let _ = remove_optional_file(&partial);
        }
      }
    }
  }
}

fn journal_repair_names(plan: &PersistedPlan, _task_root: &Path) -> Vec<String> {
  plan.inventory.iter().map(|file| file.name.clone()).collect()
}

fn check_canceled(canceled: &AtomicBool) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) { Err("应用更新已取消".to_string()) } else { Ok(()) }
}

fn ensure_game_stopped() -> Result<(), String> {
  if super::package::is_game_running() {
    Err("检测到游戏进程，已停止资源提交并开始安全回滚".to_string())
  } else {
    Ok(())
  }
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
    return Err(format!("原子替换 config.ini 失败：{}", std::io::Error::last_os_error()));
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("原子替换 config.ini 失败：{error}"))
}
