//! 将已验证 staging 资源以可恢复事务提交到游戏目录。
//! @since Beta v0.11.5

use super::{
  assembler::assemble_manifest_plan,
  journal::{
    self, ActiveCommitStep, ApplyJournal, CommitStepKind, CommitStepPhase, ConfigCommitPhase,
    TaskJournal,
  },
  model::{PackagePlanStrategy, PackageTaskState},
  path_guard::{
    prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file, resolve_optional_manifest_file,
  },
  planner::{PersistedPlan, PlanAssetAction},
};
use md5::{Digest as Md5Digest, Md5};
use sha2::Sha256;
use std::{
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::atomic::{AtomicBool, Ordering},
};

const COPY_BUFFER_SIZE: usize = 128 * 1024;
const TRANSACTION_DIRECTORY: &str = ".teyvatguide-update";
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;

#[derive(Clone)]
struct CommitStep {
  kind: CommitStepKind,
  name: String,
  source_size: Option<u64>,
  source_md5: Option<String>,
  size: u64,
  md5: String,
}

/// 组装、提交并验证一个 ReadyToApply manifest-diff 任务。
pub(crate) fn execute_apply<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if plan.strategy != PackagePlanStrategy::ManifestDiff {
    return Err("当前提交器只支持 manifest-diff 资源计划".to_string());
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
  journal.current_file = Some("组装资源文件".to_string());
  persist_and_emit(task_root, journal, &emit)?;
  let result = (|| {
    assemble_manifest_plan(plan, game_root, task_root, canceled)?;
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
    verify_inventory(plan, game_root, canceled)?;
    commit_version(plan, game_root, task_root, journal, &emit)?;
    verify_inventory(plan, game_root, canceled)?;
    journal.state = PackageTaskState::Completed;
    journal.error_message = None;
    journal.current_file = None;
    persist_and_emit(task_root, journal, &emit)
  })();

  if let Err(error) = result {
    let canceled = canceled.load(Ordering::Acquire);
    return finish_failed_apply(plan, game_root, task_root, journal, canceled, error, &emit);
  }
  cleanup_known_transaction_files(plan, game_root, task_root);
  Ok(())
}

/// 回滚一个尚未完成的提交；无法证明安全状态时保留备份并进入 RecoveryRequired。
pub(crate) fn rollback_apply<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
  retry: bool,
  emit: F,
) -> Result<(), String>
where
  F: Fn(&TaskJournal),
{
  if journal.apply.is_some() {
    journal.state = PackageTaskState::RollingBack;
    persist_and_emit(task_root, journal, &emit)?;
    if let Err(error) = rollback_transaction(plan, game_root, journal) {
      journal.state = PackageTaskState::RecoveryRequired;
      journal.error_message = Some(error.clone());
      let _ = persist_and_emit(task_root, journal, &emit);
      return Err(error);
    }
  }
  cleanup_known_transaction_files(plan, game_root, task_root);
  journal.apply = None;
  journal.state = if retry { PackageTaskState::ReadyToApply } else { PackageTaskState::Canceled };
  journal.error_message = None;
  persist_and_emit(task_root, journal, &emit)
}

fn prepare_transaction(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  let steps = commit_steps(plan);
  preflight_targets(&steps, game_root)?;
  let incoming_root = transaction_subdirectory(game_root, &plan.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &plan.plan_id, "backup")?;
  let staging_root = task_root.join("tasks").join(&plan.plan_id).join("staging");
  for step in &steps {
    if resolve_optional_manifest_file(&backup_root, &step.name)?.is_some() {
      return Err(format!("提交备份目录包含未恢复文件：{}", step.name));
    }
    if step.kind == CommitStepKind::Delete {
      continue;
    }
    let source = resolve_existing_manifest_file(&staging_root, &step.name)?;
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    copy_verified(&source, &incoming, step.size, &step.md5)?;
  }

  let config_root = transaction_subdirectory(game_root, &plan.plan_id, "config")?;
  let config_path = resolve_existing_manifest_file(game_root, "config.ini")?;
  let original =
    fs::read(&config_path).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  let target = patch_game_version(&original, &plan.target_tag)?;
  write_verified_bytes(&config_root.join("original"), &original)?;
  write_verified_bytes(&config_root.join("target"), &target)?;
  journal.schema_version = journal::JOURNAL_SCHEMA_VERSION;
  journal.apply = Some(ApplyJournal {
    plan_sha256: plan_sha256(plan)?,
    steps_digest: steps_digest(&steps),
    step_count: steps.len(),
    cursor: 0,
    active_step: None,
    config_original_sha256: sha256_bytes(&original),
    config_target_sha256: sha256_bytes(&target),
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
  let steps = commit_steps(plan);
  validate_plan_identity(journal, plan)?;
  validate_apply_identity(journal, &steps)?;
  let incoming_root = transaction_subdirectory(game_root, &plan.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &plan.plan_id, "backup")?;
  for (index, step) in steps.iter().enumerate().skip(apply(journal)?.cursor) {
    check_canceled(canceled)?;
    let target = prepare_manifest_output_file(game_root, &step.name)?;
    let incoming = prepare_manifest_output_file(&incoming_root, &step.name)?;
    let backup = prepare_manifest_output_file(&backup_root, &step.name)?;
    if step.kind != CommitStepKind::Add {
      ensure_game_stopped()?;
      let current = resolve_existing_manifest_file(game_root, &step.name)?;
      if !source_file_matches(&current, step)? {
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
  let config_path = resolve_existing_manifest_file(game_root, "config.ini")?;
  let current = fs::read(&config_path).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  if sha256_bytes(&current) != apply(journal)?.config_original_sha256 {
    return Err("config.ini 在提交期间发生变化，拒绝更新版本".to_string());
  }
  ensure_game_stopped()?;
  apply_mut(journal)?.config_phase = ConfigCommitPhase::ReplacePending;
  persist_and_emit(task_root, journal, emit)?;
  let config_root = transaction_subdirectory(game_root, &plan.plan_id, "config")?;
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
    return Err("config.ini 版本提交后完整性校验失败".to_string());
  }
  apply_mut(journal)?.config_phase = ConfigCommitPhase::Replaced;
  persist_and_emit(task_root, journal, emit)
}

fn verify_inventory(
  plan: &PersistedPlan,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  for file in &plan.inventory {
    check_canceled(canceled)?;
    let path = resolve_existing_manifest_file(game_root, &file.name)
      .map_err(|error| format!("目标清单文件缺失：{}：{error}", file.name))?;
    if !file_matches(&path, file.size, &file.md5)? {
      return Err(format!("目标清单文件校验失败：{}", file.name));
    }
  }
  for deleted in &plan.delete_files {
    check_canceled(canceled)?;
    if resolve_optional_manifest_file(game_root, &deleted.name)?.is_some() {
      return Err(format!("目标版本应删除的文件仍然存在：{}", deleted.name));
    }
  }
  Ok(())
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
    if let Err(rollback_error) = rollback_transaction(plan, game_root, journal) {
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

fn rollback_transaction(
  plan: &PersistedPlan,
  game_root: &Path,
  journal: &TaskJournal,
) -> Result<(), String> {
  let steps = commit_steps(plan);
  validate_plan_identity(journal, plan)?;
  validate_apply_identity(journal, &steps)?;
  rollback_config(plan, game_root, journal)?;
  let incoming_root = transaction_subdirectory(game_root, &plan.plan_id, "incoming")?;
  let backup_root = transaction_subdirectory(game_root, &plan.plan_id, "backup")?;
  for step in steps.iter().rev() {
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
    }
  }
  Ok(())
}

fn rollback_config(
  plan: &PersistedPlan,
  game_root: &Path,
  journal: &TaskJournal,
) -> Result<(), String> {
  let config = resolve_existing_manifest_file(game_root, "config.ini")?;
  let current = fs::read(&config).map_err(|error| format!("读取 config.ini 失败：{error}"))?;
  let current_hash = sha256_bytes(&current);
  let apply = apply(journal)?;
  if current_hash == apply.config_original_sha256 {
    return Ok(());
  }
  if current_hash != apply.config_target_sha256 {
    return Err("config.ini 既不匹配源版本也不匹配目标版本".to_string());
  }
  let config_root = transaction_subdirectory(game_root, &plan.plan_id, "config")?;
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

fn validate_plan_identity(journal: &TaskJournal, plan: &PersistedPlan) -> Result<(), String> {
  if apply(journal)?.plan_sha256 != plan_sha256(plan)? {
    return Err("提交日志与完整资源计划不匹配".to_string());
  }
  Ok(())
}

fn plan_sha256(plan: &PersistedPlan) -> Result<String, String> {
  let bytes = serde_json::to_vec(plan).map_err(|error| format!("序列化资源计划失败：{error}"))?;
  Ok(sha256_bytes(&bytes))
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

fn patch_game_version(original: &[u8], target_version: &str) -> Result<Vec<u8>, String> {
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
  let mut version_index = None;
  for (index, line) in lines.iter().enumerate().take(general_end).skip(start + 1) {
    let Some((key, _)) = line.split_once('=') else {
      continue;
    };
    if key.trim().eq_ignore_ascii_case("game_version") {
      if version_index.replace(index).is_some() {
        return Err("config.ini 包含重复的 game_version".to_string());
      }
    }
  }
  if let Some(index) = version_index {
    let (key, value) = lines[index]
      .split_once('=')
      .ok_or_else(|| "config.ini 的 game_version 格式无效".to_string())?;
    let value_prefix = &value[..value.len() - value.trim_start().len()];
    lines[index] = format!("{key}={value_prefix}{target_version}");
  } else {
    lines.insert(general_end, format!("game_version={target_version}"));
  }
  let mut output = Vec::with_capacity(original.len().saturating_add(target_version.len()));
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
  let Ok(incoming_root) = transaction_subdirectory(game_root, &plan.plan_id, "incoming") else {
    return;
  };
  let Ok(backup_root) = transaction_subdirectory(game_root, &plan.plan_id, "backup") else {
    return;
  };
  for step in commit_steps(plan) {
    for root in [&incoming_root, &backup_root] {
      if let Ok(path) = prepare_manifest_output_file(root, &step.name) {
        let _ = remove_optional_file(&path);
        if let Ok(partial) = sibling_with_suffix(&path, ".part") {
          let _ = remove_optional_file(&partial);
        }
      }
    }
  }
  if let Ok(config_root) = transaction_subdirectory(game_root, &plan.plan_id, "config") {
    for name in ["original", "target"] {
      let _ = remove_optional_file(&config_root.join(name));
    }
  }
  let staging_root = task_root.join("tasks").join(&plan.plan_id).join("staging");
  for asset in &plan.assets {
    if let Ok(path) = prepare_manifest_output_file(&staging_root, &asset.name) {
      let _ = remove_optional_file(&path);
      if let Ok(partial) = sibling_with_suffix(&path, ".part") {
        let _ = remove_optional_file(&partial);
      }
    }
  }
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

#[cfg(test)]
mod tests {
  use super::{
    atomic_replace, commit_resources, execute_apply, patch_game_version, prepare_transaction,
    rollback_apply, transaction_subdirectory,
  };
  use crate::game::{
    assembler::assemble_manifest_plan,
    journal::{ActiveCommitStep, CommitStepKind, CommitStepPhase, ConfigCommitPhase, TaskJournal},
    model::{PackagePlanStrategy, PackagePlanTarget, PackageTaskState, SchemeId},
    planner::{PersistedPlan, PlanAsset, PlanAssetAction, PlanDelete, PlanFile, PlanSource},
  };
  use md5::{Digest, Md5};
  use std::{fs, path::PathBuf, sync::atomic::AtomicBool};
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-committer-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }

    fn game(&self) -> PathBuf {
      self.0.join("game")
    }

    fn tasks(&self) -> PathBuf {
      self.0.join("tasks")
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn md5(bytes: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
  }

  fn plan(task_id: &str, bad_inventory: bool) -> PersistedPlan {
    let empty_md5 = md5(b"");
    let keep_md5 = if bad_inventory { "f".repeat(32) } else { md5(b"keep") };
    PersistedPlan {
      schema_version: 4,
      plan_id: task_id.to_string(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::PreDownload,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      strategy: PackagePlanStrategy::ManifestDiff,
      downloads: Vec::new(),
      assets: vec![
        PlanAsset {
          name: "modify.bin".to_string(),
          action: PlanAssetAction::Modify,
          source: Some(PlanSource { size: 8, md5: md5(b"original") }),
          size: 0,
          md5: empty_md5.clone(),
          chunks: Vec::new(),
          patch: None,
        },
        PlanAsset {
          name: "new.bin".to_string(),
          action: PlanAssetAction::Add,
          source: None,
          size: 0,
          md5: empty_md5.clone(),
          chunks: Vec::new(),
          patch: None,
        },
      ],
      delete_files: vec![PlanDelete {
        name: "delete.bin".to_string(),
        size: 6,
        md5: md5(b"delete"),
      }],
      inventory: vec![
        PlanFile { name: "keep.bin".to_string(), size: 4, md5: keep_md5 },
        PlanFile { name: "modify.bin".to_string(), size: 0, md5: empty_md5.clone() },
        PlanFile { name: "new.bin".to_string(), size: 0, md5: empty_md5 },
      ],
      created_at: "2026-08-19T00:00:00Z".to_string(),
    }
  }

  fn prepare(root: &TempRoot) {
    fs::create_dir_all(root.game()).unwrap();
    fs::create_dir_all(root.tasks()).unwrap();
    fs::write(
      root.game().join("config.ini"),
      b"[general]\r\nchannel=1\r\nsub_channel=1\r\ngame_version=1.0.0\r\n",
    )
    .unwrap();
    fs::write(root.game().join("keep.bin"), b"keep").unwrap();
    fs::write(root.game().join("modify.bin"), b"original").unwrap();
    fs::write(root.game().join("delete.bin"), b"delete").unwrap();
  }

  #[test]
  fn applies_resources_and_updates_version_last() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    execute_apply(
      &plan,
      &root.game(),
      &root.tasks(),
      &mut journal,
      &AtomicBool::new(false),
      |_| {},
    )
    .unwrap();
    assert_eq!(journal.state, PackageTaskState::Completed);
    assert_eq!(journal.current_file, None);
    assert!(root.game().join("new.bin").is_file());
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"");
    assert!(!root.game().join("delete.bin").exists());
    let config = fs::read_to_string(root.game().join("config.ini")).unwrap();
    assert!(config.contains("game_version=2.0.0"));
  }

  #[test]
  fn full_inventory_failure_rolls_back_all_resource_kinds() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), true);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assert!(
      execute_apply(
        &plan,
        &root.game(),
        &root.tasks(),
        &mut journal,
        &AtomicBool::new(false),
        |_| {},
      )
      .is_err()
    );
    assert_eq!(journal.state, PackageTaskState::ReadyToApply);
    assert!(!root.game().join("new.bin").exists());
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"original");
    assert_eq!(fs::read(root.game().join("delete.bin")).unwrap(), b"delete");
    let config = fs::read_to_string(root.game().join("config.ini")).unwrap();
    assert!(config.contains("game_version=1.0.0"));
  }

  #[test]
  fn rejects_modified_source_before_any_game_mutation() {
    let root = TempRoot::new();
    prepare(&root);
    fs::write(root.game().join("modify.bin"), b"external").unwrap();
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assert!(
      execute_apply(
        &plan,
        &root.game(),
        &root.tasks(),
        &mut journal,
        &AtomicBool::new(false),
        |_| {},
      )
      .is_err()
    );
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"external");
    assert_eq!(fs::read(root.game().join("delete.bin")).unwrap(), b"delete");
    assert!(!root.game().join("new.bin").exists());
  }

  #[test]
  fn recovery_reconciles_rename_after_backup_intent() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assemble_manifest_plan(&plan, &root.game(), &root.tasks(), &AtomicBool::new(false)).unwrap();
    prepare_transaction(&plan, &root.game(), &root.tasks(), &mut journal).unwrap();
    journal.state = PackageTaskState::Committing;
    journal.apply.as_mut().unwrap().active_step = Some(ActiveCommitStep {
      index: 0,
      kind: CommitStepKind::Modify,
      phase: CommitStepPhase::BackupPending,
      relative_path: "modify.bin".to_string(),
    });
    let backup =
      transaction_subdirectory(&root.game(), &plan.plan_id, "backup").unwrap().join("modify.bin");
    fs::rename(root.game().join("modify.bin"), backup).unwrap();
    rollback_apply(&plan, &root.game(), &root.tasks(), &mut journal, false, |_| {}).unwrap();
    assert_eq!(journal.state, PackageTaskState::Canceled);
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"original");
  }

  #[test]
  fn recovery_preserves_corrupted_backup_for_manual_attention() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assemble_manifest_plan(&plan, &root.game(), &root.tasks(), &AtomicBool::new(false)).unwrap();
    prepare_transaction(&plan, &root.game(), &root.tasks(), &mut journal).unwrap();
    journal.state = PackageTaskState::Committing;
    let backup =
      transaction_subdirectory(&root.game(), &plan.plan_id, "backup").unwrap().join("modify.bin");
    fs::rename(root.game().join("modify.bin"), &backup).unwrap();
    fs::write(&backup, b"corrupt").unwrap();
    assert!(
      rollback_apply(&plan, &root.game(), &root.tasks(), &mut journal, false, |_| {}).is_err()
    );
    assert_eq!(journal.state, PackageTaskState::RecoveryRequired);
    assert_eq!(fs::read(backup).unwrap(), b"corrupt");
    assert!(!root.game().join("modify.bin").exists());
  }

  #[test]
  fn recovery_rejects_corrupted_already_restored_resource() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assemble_manifest_plan(&plan, &root.game(), &root.tasks(), &AtomicBool::new(false)).unwrap();
    prepare_transaction(&plan, &root.game(), &root.tasks(), &mut journal).unwrap();
    journal.state = PackageTaskState::RollingBack;
    fs::write(root.game().join("modify.bin"), b"unknown").unwrap();

    assert!(
      rollback_apply(&plan, &root.game(), &root.tasks(), &mut journal, false, |_| {}).is_err()
    );
    assert_eq!(journal.state, PackageTaskState::RecoveryRequired);
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"unknown");
    let incoming =
      transaction_subdirectory(&root.game(), &plan.plan_id, "incoming").unwrap().join("modify.bin");
    assert_eq!(fs::read(incoming).unwrap(), b"");
  }

  #[test]
  fn recovery_restores_config_replaced_after_write_ahead_intent() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assemble_manifest_plan(&plan, &root.game(), &root.tasks(), &AtomicBool::new(false)).unwrap();
    prepare_transaction(&plan, &root.game(), &root.tasks(), &mut journal).unwrap();
    journal.state = PackageTaskState::Committing;
    commit_resources(
      &plan,
      &root.game(),
      &mut journal,
      &root.tasks(),
      &AtomicBool::new(false),
      &|_| {},
    )
    .unwrap();
    journal.apply.as_mut().unwrap().config_phase = ConfigCommitPhase::ReplacePending;
    let config_root = transaction_subdirectory(&root.game(), &plan.plan_id, "config").unwrap();
    atomic_replace(&config_root.join("target"), &root.game().join("config.ini")).unwrap();
    rollback_apply(&plan, &root.game(), &root.tasks(), &mut journal, false, |_| {}).unwrap();
    assert_eq!(fs::read(root.game().join("modify.bin")).unwrap(), b"original");
    assert_eq!(fs::read(root.game().join("delete.bin")).unwrap(), b"delete");
    assert!(!root.game().join("new.bin").exists());
    let config = fs::read_to_string(root.game().join("config.ini")).unwrap();
    assert!(config.contains("game_version=1.0.0"));
  }

  #[test]
  fn recovery_never_restores_unverified_config_backup() {
    let root = TempRoot::new();
    prepare(&root);
    let plan = plan(&Uuid::new_v4().to_string(), false);
    let mut journal = TaskJournal::from_plan(&plan);
    journal.state = PackageTaskState::ReadyToApply;
    assemble_manifest_plan(&plan, &root.game(), &root.tasks(), &AtomicBool::new(false)).unwrap();
    prepare_transaction(&plan, &root.game(), &root.tasks(), &mut journal).unwrap();
    journal.state = PackageTaskState::Verifying;
    let config_root = transaction_subdirectory(&root.game(), &plan.plan_id, "config").unwrap();
    atomic_replace(&config_root.join("target"), &root.game().join("config.ini")).unwrap();
    fs::write(config_root.join("original"), b"corrupt").unwrap();
    assert!(
      rollback_apply(&plan, &root.game(), &root.tasks(), &mut journal, false, |_| {}).is_err()
    );
    assert_eq!(journal.state, PackageTaskState::RecoveryRequired);
    let config = fs::read_to_string(root.game().join("config.ini")).unwrap();
    assert!(config.contains("game_version=2.0.0"));
  }

  #[test]
  fn patches_only_unique_general_game_version_and_preserves_layout() {
    let original =
      b"\xef\xbb\xbf[general]\r\nchannel=1\r\ngame_version = 1.0.0\r\n[other]\r\nvalue=1\r\n";
    let patched = patch_game_version(original, "2.0.0").unwrap();
    assert_eq!(
      patched,
      b"\xef\xbb\xbf[general]\r\nchannel=1\r\ngame_version = 2.0.0\r\n[other]\r\nvalue=1\r\n"
    );
    assert!(patch_game_version(b"[general]\ngame_version=1\ngame_version=2\n", "3").is_err());
  }
}
