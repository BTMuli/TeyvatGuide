//! 将已验证的 manifest-diff 计划流式组装到任务 staging 目录。
//! @since Beta v0.11.5

use super::{
  model::PackagePlanStrategy,
  path_guard::{
    prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file,
  },
  planner::{
    PayloadEncoding, PersistedPlan, PlanAsset, PlanChunk, PlanDownload, PlanPatch,
    cached_chunk_matches,
  },
};
use md5::{Digest, Md5};
use std::{
  collections::{HashMap, HashSet},
  fs::{self, File, OpenOptions},
  io::{BufReader, Read, Seek, SeekFrom, Write},
  path::{Path, PathBuf},
  sync::{
    Mutex,
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc,
  },
  time::Instant,
};

const COPY_BUFFER_SIZE: usize = 128 * 1024;

/// 已成功写入 staging 的资源统计。
#[derive(Debug, Default, Eq, PartialEq)]
pub(crate) struct AssemblySummary {
  pub(crate) asset_count: usize,
  pub(crate) assembled_bytes: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum InstallAssetValidationKind {
  Missing,
  ContentMismatch,
  Unsafe,
  Other,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct InstallAssetValidationFailure {
  pub(crate) asset_index: usize,
  pub(crate) path: String,
  pub(crate) kind: InstallAssetValidationKind,
  pub(crate) message: String,
}

impl InstallAssetValidationFailure {
  pub(crate) fn repairable(&self) -> bool {
    matches!(
      self.kind,
      InstallAssetValidationKind::Missing | InstallAssetValidationKind::ContentMismatch
    )
  }
}

/// Scalar timing counters for one full-install asset assembly operation.
///
/// The counters intentionally contain no asset, chunk, cache-key, or path
/// identity.  A caller can aggregate them into a task-level performance
/// record without emitting per-chunk diagnostics.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct AssemblyTiming {
  pub(crate) zstd_decode_read_micros: u64,
  pub(crate) zstd_decode_read_count: u64,
  pub(crate) zstd_decode_read_bytes: u64,
  pub(crate) chunk_md5_micros: u64,
  pub(crate) chunk_md5_count: u64,
  pub(crate) chunk_md5_bytes: u64,
  pub(crate) asset_md5_micros: u64,
  pub(crate) asset_md5_count: u64,
  pub(crate) asset_md5_bytes: u64,
  pub(crate) staging_file_sync_micros: u64,
  pub(crate) staging_file_sync_count: u64,
  pub(crate) staging_file_sync_bytes: u64,
}

impl AssemblyTiming {
  fn record_zstd_decode_read(&mut self, elapsed_micros: u64, bytes: u64) {
    self.zstd_decode_read_micros = self.zstd_decode_read_micros.saturating_add(elapsed_micros);
    self.zstd_decode_read_count = self.zstd_decode_read_count.saturating_add(1);
    self.zstd_decode_read_bytes = self.zstd_decode_read_bytes.saturating_add(bytes);
  }

  fn record_chunk_md5(&mut self, elapsed_micros: u64, bytes: u64) {
    self.chunk_md5_micros = self.chunk_md5_micros.saturating_add(elapsed_micros);
    self.chunk_md5_count = self.chunk_md5_count.saturating_add(1);
    self.chunk_md5_bytes = self.chunk_md5_bytes.saturating_add(bytes);
  }

  fn record_asset_md5(&mut self, elapsed_micros: u64, bytes: u64) {
    self.asset_md5_micros = self.asset_md5_micros.saturating_add(elapsed_micros);
    self.asset_md5_count = self.asset_md5_count.saturating_add(1);
    self.asset_md5_bytes = self.asset_md5_bytes.saturating_add(bytes);
  }

  fn record_staging_file_sync(&mut self, elapsed_micros: u64, bytes: u64) {
    self.staging_file_sync_micros = self.staging_file_sync_micros.saturating_add(elapsed_micros);
    self.staging_file_sync_count = self.staging_file_sync_count.saturating_add(1);
    self.staging_file_sync_bytes = self.staging_file_sync_bytes.saturating_add(bytes);
  }
}

fn duration_micros(duration: std::time::Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

/// Progress reported after a game asset has been fully assembled and verified.
///
/// The byte counters intentionally describe output game assets, rather than
/// downloaded payloads.  This keeps assembly progress independent from the
/// download counters shown by the task journal.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct AssemblyProgress {
  pub(crate) completed_count: usize,
  pub(crate) total_count: usize,
  pub(crate) completed_bytes: u64,
  pub(crate) total_bytes: u64,
  pub(crate) current_file: Option<String>,
}

/// Immutable, reusable lookup for downloads in a full-install plan.
///
/// The index stores only the download id and its position in the plan.  It
/// therefore avoids cloning every [`PlanDownload`] while remaining owned and
/// safe to share between assembly workers.  Callers must keep using the same
/// immutable plan that was passed to [`Self::from_plan`].
#[derive(Debug)]
pub(crate) struct FullInstallDownloadIndex {
  by_id: HashMap<String, usize>,
}

impl FullInstallDownloadIndex {
  pub(crate) fn from_plan(plan: &PersistedPlan) -> Result<Self, String> {
    let mut by_id = HashMap::with_capacity(plan.downloads.len());
    for (index, download) in plan.downloads.iter().enumerate() {
      if by_id.insert(download.id.clone(), index).is_some() {
        return Err(format!("全新安装计划下载项重复：{}", download.id));
      }
    }
    Ok(Self { by_id })
  }

  pub(crate) fn get<'a>(&self, plan: &'a PersistedPlan, id: &str) -> Option<&'a PlanDownload> {
    self.by_id.get(id).and_then(|index| plan.downloads.get(*index))
  }
}

struct FullInstallDownloadLookup<'a> {
  plan: &'a PersistedPlan,
  index: &'a FullInstallDownloadIndex,
}

trait DownloadLookup {
  fn get(&self, id: &str) -> Option<&PlanDownload>;
}

impl DownloadLookup for HashMap<&str, &PlanDownload> {
  fn get(&self, id: &str) -> Option<&PlanDownload> {
    HashMap::get(self, id).copied()
  }
}

impl DownloadLookup for FullInstallDownloadLookup<'_> {
  fn get(&self, id: &str) -> Option<&PlanDownload> {
    self.index.get(self.plan, id)
  }
}

pub(crate) fn assemble_full_install_asset(
  plan: &PersistedPlan,
  download_index: &FullInstallDownloadIndex,
  asset_index: usize,
  staging_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  assemble_full_install_asset_inner(
    plan,
    download_index,
    asset_index,
    staging_root,
    shared_cache_root,
    spool_root,
    canceled,
    None,
  )
}

/// Assemble one full-install asset while writing timing counters into a
/// caller-owned observer.  The observer makes partial timing available to the
/// caller even when the assembly returns an error, without changing the
/// existing `String` error contract.
#[allow(dead_code)]
pub(crate) fn assemble_full_install_asset_with_timing_observer(
  plan: &PersistedPlan,
  download_index: &FullInstallDownloadIndex,
  asset_index: usize,
  staging_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  canceled: &AtomicBool,
  timing: &mut AssemblyTiming,
) -> Result<(), String> {
  assemble_full_install_asset_inner(
    plan,
    download_index,
    asset_index,
    staging_root,
    shared_cache_root,
    spool_root,
    canceled,
    Some(timing),
  )
}

fn assemble_full_install_asset_inner(
  plan: &PersistedPlan,
  download_index: &FullInstallDownloadIndex,
  asset_index: usize,
  staging_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  if plan.strategy != PackagePlanStrategy::Full {
    return Err("安装组装器只接受 Full 计划".to_string());
  }
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let downloads = FullInstallDownloadLookup { plan, index: download_index };
  validate_asset_layout(asset, &downloads)?;
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  if output.exists()
    && verified_asset_file_with_timing(&output, asset, canceled, timing.as_deref_mut())?
  {
    return Ok(());
  }
  assemble_asset_with_fallback_with_timing(
    asset,
    &downloads,
    staging_root,
    shared_cache_root,
    spool_root,
    staging_root,
    canceled,
    timing,
  )
}

/// 从逐文件证据和必要的内容复验中重建可恢复的已完成资源集合。
///
/// 缺失或内容损坏的资源按“尚未完成”返回，路径安全和环境错误则阻止继续安装。
pub(crate) fn discover_completed_install_assets(
  plan: &PersistedPlan,
  task_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
) -> Result<HashSet<usize>, String> {
  if plan.strategy != PackagePlanStrategy::Full {
    return Err("安装组装器只接受 Full 计划".to_string());
  }
  let root_identity = super::installer::directory_identity(staging_root)?;
  let mut completed = super::evidence::trusted_asset_indices(task_root, plan, staging_root)?;
  for (index, asset) in plan.assets.iter().enumerate() {
    if completed.contains(&index) {
      continue;
    }
    match validate_install_asset_with_evidence(
      plan,
      task_root,
      staging_root,
      asset,
      index,
      root_identity,
      canceled,
    ) {
      Ok(()) => {
        completed.insert(index);
      }
      Err(failure) if failure.repairable() => {
        super::evidence::invalidate_asset_evidence(task_root, plan, index)?;
      }
      Err(failure) => return Err(failure.message),
    }
  }
  Ok(completed)
}

/// 校验全部主资源，返回首个可用于自动修复决策的结构化失败。
pub(crate) fn validate_full_install_assets_for_repair(
  plan: &PersistedPlan,
  task_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), InstallAssetValidationFailure> {
  let root_identity = super::installer::directory_identity(staging_root).map_err(|message| {
    InstallAssetValidationFailure {
      asset_index: 0,
      path: String::new(),
      kind: InstallAssetValidationKind::Other,
      message,
    }
  })?;
  for (index, asset) in plan.assets.iter().enumerate() {
    validate_install_asset_with_evidence(
      plan,
      task_root,
      staging_root,
      asset,
      index,
      root_identity,
      canceled,
    )?;
  }
  Ok(())
}

fn validate_install_asset_with_evidence(
  plan: &PersistedPlan,
  task_root: &Path,
  staging_root: &Path,
  asset: &PlanAsset,
  index: usize,
  root_identity: (u64, u64),
  canceled: &AtomicBool,
) -> Result<(), InstallAssetValidationFailure> {
  let failure = |kind, message| InstallAssetValidationFailure {
    asset_index: index,
    path: asset.name.clone(),
    kind,
    message,
  };
  check_canceled(canceled)
    .map_err(|message| failure(InstallAssetValidationKind::Other, message))?;
  let path = prepare_manifest_output_file(staging_root, &asset.name)
    .map_err(|message| failure(InstallAssetValidationKind::Unsafe, message))?;
  // 单条旧证据或损坏证据不阻止内容复验；可信状态仍必须由实际文件重新建立。
  let evidence = super::evidence::load_asset_evidence(task_root, plan, index).ok().flatten();
  let trusted = evidence.as_ref().is_some_and(|evidence| {
    evidence.path == asset.name
      && evidence.expected_size == asset.size
      && evidence.expected_md5.eq_ignore_ascii_case(&asset.md5)
      && evidence.actual_size == asset.size
      && evidence.actual_md5.eq_ignore_ascii_case(&asset.md5)
      && evidence.staging_volume_serial == root_identity.0
      && evidence.staging_file_id == root_identity.1
      && super::evidence::file_matches_evidence(staging_root, evidence).unwrap_or(false)
  });
  if trusted {
    return Ok(());
  }
  let metadata = fs::symlink_metadata(&path).map_err(|error| {
    let kind = if error.kind() == std::io::ErrorKind::NotFound {
      InstallAssetValidationKind::Missing
    } else {
      InstallAssetValidationKind::Other
    };
    failure(kind, format!("读取已完成安装资源失败：{}：{error}", asset.name))
  })?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err(failure(
      InstallAssetValidationKind::Unsafe,
      format!("已完成安装资源不是普通文件：{}", asset.name),
    ));
  }
  let verified = verified_asset_file_with_timing(&path, asset, canceled, None)
    .map_err(|message| failure(InstallAssetValidationKind::Other, message))?;
  if !verified {
    return Err(failure(
      InstallAssetValidationKind::ContentMismatch,
      format!("已完成安装资源校验失败：{}", asset.name),
    ));
  }
  super::evidence::capture_and_persist_asset_evidence(task_root, plan, index, staging_root)
    .map_err(|message| failure(InstallAssetValidationKind::Other, message))?;
  Ok(())
}

pub(crate) fn assemble_manifest_plan_with_progress_concurrent<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
  concurrency: usize,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  check_canceled(canceled)?;
  let staging_root =
    prepare_guarded_manifest_directory(task_root, &format!("tasks/{}/staging", plan.plan_id))?;
  assemble_manifest_plan_to_root_with_progress_concurrent(
    plan,
    game_root,
    task_root,
    &staging_root,
    canceled,
    concurrency,
    &mut progress,
  )
}

/// Assemble a manifest-diff or patch plan with bounded file-level parallelism.
pub(crate) fn assemble_plan_to_root_with_progress_concurrent<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
  concurrency: usize,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  match plan.strategy {
    PackagePlanStrategy::ManifestDiff => assemble_manifest_plan_to_root_with_progress_concurrent(
      plan,
      game_root,
      task_root,
      output_root,
      canceled,
      concurrency,
      &mut progress,
    ),
    PackagePlanStrategy::Patch => assemble_patch_plan_to_root_with_progress_concurrent(
      plan,
      game_root,
      task_root,
      output_root,
      canceled,
      concurrency,
      &mut progress,
    ),
    PackagePlanStrategy::Full => Err("全新安装计划必须使用专用安装组装器".to_string()),
  }
}

/// Assemble and verify one manifest-diff or patch asset after all of its download inputs exist.
pub(crate) fn assemble_plan_asset_to_root(
  plan: &PersistedPlan,
  asset_index: usize,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  check_canceled(canceled)?;
  let asset = plan.assets.get(asset_index).ok_or_else(|| "资源组装游标越界".to_string())?;
  let cache_root = task_root.join("cache").join("chunks");
  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  match plan.strategy {
    PackagePlanStrategy::ManifestDiff => {
      validate_asset_layout(asset, &downloads)?;
      assemble_asset(asset, &downloads, game_root, &cache_root, output_root, canceled)
    }
    PackagePlanStrategy::Patch => {
      let patch =
        asset.patch.as_ref().ok_or_else(|| format!("patch 资源缺少差分元数据：{}", asset.name))?;
      let download = downloads
        .get(patch.id.as_str())
        .ok_or_else(|| format!("patch 资源缺少下载缓存：{}", asset.name))?;
      assemble_patch_asset(asset, patch, download, game_root, &cache_root, output_root, canceled)
    }
    PackagePlanStrategy::Full => Err("全新安装计划必须使用专用安装组装器".to_string()),
  }
}

pub(crate) fn default_assembly_concurrency() -> usize {
  max_assembly_concurrency()
}

fn max_assembly_concurrency() -> usize {
  std::thread::available_parallelism().map(|value| value.get()).unwrap_or(1).max(1)
}

fn assemble_manifest_plan_to_root_with_progress_concurrent<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
  concurrency: usize,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  if plan.strategy != PackagePlanStrategy::ManifestDiff {
    return Err("当前组装器只支持 manifest-diff 资源计划".to_string());
  }
  check_canceled(canceled)?;
  if plan.downloads.iter().any(|download| download.encoding == PayloadEncoding::LegacyUnspecified) {
    return Err("资源计划缺少载荷编码；请重新验证远端清单".to_string());
  }
  let cache_root = task_root.join("cache").join("chunks");
  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  for asset in &plan.assets {
    validate_asset_layout(asset, &downloads)?;
  }
  let (total_count, total_bytes) = assembly_totals(plan)?;
  assemble_assets_parallel(
    &plan.assets,
    concurrency,
    canceled,
    |_, asset| assemble_asset(asset, &downloads, game_root, &cache_root, output_root, canceled),
    total_count,
    total_bytes,
    &mut progress,
  )
}

fn assemble_patch_plan_to_root_with_progress_concurrent<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
  concurrency: usize,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  if plan.strategy != PackagePlanStrategy::Patch {
    return Err("当前差分组装器只支持 patch 资源计划".to_string());
  }
  check_canceled(canceled)?;
  if plan.downloads.iter().any(|download| download.encoding == PayloadEncoding::LegacyUnspecified) {
    return Err("资源计划缺少载荷编码；请重新验证远端清单".to_string());
  }
  let cache_root = task_root.join("cache").join("chunks");
  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  for asset in &plan.assets {
    let patch =
      asset.patch.as_ref().ok_or_else(|| format!("patch 资源缺少差分元数据：{}", asset.name))?;
    downloads
      .get(patch.id.as_str())
      .ok_or_else(|| format!("patch 资源缺少下载缓存：{}", asset.name))?;
  }
  let (total_count, total_bytes) = assembly_totals(plan)?;
  assemble_assets_parallel(
    &plan.assets,
    concurrency,
    canceled,
    |_, asset| {
      let patch =
        asset.patch.as_ref().ok_or_else(|| format!("patch 资源缺少差分元数据：{}", asset.name))?;
      let download = downloads
        .get(patch.id.as_str())
        .ok_or_else(|| format!("patch 资源缺少下载缓存：{}", asset.name))?;
      assemble_patch_asset(asset, patch, download, game_root, &cache_root, output_root, canceled)
    },
    total_count,
    total_bytes,
    &mut progress,
  )
}

fn assemble_assets_parallel<F, P>(
  assets: &[PlanAsset],
  concurrency: usize,
  canceled: &AtomicBool,
  assemble: F,
  total_count: usize,
  total_bytes: u64,
  mut progress: P,
) -> Result<AssemblySummary, String>
where
  F: Fn(usize, &PlanAsset) -> Result<(), String> + Sync,
  P: FnMut(&AssemblyProgress),
{
  if assets.is_empty() {
    return Ok(AssemblySummary::default());
  }
  let worker_count = assets.len().min(concurrency.max(1));
  let next = AtomicUsize::new(0);
  let error = Mutex::new(None::<String>);
  let (sender, receiver) = mpsc::channel::<usize>();
  let summary = std::thread::scope(|scope| {
    for _ in 0..worker_count {
      let sender = sender.clone();
      let next = &next;
      let error = &error;
      let assets = assets;
      let canceled = canceled;
      let assemble = &assemble;
      scope.spawn(move || {
        loop {
          if canceled.load(Ordering::Acquire)
            || error.lock().ok().is_some_and(|guard| guard.is_some())
          {
            return;
          }
          let index = next.fetch_add(1, Ordering::Relaxed);
          if index >= assets.len() {
            return;
          }
          match assemble(index, &assets[index]) {
            Ok(()) => {
              let _ = sender.send(index);
            }
            Err(message) => {
              if let Ok(mut slot) = error.lock() {
                if slot.is_none() {
                  *slot = Some(message);
                }
              }
              return;
            }
          }
        }
      });
    }
    drop(sender);
    let mut summary = AssemblySummary::default();
    for index in receiver {
      summary.asset_count += 1;
      summary.assembled_bytes = summary.assembled_bytes.saturating_add(assets[index].size);
      report_asset_progress(
        &mut progress,
        summary.asset_count,
        total_count,
        summary.assembled_bytes,
        total_bytes,
        &assets[index].name,
      );
    }
    summary
  });
  if let Some(message) = error.lock().map_err(|_| "组装 worker 错误锁已损坏".to_string())?.clone()
  {
    return Err(message);
  }
  check_canceled(canceled)?;
  if summary.asset_count != assets.len() {
    return Err("组装 worker 未完成全部资源".to_string());
  }
  Ok(summary)
}

fn assembly_totals(plan: &PersistedPlan) -> Result<(usize, u64), String> {
  let total_bytes = plan.assets.iter().try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "组装资源总大小溢出".to_string())
  })?;
  Ok((plan.assets.len(), total_bytes))
}

fn report_asset_progress(
  progress: &mut impl FnMut(&AssemblyProgress),
  completed_count: usize,
  total_count: usize,
  completed_bytes: u64,
  total_bytes: u64,
  current_file: &str,
) {
  progress(&AssemblyProgress {
    completed_count,
    total_count,
    completed_bytes,
    total_bytes,
    current_file: Some(current_file.to_string()),
  });
}

fn assemble_patch_asset(
  asset: &PlanAsset,
  patch: &PlanPatch,
  download: &super::planner::PlanDownload,
  game_root: &Path,
  cache_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  if !asset.chunks.is_empty() {
    return Err(format!("patch 资源不能包含 chunk：{}", asset.name));
  }
  if patch.range_length == 0
    || patch
      .range_start
      .checked_add(patch.range_length)
      .is_none_or(|end| end > download.compressed_size)
  {
    return Err(format!("patch 范围超出差分容器：{}", asset.name));
  }
  if !cached_chunk_matches(cache_root, download) {
    return Err(format!("差分容器完整性复验失败：{}", patch.id));
  }
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  let partial = partial_path(&output)?;
  remove_stale_partial(&partial)?;
  remove_stale_output(&output)?;
  let result = (|| {
    if patch.original_name.is_empty() {
      if patch.range_length != asset.size {
        return Err(format!("新增 patch 范围与目标大小不一致：{}", asset.name));
      }
      copy_container_range(cache_root, download, patch, &partial, canceled)?;
    } else {
      apply_hdiff_patch(asset, patch, download, game_root, cache_root, &partial, canceled)?;
    }
    finalize_staging_file(&partial, &output, asset, canceled)
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn copy_container_range(
  cache_root: &Path,
  download: &super::planner::PlanDownload,
  patch: &PlanPatch,
  output: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let container = cache_root.join(&download.cache_key);
  let mut source =
    File::open(&container).map_err(|error| format!("打开差分容器失败：{}：{error}", patch.id))?;
  source
    .seek(SeekFrom::Start(patch.range_start))
    .map_err(|error| format!("定位差分范围失败：{}：{error}", patch.id))?;
  let mut target = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(output)
    .map_err(|error| format!("创建 patch 临时文件失败：{error}"))?;
  let mut remaining = patch.range_length;
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  while remaining > 0 {
    check_canceled(canceled)?;
    let maximum = usize::try_from(remaining.min(buffer.len() as u64))
      .map_err(|_| format!("patch 范围无法表示：{}", patch.id))?;
    let read = source
      .read(&mut buffer[..maximum])
      .map_err(|error| format!("读取差分范围失败：{}：{error}", patch.id))?;
    if read == 0 {
      return Err(format!("差分范围小于计划长度：{}", patch.id));
    }
    target
      .write_all(&buffer[..read])
      .map_err(|error| format!("写入 patch 临时文件失败：{error}"))?;
    remaining -= read as u64;
  }
  target.sync_all().map_err(|error| format!("同步 patch 临时文件失败：{error}"))
}

fn apply_hdiff_patch(
  asset: &PlanAsset,
  patch: &PlanPatch,
  download: &super::planner::PlanDownload,
  game_root: &Path,
  cache_root: &Path,
  output: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  #[cfg(not(windows))]
  {
    let _ = (asset, patch, download, game_root, cache_root, output, canceled);
    return Err(format!("修改型 patch 仅支持 Windows：{}", asset.name));
  }
  #[cfg(windows)]
  {
    check_canceled(canceled)?;
    if patch.original_size == 0 || patch.original_md5.len() != 32 {
      return Err(format!("修改型 patch 原文件元数据无效：{}", asset.name));
    }
    let source_path = resolve_existing_manifest_file(game_root, &asset.name)
      .map_err(|error| format!("打开修改型 patch 原文件失败：{}：{error}", asset.name))?;
    let source_len = fs::metadata(&source_path)
      .map_err(|error| format!("读取修改型 patch 原文件失败：{}：{error}", asset.name))?
      .len();
    if source_len != patch.original_size {
      return Err(format!("修改型 patch 原文件长度校验失败：{}", asset.name));
    }
    let mut source = File::open(&source_path)
      .map_err(|error| format!("打开修改型 patch 原文件失败：{}：{error}", asset.name))?;
    let actual_md5 = hash_exact_file(&mut source, patch.original_size, canceled)?;
    if !actual_md5.eq_ignore_ascii_case(&patch.original_md5) {
      return Err(format!("修改型 patch 原文件 MD5 校验失败：{}", asset.name));
    }
    source
      .seek(SeekFrom::Start(0))
      .map_err(|error| format!("定位修改型 patch 原文件失败：{}：{error}", asset.name))?;
    let container = File::open(cache_root.join(&download.cache_key))
      .map_err(|error| format!("打开差分容器失败：{}：{error}", patch.id))?;
    let target = OpenOptions::new()
      .create_new(true)
      .read(true)
      .write(true)
      .open(output)
      .map_err(|error| format!("创建 patch 临时文件失败：{error}"))?;
    target
      .set_len(asset.size)
      .map_err(|error| format!("设置 patch 临时文件长度失败：{}：{error}", asset.name))?;
    super::hpatch::patch_zstd(
      &source,
      patch.original_size,
      &container,
      patch.range_start,
      patch.range_length,
      &target,
      asset.size,
    )?;
    target.sync_all().map_err(|error| format!("同步 patch 临时文件失败：{error}"))
  }
}

fn finalize_staging_file(
  partial: &Path,
  output: &Path,
  asset: &PlanAsset,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let mut file = OpenOptions::new()
    .read(true)
    .open(partial)
    .map_err(|error| format!("打开资源临时文件失败：{}：{error}", asset.name))?;
  let output_size = file
    .metadata()
    .map_err(|error| format!("读取资源临时文件长度失败：{}：{error}", asset.name))?
    .len();
  if output_size != asset.size {
    return Err(format!("资源长度校验失败：{}", asset.name));
  }
  let actual_asset_md5 = hash_exact_file(&mut file, asset.size, canceled)?;
  if !actual_asset_md5.eq_ignore_ascii_case(&asset.md5) {
    return Err(format!("资源 MD5 校验失败：{}", asset.name));
  }
  drop(file);
  fs::rename(partial, output)
    .map_err(|error| format!("提交 staging 资源失败：{}：{error}", asset.name))
}

fn validate_asset_layout<L: DownloadLookup>(
  asset: &PlanAsset,
  downloads: &L,
) -> Result<(), String> {
  if asset.patch.is_some() {
    return Err(format!("manifest-diff 资源不能包含 patch：{}", asset.name));
  }
  let mut chunks = asset.chunks.iter().collect::<Vec<_>>();
  chunks.sort_by_key(|chunk| chunk.target_offset);
  let mut previous_end = 0_u64;
  for chunk in &chunks {
    let end = chunk
      .target_offset
      .checked_add(chunk.decompressed_size)
      .ok_or_else(|| format!("资源 chunk 目标范围溢出：{}", asset.name))?;
    if chunk.target_offset < previous_end {
      return Err(format!("资源 chunk 布局重叠：{}", asset.name));
    }
    if end > asset.size {
      return Err(format!("资源 chunk 超出目标文件边界：{}", asset.name));
    }
    previous_end = end;
  }
  for chunk in chunks {
    if chunk.decompressed_size == 0 || chunk.decompressed_md5.len() != 32 {
      return Err(format!("资源 chunk 元数据无效：{}", asset.name));
    }
    if chunk.reuse.is_none() {
      let download = downloads
        .get(chunk.id.as_str())
        .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
      if download.compressed_size != chunk.compressed_size
        || download.decompressed_size != chunk.decompressed_size
      {
        return Err(format!("资源 chunk 下载元数据不一致：{}", chunk.id));
      }
      if download.encoding == PayloadEncoding::LegacyUnspecified {
        return Err(format!("资源 chunk 缺少载荷编码：{}", chunk.id));
      }
    }
  }
  Ok(())
}

fn assemble_asset<L: DownloadLookup>(
  asset: &PlanAsset,
  downloads: &L,
  game_root: &Path,
  cache_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  assemble_asset_with_timing(asset, downloads, game_root, cache_root, staging_root, canceled, None)
}

fn assemble_asset_with_timing<L: DownloadLookup>(
  asset: &PlanAsset,
  downloads: &L,
  game_root: &Path,
  cache_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  let partial = partial_path(&output)?;
  remove_stale_partial(&partial)?;
  remove_stale_output(&output)?;

  let result = (|| {
    let mut file = OpenOptions::new()
      .create_new(true)
      .read(true)
      .write(true)
      .open(&partial)
      .map_err(|error| format!("创建资源临时文件失败：{}：{error}", asset.name))?;
    file
      .set_len(asset.size)
      .map_err(|error| format!("设置资源临时文件长度失败：{}：{error}", asset.name))?;
    let mut chunks = asset.chunks.iter().collect::<Vec<_>>();
    chunks.sort_by_key(|chunk| chunk.target_offset);
    for chunk in chunks {
      check_canceled(canceled)?;
      file
        .seek(SeekFrom::Start(chunk.target_offset))
        .map_err(|error| format!("定位资源 chunk 失败：{}：{error}", asset.name))?;
      if let Some(reuse) = &chunk.reuse {
        write_reused_chunk_with_timing(
          &mut file,
          chunk,
          game_root,
          &reuse.asset_name,
          reuse.source_offset,
          canceled,
          timing.as_deref_mut(),
        )?;
      } else {
        let download = downloads
          .get(chunk.id.as_str())
          .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
        write_downloaded_chunk_with_timing(
          &mut file,
          chunk,
          cache_root,
          download,
          canceled,
          timing.as_deref_mut(),
        )?;
      }
    }
    let output_size = file
      .metadata()
      .map_err(|error| format!("读取资源临时文件长度失败：{}：{error}", asset.name))?
      .len();
    if output_size != asset.size {
      return Err(format!("资源长度校验失败：{}", asset.name));
    }
    file
      .seek(SeekFrom::Start(0))
      .map_err(|error| format!("定位资源临时文件失败：{}：{error}", asset.name))?;
    let actual_asset_md5 =
      hash_exact_file_with_timing(&mut file, asset.size, canceled, timing.as_deref_mut())?;
    if !actual_asset_md5.eq_ignore_ascii_case(&asset.md5) {
      return Err(format!("资源 MD5 校验失败：{}", asset.name));
    }
    check_canceled(canceled)?;
    sync_staging_file(&file, asset.size, timing.as_deref_mut())
      .map_err(|error| format!("同步资源临时文件失败：{}：{error}", asset.name))?;
    drop(file);
    fs::rename(&partial, &output)
      .map_err(|error| format!("提交 staging 资源失败：{}：{error}", asset.name))?;
    Ok(())
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn assemble_asset_with_fallback_with_timing<L: DownloadLookup>(
  asset: &PlanAsset,
  downloads: &L,
  game_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  let selected_root = asset.chunks.iter().filter(|chunk| chunk.reuse.is_none()).try_fold(
    None::<&Path>,
    |selected, chunk| {
      let download = downloads
        .get(chunk.id.as_str())
        .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
      let root = if cached_chunk_matches(shared_cache_root, download) {
        shared_cache_root
      } else if cached_chunk_matches(spool_root, download) {
        spool_root
      } else {
        return Err(format!("资源 chunk 完整性复验失败：{}", chunk.id));
      };
      match selected {
        None => Ok(Some(root)),
        Some(current) if current == root => Ok(Some(current)),
        Some(_) => Ok(None),
      }
    },
  )?;
  if let Some(root) = selected_root {
    return assemble_asset_with_timing(
      asset,
      downloads,
      game_root,
      root,
      staging_root,
      canceled,
      timing,
    );
  }

  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  let partial = partial_path(&output)?;
  remove_stale_partial(&partial)?;
  remove_stale_output(&output)?;
  let result = (|| {
    let mut file = OpenOptions::new()
      .create_new(true)
      .read(true)
      .write(true)
      .open(&partial)
      .map_err(|error| format!("创建资源临时文件失败：{}：{error}", asset.name))?;
    file
      .set_len(asset.size)
      .map_err(|error| format!("设置资源临时文件长度失败：{}：{error}", asset.name))?;
    let mut chunks = asset.chunks.iter().collect::<Vec<_>>();
    chunks.sort_by_key(|chunk| chunk.target_offset);
    for chunk in chunks {
      check_canceled(canceled)?;
      file
        .seek(SeekFrom::Start(chunk.target_offset))
        .map_err(|error| format!("定位资源 chunk 失败：{}：{error}", asset.name))?;
      let download = downloads
        .get(chunk.id.as_str())
        .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
      let root = if cached_chunk_matches(shared_cache_root, download) {
        shared_cache_root
      } else {
        spool_root
      };
      write_downloaded_chunk_with_timing(
        &mut file,
        chunk,
        root,
        download,
        canceled,
        timing.as_deref_mut(),
      )?;
    }
    finalize_open_asset_with_timing(file, &partial, &output, asset, canceled, timing.as_deref_mut())
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn finalize_open_asset_with_timing(
  mut file: File,
  partial: &Path,
  output: &Path,
  asset: &PlanAsset,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  file
    .seek(SeekFrom::Start(0))
    .map_err(|error| format!("定位资源临时文件失败：{}：{error}", asset.name))?;
  let actual = hash_exact_file_with_timing(&mut file, asset.size, canceled, timing.as_deref_mut())?;
  if !actual.eq_ignore_ascii_case(&asset.md5) {
    return Err(format!("资源 MD5 校验失败：{}", asset.name));
  }
  sync_staging_file(&file, asset.size, timing.as_deref_mut())
    .map_err(|error| format!("同步资源临时文件失败：{}：{error}", asset.name))?;
  drop(file);
  fs::rename(partial, output)
    .map_err(|error| format!("提交 staging 资源失败：{}：{error}", asset.name))
}

fn verified_asset_file_with_timing(
  path: &Path,
  asset: &PlanAsset,
  canceled: &AtomicBool,
  timing: Option<&mut AssemblyTiming>,
) -> Result<bool, String> {
  let mut file =
    File::open(path).map_err(|error| format!("打开已组装资源失败：{}：{error}", asset.name))?;
  if file.metadata().map_err(|error| format!("读取已组装资源失败：{}：{error}", asset.name))?.len()
    != asset.size
  {
    return Ok(false);
  }
  Ok(
    hash_exact_file_with_timing(&mut file, asset.size, canceled, timing)?
      .eq_ignore_ascii_case(&asset.md5),
  )
}

#[derive(Default)]
struct ZstdReadTiming {
  micros: u64,
  bytes: u64,
  attempted: bool,
}

impl ZstdReadTiming {
  fn record(&mut self, elapsed_micros: u64, bytes: u64) {
    self.attempted = true;
    self.micros = self.micros.saturating_add(elapsed_micros);
    self.bytes = self.bytes.saturating_add(bytes);
  }
}

fn write_downloaded_chunk_with_timing(
  output: &mut File,
  chunk: &PlanChunk,
  cache_root: &Path,
  download: &super::planner::PlanDownload,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  check_canceled(canceled)?;
  if !cached_chunk_matches(cache_root, download) {
    return Err(format!("下载缓存完整性复验失败：{}", chunk.id));
  }
  let path = cache_root.join(&download.cache_key);
  let file =
    File::open(&path).map_err(|error| format!("打开下载缓存失败：{}：{error}", chunk.id))?;
  match download.encoding {
    PayloadEncoding::Raw => {
      if download.compressed_size != download.decompressed_size {
        return Err(format!("Raw 下载缓存大小不一致：{}", chunk.id));
      }
      let mut reader = BufReader::new(file);
      write_exact_chunk_with_timing(
        output,
        chunk,
        &mut reader,
        canceled,
        timing.as_deref_mut(),
        None,
      )?;
    }
    PayloadEncoding::Zstd => {
      let mut reader = zstd::stream::read::Decoder::new(BufReader::new(file))
        .map_err(|error| format!("打开 zstd 下载缓存失败：{}：{error}", chunk.id))?;
      let timing_enabled = timing.is_some();
      let mut zstd_timing = ZstdReadTiming::default();
      let result = write_exact_chunk_with_timing(
        output,
        chunk,
        &mut reader,
        canceled,
        timing.as_deref_mut(),
        timing_enabled.then_some(&mut zstd_timing),
      );
      let result = match result {
        Err(error) => Err(error),
        Ok(()) => {
          let mut extra = [0_u8; 1];
          let (read_result, elapsed_micros) = if timing_enabled {
            let started_at = Instant::now();
            let read_result = reader.read(&mut extra);
            (read_result, duration_micros(started_at.elapsed()))
          } else {
            (reader.read(&mut extra), 0)
          };
          if timing_enabled {
            zstd_timing.record(elapsed_micros, read_result.as_ref().map_or(0, |read| *read as u64));
          }
          read_result
            .map_err(|error| format!("读取 zstd 下载缓存失败：{}：{error}", chunk.id))
            .and_then(|read| {
              if read != 0 {
                Err(format!("zstd 下载缓存解压后超出计划大小：{}", chunk.id))
              } else {
                Ok(())
              }
            })
        }
      };
      if zstd_timing.attempted {
        if let Some(timing) = timing.as_deref_mut() {
          timing.record_zstd_decode_read(zstd_timing.micros, zstd_timing.bytes);
        }
      }
      result?;
    }
    PayloadEncoding::LegacyUnspecified => {
      return Err(format!("资源 chunk 缺少载荷编码：{}", chunk.id));
    }
  }
  Ok(())
}

fn write_reused_chunk_with_timing(
  output: &mut File,
  chunk: &PlanChunk,
  game_root: &Path,
  asset_name: &str,
  source_offset: u64,
  canceled: &AtomicBool,
  timing: Option<&mut AssemblyTiming>,
) -> Result<(), String> {
  let path = resolve_existing_manifest_file(game_root, asset_name)?;
  let source_end = source_offset
    .checked_add(chunk.decompressed_size)
    .ok_or_else(|| format!("复用 chunk 源范围溢出：{}", chunk.id))?;
  let metadata = fs::metadata(&path)
    .map_err(|error| format!("读取复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  if metadata.len() < source_end {
    return Err(format!("复用 chunk 源文件范围不足：{}", chunk.id));
  }
  let mut file = File::open(&path)
    .map_err(|error| format!("打开复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  file
    .seek(SeekFrom::Start(source_offset))
    .map_err(|error| format!("定位复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  let mut reader = BufReader::new(file);
  write_exact_chunk_with_timing(output, chunk, &mut reader, canceled, timing, None)
}

fn write_exact_chunk_with_timing<R: Read>(
  output: &mut File,
  chunk: &PlanChunk,
  reader: &mut R,
  canceled: &AtomicBool,
  mut timing: Option<&mut AssemblyTiming>,
  mut zstd_timing: Option<&mut ZstdReadTiming>,
) -> Result<(), String> {
  let mut remaining = chunk.decompressed_size;
  let mut chunk_hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  let mut md5_micros = 0_u64;
  let mut md5_bytes = 0_u64;
  let mut md5_attempted = false;
  let result = (|| {
    while remaining > 0 {
      check_canceled(canceled)?;
      let maximum = usize::try_from(remaining.min(buffer.len() as u64))
        .map_err(|_| format!("资源 chunk 大小无法表示：{}", chunk.id))?;
      let read_started_at = zstd_timing.as_ref().map(|_| Instant::now());
      let read_result = reader.read(&mut buffer[..maximum]);
      if let (Some(started_at), Some(zstd_timing)) = (read_started_at, zstd_timing.as_deref_mut()) {
        zstd_timing.record(
          duration_micros(started_at.elapsed()),
          read_result.as_ref().map_or(0, |read| *read as u64),
        );
      }
      let read =
        read_result.map_err(|error| format!("读取资源 chunk 失败：{}：{error}", chunk.id))?;
      if read == 0 {
        return Err(format!("资源 chunk 小于计划解压大小：{}", chunk.id));
      }
      output
        .write_all(&buffer[..read])
        .map_err(|error| format!("写入资源 chunk 失败：{}：{error}", chunk.id))?;
      let hash_started_at = timing.as_ref().map(|_| Instant::now());
      md5_attempted = true;
      chunk_hasher.update(&buffer[..read]);
      if let Some(hash_started_at) = hash_started_at {
        md5_micros = md5_micros.saturating_add(duration_micros(hash_started_at.elapsed()));
      }
      md5_bytes = md5_bytes.saturating_add(read as u64);
      remaining -= read as u64;
    }
    let hash_started_at = timing.as_ref().map(|_| Instant::now());
    md5_attempted = true;
    let actual_md5 = format!("{:x}", chunk_hasher.finalize());
    if let Some(hash_started_at) = hash_started_at {
      md5_micros = md5_micros.saturating_add(duration_micros(hash_started_at.elapsed()));
    }
    if !actual_md5.eq_ignore_ascii_case(&chunk.decompressed_md5) {
      return Err(format!("资源 chunk MD5 校验失败：{}", chunk.id));
    }
    Ok(())
  })();
  if md5_attempted {
    if let Some(timing) = timing.as_deref_mut() {
      timing.record_chunk_md5(md5_micros, md5_bytes);
    }
  }
  result
}

fn hash_exact_file(file: &mut File, size: u64, canceled: &AtomicBool) -> Result<String, String> {
  hash_exact_file_with_timing(file, size, canceled, None)
}

fn hash_exact_file_with_timing(
  file: &mut File,
  size: u64,
  canceled: &AtomicBool,
  timing: Option<&mut AssemblyTiming>,
) -> Result<String, String> {
  let mut remaining = size;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  let mut processed_bytes = 0_u64;
  let started_at = timing.as_ref().map(|_| Instant::now());
  let result = (|| {
    while remaining > 0 {
      check_canceled(canceled)?;
      let maximum = usize::try_from(remaining.min(buffer.len() as u64))
        .map_err(|_| "资源文件大小无法表示".to_string())?;
      let read = file
        .read(&mut buffer[..maximum])
        .map_err(|error| format!("读取资源临时文件失败：{error}"))?;
      if read == 0 {
        return Err("资源临时文件小于计划大小".to_string());
      }
      hasher.update(&buffer[..read]);
      processed_bytes = processed_bytes.saturating_add(read as u64);
      remaining -= read as u64;
    }
    Ok(format!("{:x}", hasher.finalize()))
  })();
  if let (Some(started_at), Some(timing)) = (started_at, timing) {
    timing.record_asset_md5(duration_micros(started_at.elapsed()), processed_bytes);
  }
  result
}

fn sync_staging_file(
  file: &File,
  bytes: u64,
  timing: Option<&mut AssemblyTiming>,
) -> std::io::Result<()> {
  let started_at = timing.as_ref().map(|_| Instant::now());
  let result = file.sync_all();
  if let (Some(started_at), Some(timing)) = (started_at, timing) {
    timing.record_staging_file_sync(duration_micros(started_at.elapsed()), bytes);
  }
  result
}

fn partial_path(output: &Path) -> Result<PathBuf, String> {
  let name = output.file_name().ok_or_else(|| "资源 staging 输出路径缺少文件名".to_string())?;
  let mut partial_name = name.to_os_string();
  partial_name.push(".part");
  Ok(output.with_file_name(partial_name))
}

fn remove_stale_partial(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理过期资源临时文件失败：{error}")),
  }
}

/// `prepare_manifest_output_file` 已检查该路径及其父目录；仅删除受任务 staging 管控的普通文件。
fn remove_stale_output(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理过期 staging 资源失败：{error}")),
  }
}

fn check_canceled(canceled: &AtomicBool) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) {
    Err("游戏资源组装已取消".to_string())
  } else {
    Ok(())
  }
}
