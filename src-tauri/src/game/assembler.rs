//! 将已验证的 manifest-diff 计划流式组装到任务 staging 目录。
//! @since Beta v0.11.5

use super::{
  model::PackagePlanStrategy,
  path_guard::{
    prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file,
  },
  planner::{
    PayloadEncoding, PersistedPlan, PlanAsset, PlanChunk, PlanPatch, cached_chunk_matches,
  },
};
use md5::{Digest, Md5};
use std::{
  collections::HashMap,
  fs::{self, File, OpenOptions},
  io::{BufReader, Read, Seek, SeekFrom, Write},
  path::{Path, PathBuf},
  sync::{
    Mutex,
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc,
  },
};

const COPY_BUFFER_SIZE: usize = 128 * 1024;

/// 已成功写入 staging 的资源统计。
#[derive(Debug, Default, Eq, PartialEq)]
pub(crate) struct AssemblySummary {
  pub(crate) asset_count: usize,
  pub(crate) assembled_bytes: u64,
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

/// 将一个已 hydrate 的计划组装到任务私有 staging 目录。
///
/// 此函数绝不会写入 `game_root`；它只将经过校验的完整资源原子提交至
/// `<task_root>/tasks/<plan_id>/staging`。调用方应在提交阶段之外使用该目录。
#[cfg(test)]
pub(crate) fn assemble_plan(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
) -> Result<AssemblySummary, String> {
  assemble_plan_with_progress(plan, game_root, task_root, canceled, |_| {})
}

/// Assemble a plan and report verified asset-level progress to the caller.
#[cfg(test)]
pub(crate) fn assemble_plan_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  match plan.strategy {
    PackagePlanStrategy::ManifestDiff => {
      assemble_manifest_plan_with_progress(plan, game_root, task_root, canceled, &mut progress)
    }
    PackagePlanStrategy::Patch => {
      assemble_patch_plan_with_progress(plan, game_root, task_root, canceled, &mut progress)
    }
    PackagePlanStrategy::Full => Err("全新安装计划必须使用专用安装组装器".to_string()),
  }
}

/// Assemble a source-free full plan and report verified asset-level progress.
#[cfg(test)]
#[allow(dead_code)]
pub(crate) fn assemble_full_install_plan_with_progress<F>(
  plan: &PersistedPlan,
  staging_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  if plan.strategy != PackagePlanStrategy::Full {
    return Err("安装组装器只接受 Full 计划".to_string());
  }
  if plan.assets.is_empty()
    || plan.assets.iter().any(|asset| asset.source.is_some() || asset.patch.is_some())
  {
    return Err("全新安装计划不能复用已有资源或 patch".to_string());
  }
  check_canceled(canceled)?;
  if plan.downloads.iter().any(|download| download.encoding == PayloadEncoding::LegacyUnspecified) {
    return Err("全新安装计划缺少资源载荷编码".to_string());
  }
  let cache_root =
    plan.install_overlay.as_ref().filter(|overlay| !overlay.spool_root.is_empty()).map_or_else(
      || task_root.join("cache").join("chunks"),
      |overlay| PathBuf::from(&overlay.spool_root),
    );
  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  let (total_count, total_bytes) = assembly_totals(plan)?;
  let mut summary = AssemblySummary::default();
  for asset in plan.assets.iter() {
    check_canceled(canceled)?;
    validate_asset_layout(asset, &downloads)?;
    if asset.chunks.iter().any(|chunk| chunk.reuse.is_some()) {
      return Err(format!("全新安装资源包含复用 chunk：{}", asset.name));
    }
    assemble_asset(asset, &downloads, staging_root, &cache_root, staging_root, canceled)?;
    summary.asset_count += 1;
    summary.assembled_bytes = summary
      .assembled_bytes
      .checked_add(asset.size)
      .ok_or_else(|| "组装资源总大小溢出".to_string())?;
    report_asset_progress(
      &mut progress,
      summary.asset_count,
      total_count,
      summary.assembled_bytes,
      total_bytes,
      &asset.name,
    );
  }
  Ok(summary)
}

pub(crate) fn assemble_full_install_asset(
  plan: &PersistedPlan,
  asset_index: usize,
  staging_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  if plan.strategy != PackagePlanStrategy::Full {
    return Err("安装组装器只接受 Full 计划".to_string());
  }
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  validate_asset_layout(asset, &downloads)?;
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  if output.exists() && verified_asset_file(&output, asset, canceled)? {
    return Ok(());
  }
  assemble_asset_with_fallback(
    asset,
    &downloads,
    staging_root,
    shared_cache_root,
    spool_root,
    staging_root,
    canceled,
  )
}

pub(crate) fn validate_full_install_cursor(
  plan: &PersistedPlan,
  staging_root: &Path,
  cursor: usize,
  canceled: &AtomicBool,
) -> Result<(), String> {
  if plan.strategy != PackagePlanStrategy::Full {
    return Err("安装组装器只接受 Full 计划".to_string());
  }
  for asset in plan.assets.iter().take(cursor.min(plan.assets.len())) {
    check_canceled(canceled)?;
    let path = prepare_manifest_output_file(staging_root, &asset.name)?;
    let metadata = fs::symlink_metadata(&path)
      .map_err(|error| format!("读取已完成安装资源失败：{}：{error}", asset.name))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
      return Err(format!("已完成安装资源不是普通文件：{}", asset.name));
    }
    if !verified_asset_file(&path, asset, canceled)? {
      return Err(format!("已完成安装资源校验失败：{}", asset.name));
    }
  }
  Ok(())
}

/// 将一个已 hydrate 的 manifest-diff 计划组装到任务私有 staging 目录。
#[cfg(test)]
pub(crate) fn assemble_manifest_plan(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
) -> Result<AssemblySummary, String> {
  assemble_manifest_plan_with_progress(plan, game_root, task_root, canceled, |_| {})
}

/// Assemble a manifest-diff plan and report verified asset-level progress.
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn assemble_manifest_plan_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  check_canceled(canceled)?;
  let staging_root =
    prepare_guarded_manifest_directory(task_root, &format!("tasks/{}/staging", plan.plan_id))?;
  assemble_manifest_plan_to_root_with_progress(
    plan,
    game_root,
    task_root,
    &staging_root,
    canceled,
    &mut progress,
  )
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

/// Assemble a manifest-diff plan into a caller-owned guarded output directory.
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn assemble_manifest_plan_to_root_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
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
  let (total_count, total_bytes) = assembly_totals(plan)?;
  let mut summary = AssemblySummary::default();
  for asset in &plan.assets {
    check_canceled(canceled)?;
    validate_asset_layout(asset, &downloads)?;
    assemble_asset(asset, &downloads, game_root, &cache_root, output_root, canceled)?;
    summary.asset_count += 1;
    summary.assembled_bytes = summary
      .assembled_bytes
      .checked_add(asset.size)
      .ok_or_else(|| "组装资源总大小溢出".to_string())?;
    report_asset_progress(
      &mut progress,
      summary.asset_count,
      total_count,
      summary.assembled_bytes,
      total_bytes,
      &asset.name,
    );
  }
  Ok(summary)
}

#[cfg(test)]
fn assemble_patch_plan_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  check_canceled(canceled)?;
  let staging_root =
    prepare_guarded_manifest_directory(task_root, &format!("tasks/{}/staging", plan.plan_id))?;
  assemble_patch_plan_to_root_with_progress(
    plan,
    game_root,
    task_root,
    &staging_root,
    canceled,
    &mut progress,
  )
}

/// Assemble a patch plan into a caller-owned guarded output directory.
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn assemble_patch_plan_to_root_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
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
  let (total_count, total_bytes) = assembly_totals(plan)?;
  let mut summary = AssemblySummary::default();
  for asset in &plan.assets {
    check_canceled(canceled)?;
    let patch =
      asset.patch.as_ref().ok_or_else(|| format!("patch 资源缺少差分元数据：{}", asset.name))?;
    let download = downloads
      .get(patch.id.as_str())
      .ok_or_else(|| format!("patch 资源缺少下载缓存：{}", asset.name))?;
    assemble_patch_asset(asset, patch, download, game_root, &cache_root, output_root, canceled)?;
    summary.asset_count += 1;
    summary.assembled_bytes = summary
      .assembled_bytes
      .checked_add(asset.size)
      .ok_or_else(|| "组装资源总大小溢出".to_string())?;
    report_asset_progress(
      &mut progress,
      summary.asset_count,
      total_count,
      summary.assembled_bytes,
      total_bytes,
      &asset.name,
    );
  }
  Ok(summary)
}

/// Assemble a manifest-diff or patch plan into a caller-owned guarded output directory.
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn assemble_plan_to_root_with_progress<F>(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  output_root: &Path,
  canceled: &AtomicBool,
  mut progress: F,
) -> Result<AssemblySummary, String>
where
  F: FnMut(&AssemblyProgress),
{
  match plan.strategy {
    PackagePlanStrategy::ManifestDiff => assemble_manifest_plan_to_root_with_progress(
      plan,
      game_root,
      task_root,
      output_root,
      canceled,
      &mut progress,
    ),
    PackagePlanStrategy::Patch => assemble_patch_plan_to_root_with_progress(
      plan,
      game_root,
      task_root,
      output_root,
      canceled,
      &mut progress,
    ),
    PackagePlanStrategy::Full => Err("全新安装计划必须使用专用安装组装器".to_string()),
  }
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

fn validate_asset_layout<'a>(
  asset: &PlanAsset,
  downloads: &HashMap<&'a str, &'a super::planner::PlanDownload>,
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

fn assemble_asset(
  asset: &PlanAsset,
  downloads: &HashMap<&str, &super::planner::PlanDownload>,
  game_root: &Path,
  cache_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
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
        write_reused_chunk(
          &mut file,
          chunk,
          game_root,
          &reuse.asset_name,
          reuse.source_offset,
          canceled,
        )?;
      } else {
        let download = downloads
          .get(chunk.id.as_str())
          .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
        write_downloaded_chunk(&mut file, chunk, cache_root, download, canceled)?;
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
    let actual_asset_md5 = hash_exact_file(&mut file, asset.size, canceled)?;
    if !actual_asset_md5.eq_ignore_ascii_case(&asset.md5) {
      return Err(format!("资源 MD5 校验失败：{}", asset.name));
    }
    check_canceled(canceled)?;
    file.sync_all().map_err(|error| format!("同步资源临时文件失败：{}：{error}", asset.name))?;
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

fn assemble_asset_with_fallback(
  asset: &PlanAsset,
  downloads: &HashMap<&str, &super::planner::PlanDownload>,
  game_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
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
    return assemble_asset(asset, downloads, game_root, root, staging_root, canceled);
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
      write_downloaded_chunk(&mut file, chunk, root, download, canceled)?;
    }
    finalize_open_asset(file, &partial, &output, asset, canceled)
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn finalize_open_asset(
  mut file: File,
  partial: &Path,
  output: &Path,
  asset: &PlanAsset,
  canceled: &AtomicBool,
) -> Result<(), String> {
  file
    .seek(SeekFrom::Start(0))
    .map_err(|error| format!("定位资源临时文件失败：{}：{error}", asset.name))?;
  let actual = hash_exact_file(&mut file, asset.size, canceled)?;
  if !actual.eq_ignore_ascii_case(&asset.md5) {
    return Err(format!("资源 MD5 校验失败：{}", asset.name));
  }
  file.sync_all().map_err(|error| format!("同步资源临时文件失败：{}：{error}", asset.name))?;
  drop(file);
  fs::rename(partial, output)
    .map_err(|error| format!("提交 staging 资源失败：{}：{error}", asset.name))
}

fn verified_asset_file(
  path: &Path,
  asset: &PlanAsset,
  canceled: &AtomicBool,
) -> Result<bool, String> {
  let mut file =
    File::open(path).map_err(|error| format!("打开已组装资源失败：{}：{error}", asset.name))?;
  if file.metadata().map_err(|error| format!("读取已组装资源失败：{}：{error}", asset.name))?.len()
    != asset.size
  {
    return Ok(false);
  }
  Ok(hash_exact_file(&mut file, asset.size, canceled)?.eq_ignore_ascii_case(&asset.md5))
}

fn write_downloaded_chunk(
  output: &mut File,
  chunk: &PlanChunk,
  cache_root: &Path,
  download: &super::planner::PlanDownload,
  canceled: &AtomicBool,
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
      write_exact_chunk(output, chunk, &mut reader, canceled)?;
    }
    PayloadEncoding::Zstd => {
      let mut reader = zstd::stream::read::Decoder::new(BufReader::new(file))
        .map_err(|error| format!("打开 zstd 下载缓存失败：{}：{error}", chunk.id))?;
      write_exact_chunk(output, chunk, &mut reader, canceled)?;
      let mut extra = [0_u8; 1];
      if reader
        .read(&mut extra)
        .map_err(|error| format!("读取 zstd 下载缓存失败：{}：{error}", chunk.id))?
        != 0
      {
        return Err(format!("zstd 下载缓存解压后超出计划大小：{}", chunk.id));
      }
    }
    PayloadEncoding::LegacyUnspecified => {
      return Err(format!("资源 chunk 缺少载荷编码：{}", chunk.id));
    }
  }
  Ok(())
}

fn write_reused_chunk(
  output: &mut File,
  chunk: &PlanChunk,
  game_root: &Path,
  asset_name: &str,
  source_offset: u64,
  canceled: &AtomicBool,
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
  write_exact_chunk(output, chunk, &mut reader, canceled)
}

fn write_exact_chunk<R: Read>(
  output: &mut File,
  chunk: &PlanChunk,
  reader: &mut R,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let mut remaining = chunk.decompressed_size;
  let mut chunk_hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  while remaining > 0 {
    check_canceled(canceled)?;
    let maximum = usize::try_from(remaining.min(buffer.len() as u64))
      .map_err(|_| format!("资源 chunk 大小无法表示：{}", chunk.id))?;
    let read = reader
      .read(&mut buffer[..maximum])
      .map_err(|error| format!("读取资源 chunk 失败：{}：{error}", chunk.id))?;
    if read == 0 {
      return Err(format!("资源 chunk 小于计划解压大小：{}", chunk.id));
    }
    output
      .write_all(&buffer[..read])
      .map_err(|error| format!("写入资源 chunk 失败：{}：{error}", chunk.id))?;
    chunk_hasher.update(&buffer[..read]);
    remaining -= read as u64;
  }
  let actual_md5 = format!("{:x}", chunk_hasher.finalize());
  if !actual_md5.eq_ignore_ascii_case(&chunk.decompressed_md5) {
    return Err(format!("资源 chunk MD5 校验失败：{}", chunk.id));
  }
  Ok(())
}

fn hash_exact_file(file: &mut File, size: u64, canceled: &AtomicBool) -> Result<String, String> {
  let mut remaining = size;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
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
    remaining -= read as u64;
  }
  Ok(format!("{:x}", hasher.finalize()))
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

#[cfg(test)]
mod tests {
  use super::{
    AssemblyProgress, assemble_asset_with_fallback, assemble_manifest_plan,
    assemble_manifest_plan_with_progress, assemble_manifest_plan_with_progress_concurrent,
    assemble_plan, partial_path,
  };
  use crate::game::{
    model::{PackagePlanStrategy, PackagePlanTarget, SchemeId},
    planner::{
      PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction, PlanChunk, PlanDownload,
      PlanDownloadHashKind, PlanPatch, PlanReuse,
    },
  };
  use md5::{Digest, Md5};
  use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
  };
  use uuid::Uuid;
  use xxhash_rust::xxh64::xxh64;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-assembler-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }

    fn task_root(&self) -> PathBuf {
      let path = self.0.join("task-root");
      fs::create_dir_all(&path).unwrap();
      path
    }

    fn game_root(&self) -> PathBuf {
      self.0.join("game-root")
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

  fn plan(downloads: Vec<PlanDownload>, assets: Vec<PlanAsset>) -> PersistedPlan {
    PersistedPlan {
      schema_version: 3,
      plan_id: "assembler-test".to_string(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Main,
      source_tag: Some("1.0.0".to_string()),
      target_tag: "1.0.1".to_string(),
      manifest_digest: "0".repeat(64),
      strategy: PackagePlanStrategy::ManifestDiff,
      downloads,
      assets,
      delete_files: Vec::new(),
      inventory: Vec::new(),
      install_overlay: None,
      created_at: "2026-01-01T00:00:00Z".to_string(),
    }
  }

  fn downloaded_chunk(
    id: &str,
    cache_key: &str,
    bytes: &[u8],
    encoding: PayloadEncoding,
  ) -> PlanDownload {
    PlanDownload {
      id: id.to_string(),
      cache_key: cache_key.to_string(),
      hash_kind: PlanDownloadHashKind::XxHash64,
      expected_hash: format!("{:016x}", xxh64(bytes, 0)),
      compressed_size: bytes.len() as u64,
      decompressed_size: bytes.len() as u64,
      encoding,
      url_prefix: String::new(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    }
  }

  fn asset(name: &str, bytes: &[u8], chunks: Vec<PlanChunk>) -> PlanAsset {
    PlanAsset {
      name: name.to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size: bytes.len() as u64,
      md5: md5(bytes),
      chunks,
      patch: None,
    }
  }

  fn chunk(id: &str, bytes: &[u8], reuse: Option<PlanReuse>) -> PlanChunk {
    PlanChunk {
      id: id.to_string(),
      decompressed_md5: md5(bytes),
      target_offset: 0,
      compressed_size: bytes.len() as u64,
      decompressed_size: bytes.len() as u64,
      reuse,
    }
  }

  fn write_cache(task_root: &Path, key: &str, bytes: &[u8]) {
    let cache = task_root.join("cache/chunks");
    fs::create_dir_all(&cache).unwrap();
    fs::write(cache.join(key), bytes).unwrap();
  }

  fn staging_file(task_root: &Path) -> PathBuf {
    task_root.join("tasks/assembler-test/staging/target.bin")
  }

  #[test]
  fn assembles_full_asset_from_mixed_shared_and_private_chunks() {
    let root = TempRoot::new();
    let staging = root.0.join("staging");
    let shared = root.0.join("shared");
    let spool = root.0.join("spool");
    fs::create_dir_all(&staging).unwrap();
    fs::create_dir_all(&shared).unwrap();
    fs::create_dir_all(&spool).unwrap();
    let first = b"abc";
    let second = b"def";
    let first_download = downloaded_chunk("first", "first.chunk", first, PayloadEncoding::Raw);
    let second_download = downloaded_chunk("second", "second.chunk", second, PayloadEncoding::Raw);
    fs::write(shared.join(&first_download.cache_key), first).unwrap();
    fs::write(spool.join(&second_download.cache_key), second).unwrap();
    let asset = PlanAsset {
      name: "mixed.bin".to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size: 6,
      md5: md5(b"abcdef"),
      chunks: vec![
        PlanChunk { target_offset: 0, ..chunk("first", first, None) },
        PlanChunk { target_offset: 3, ..chunk("second", second, None) },
      ],
      patch: None,
    };
    let downloads = HashMap::from([
      (first_download.id.as_str(), &first_download),
      (second_download.id.as_str(), &second_download),
    ]);
    assemble_asset_with_fallback(
      &asset,
      &downloads,
      &staging,
      &shared,
      &spool,
      &staging,
      &AtomicBool::new(false),
    )
    .unwrap();
    assert_eq!(fs::read(staging.join("mixed.bin")).unwrap(), b"abcdef");
  }

  #[test]
  fn assembles_raw_cached_chunk_into_staging() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"raw manifest chunk";
    let download = downloaded_chunk("raw-id", "raw-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let plan =
      plan(vec![download], vec![asset("target.bin", bytes, vec![chunk("raw-id", bytes, None)])]);

    let summary =
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .unwrap();

    assert_eq!(summary.asset_count, 1);
    assert_eq!(summary.assembled_bytes, bytes.len() as u64);
    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), bytes);
  }

  #[test]
  fn reports_cumulative_asset_progress_after_each_verified_output() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let first_bytes = b"first";
    let second_bytes = b"second output";
    let first_download =
      downloaded_chunk("progress-first", "progress-first-cache", first_bytes, PayloadEncoding::Raw);
    let second_download = downloaded_chunk(
      "progress-second",
      "progress-second-cache",
      second_bytes,
      PayloadEncoding::Raw,
    );
    write_cache(&task_root, &first_download.cache_key, first_bytes);
    write_cache(&task_root, &second_download.cache_key, second_bytes);
    let plan = plan(
      vec![first_download, second_download],
      vec![
        asset("first.bin", first_bytes, vec![chunk("progress-first", first_bytes, None)]),
        asset("second.bin", second_bytes, vec![chunk("progress-second", second_bytes, None)]),
      ],
    );
    let mut progress = Vec::<AssemblyProgress>::new();

    assemble_manifest_plan_with_progress(
      &plan,
      &root.game_root(),
      &task_root,
      &AtomicBool::new(false),
      |value| progress.push(value.clone()),
    )
    .unwrap();

    assert_eq!(progress.len(), 2);
    assert_eq!(progress[0].completed_count, 1);
    assert_eq!(progress[0].total_count, 2);
    assert_eq!(progress[0].completed_bytes, first_bytes.len() as u64);
    assert_eq!(progress[0].total_bytes, (first_bytes.len() + second_bytes.len()) as u64);
    assert_eq!(progress[0].current_file.as_deref(), Some("first.bin"));
    assert_eq!(progress[1].completed_count, 2);
    assert_eq!(progress[1].completed_bytes, (first_bytes.len() + second_bytes.len()) as u64);
    assert_eq!(progress[1].current_file.as_deref(), Some("second.bin"));
  }

  #[test]
  fn assembles_independent_assets_with_bounded_parallelism() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let first_bytes = b"first concurrent asset";
    let second_bytes = b"second concurrent asset";
    let first_download =
      downloaded_chunk("parallel-first", "parallel-first-cache", first_bytes, PayloadEncoding::Raw);
    let second_download = downloaded_chunk(
      "parallel-second",
      "parallel-second-cache",
      second_bytes,
      PayloadEncoding::Raw,
    );
    write_cache(&task_root, &first_download.cache_key, first_bytes);
    write_cache(&task_root, &second_download.cache_key, second_bytes);
    let plan = plan(
      vec![first_download, second_download],
      vec![
        asset("first.bin", first_bytes, vec![chunk("parallel-first", first_bytes, None)]),
        asset("second.bin", second_bytes, vec![chunk("parallel-second", second_bytes, None)]),
      ],
    );
    let summary = assemble_manifest_plan_with_progress_concurrent(
      &plan,
      &root.game_root(),
      &task_root,
      &AtomicBool::new(false),
      2,
      |_| {},
    )
    .unwrap();

    assert_eq!(summary.asset_count, 2);
    assert_eq!(summary.assembled_bytes, (first_bytes.len() + second_bytes.len()) as u64);
    assert_eq!(
      fs::read(task_root.join("tasks/assembler-test/staging/first.bin")).unwrap(),
      first_bytes
    );
    assert_eq!(
      fs::read(task_root.join("tasks/assembler-test/staging/second.bin")).unwrap(),
      second_bytes
    );
  }

  #[test]
  fn assembles_zstd_cached_chunk_into_staging() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let plain = b"zstd manifest chunk with a longer payload";
    let compressed = zstd::stream::encode_all(&plain[..], 1).unwrap();
    let mut download =
      downloaded_chunk("zstd-id", "zstd-cache", &compressed, PayloadEncoding::Zstd);
    download.decompressed_size = plain.len() as u64;
    write_cache(&task_root, &download.cache_key, &compressed);
    let mut target_chunk = chunk("zstd-id", plain, None);
    target_chunk.compressed_size = compressed.len() as u64;
    let plan = plan(vec![download], vec![asset("target.bin", plain, vec![target_chunk])]);

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), plain);
  }

  #[test]
  fn assembles_sparse_chunk_layout_with_zero_filled_gap() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let first_bytes = b"ab";
    let second_bytes = b"cd";
    let expected = b"ab\0\0cd";
    let first = downloaded_chunk("gap-first", "gap-first-cache", first_bytes, PayloadEncoding::Raw);
    let second =
      downloaded_chunk("gap-second", "gap-second-cache", second_bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &first.cache_key, first_bytes);
    write_cache(&task_root, &second.cache_key, second_bytes);
    let mut second_chunk = chunk("gap-second", second_bytes, None);
    second_chunk.target_offset = 4;
    let plan = plan(
      vec![first, second],
      vec![asset(
        "target.bin",
        expected,
        vec![chunk("gap-first", first_bytes, None), second_chunk],
      )],
    );

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), expected);
  }

  #[test]
  fn assembles_reused_chunk_without_writing_game_root() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let game_root = root.game_root();
    let bytes = b"reused manifest chunk";
    fs::create_dir_all(&game_root).unwrap();
    fs::write(game_root.join("source.bin"), bytes).unwrap();
    let reuse = PlanReuse { asset_name: "source.bin".to_string(), source_offset: 0 };
    let plan = plan(
      Vec::new(),
      vec![asset("target.bin", bytes, vec![chunk("reuse-id", bytes, Some(reuse))])],
    );

    assemble_manifest_plan(&plan, &game_root, &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), bytes);
    assert_eq!(fs::read(game_root.join("source.bin")).unwrap(), bytes);
  }

  #[test]
  fn replaces_existing_staging_output_after_guarding_it() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"replacement output";
    let download = downloaded_chunk("replace", "replace-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let plan =
      plan(vec![download], vec![asset("target.bin", bytes, vec![chunk("replace", bytes, None)])]);
    let existing = staging_file(&task_root);
    fs::create_dir_all(existing.parent().unwrap()).unwrap();
    fs::write(&existing, b"interrupted staging output").unwrap();

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(existing).unwrap(), bytes);
  }

  #[test]
  fn rejects_chunk_md5_mismatch() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"bad chunk digest";
    let download = downloaded_chunk("bad-md5", "bad-md5-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let mut target_chunk = chunk("bad-md5", bytes, None);
    target_chunk.decompressed_md5 = md5(b"different");
    let plan = plan(vec![download], vec![asset("target.bin", bytes, vec![target_chunk])]);

    assert!(
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .is_err()
    );
    assert!(!staging_file(&task_root).exists());
    assert!(!partial_path(&staging_file(&task_root)).unwrap().exists());
  }

  #[test]
  fn rejects_asset_md5_mismatch() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"bad asset digest";
    let download = downloaded_chunk("bad-asset", "bad-asset-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let mut output = asset("target.bin", bytes, vec![chunk("bad-asset", bytes, None)]);
    output.md5 = md5(b"different");
    let plan = plan(vec![download], vec![output]);

    assert!(
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .is_err()
    );
    assert!(!staging_file(&task_root).exists());
  }

  #[test]
  fn rejects_overlapping_chunk_layout_before_opening_cache() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"abcd";
    let mut first = chunk("one", b"ab", None);
    let mut second = chunk("two", b"cd", None);
    first.target_offset = 0;
    second.target_offset = 1;
    let plan = plan(Vec::new(), vec![asset("target.bin", bytes, vec![first, second])]);

    let error =
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .unwrap_err();
    assert!(error.contains("布局重叠"));
    assert!(!staging_file(&task_root).exists());
  }

  #[test]
  fn stops_before_writing_when_canceled() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let canceled = AtomicBool::new(true);
    let plan = plan(Vec::new(), Vec::new());

    assert!(assemble_manifest_plan(&plan, &root.game_root(), &task_root, &canceled).is_err());
    assert!(!task_root.join("tasks/assembler-test/staging").exists());
  }

  #[test]
  fn copies_patch_container_range_for_add_assets() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let prefix = b"HEAD";
    let payload = b"brand-new-asset";
    let suffix = b"TAIL";
    let mut container = prefix.to_vec();
    container.extend_from_slice(payload);
    container.extend_from_slice(suffix);
    let digest = md5(&container);
    let cache_key = format!("{digest}.patch");
    write_cache(&task_root, &cache_key, &container);
    let download = PlanDownload {
      id: "game.patch".to_string(),
      cache_key,
      hash_kind: PlanDownloadHashKind::Md5,
      expected_hash: digest.clone(),
      compressed_size: container.len() as u64,
      decompressed_size: container.len() as u64,
      encoding: PayloadEncoding::Raw,
      url_prefix: "https://example.com/patch".to_string(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    };
    let asset = PlanAsset {
      name: "new.bin".to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size: payload.len() as u64,
      md5: md5(payload),
      chunks: Vec::new(),
      patch: Some(PlanPatch {
        id: "game.patch".to_string(),
        patch_file_size: container.len() as u64,
        patch_md5: digest,
        range_start: prefix.len() as u64,
        range_length: payload.len() as u64,
        original_name: String::new(),
        original_size: 0,
        original_md5: String::new(),
      }),
    };
    let mut plan = plan(vec![download], vec![asset]);
    plan.strategy = PackagePlanStrategy::Patch;
    let summary =
      assemble_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();
    assert_eq!(summary.asset_count, 1);
    assert_eq!(summary.assembled_bytes, payload.len() as u64);
    assert_eq!(fs::read(task_root.join("tasks/assembler-test/staging/new.bin")).unwrap(), payload);
  }

  fn modify_old_bytes() -> Vec<u8> {
    let mut bytes = Vec::with_capacity(4096);
    bytes.extend((0..2048).map(|index| b'A' + (index % 26) as u8));
    bytes.extend((0..2048).map(|index| b'a' + (index % 26) as u8));
    bytes
  }

  fn modify_new_bytes() -> Vec<u8> {
    let mut bytes = Vec::with_capacity(69632);
    bytes.extend((0..2048).map(|index| b'A' + (index % 26) as u8));
    bytes.extend(std::iter::repeat(b'X').take(65536));
    bytes.extend((0..2048).map(|index| b'a' + (index % 26) as u8));
    bytes
  }

  fn modify_patch_plan(
    task_root: &Path,
    old_bytes: &[u8],
    new_bytes: &[u8],
    original_md5: String,
  ) -> PersistedPlan {
    let prefix = b"HEAD";
    let suffix = b"TAIL";
    let hdiff = include_bytes!("../../native/hpatch/testdata/modify.hdiff");
    let mut container = prefix.to_vec();
    container.extend_from_slice(hdiff);
    container.extend_from_slice(suffix);
    let digest = md5(&container);
    let cache_key = format!("{digest}.patch");
    write_cache(task_root, &cache_key, &container);
    let download = PlanDownload {
      id: "game.patch".to_string(),
      cache_key,
      hash_kind: PlanDownloadHashKind::Md5,
      expected_hash: digest.clone(),
      compressed_size: container.len() as u64,
      decompressed_size: container.len() as u64,
      encoding: PayloadEncoding::Raw,
      url_prefix: "https://example.com/patch".to_string(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    };
    let asset = PlanAsset {
      name: "modify.bin".to_string(),
      action: PlanAssetAction::Modify,
      source: Some(crate::game::planner::PlanSource {
        size: old_bytes.len() as u64,
        md5: original_md5.clone(),
      }),
      size: new_bytes.len() as u64,
      md5: md5(new_bytes),
      chunks: Vec::new(),
      patch: Some(PlanPatch {
        id: "game.patch".to_string(),
        patch_file_size: container.len() as u64,
        patch_md5: digest,
        range_start: prefix.len() as u64,
        range_length: hdiff.len() as u64,
        original_name: "modify.bin".to_string(),
        original_size: old_bytes.len() as u64,
        original_md5,
      }),
    };
    let mut plan = plan(vec![download], vec![asset]);
    plan.strategy = PackagePlanStrategy::Patch;
    plan
  }

  #[test]
  fn rejects_modify_patch_when_original_file_missing() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let old_bytes = modify_old_bytes();
    let new_bytes = modify_new_bytes();
    let plan = modify_patch_plan(&task_root, &old_bytes, &new_bytes, md5(&old_bytes));
    let error =
      assemble_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap_err();
    assert!(error.contains("原文件"));
    assert!(!task_root.join("tasks/assembler-test/staging/modify.bin").exists());
  }

  #[test]
  fn rejects_modify_patch_when_original_md5_mismatch() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let game_root = root.game_root();
    let old_bytes = modify_old_bytes();
    let new_bytes = modify_new_bytes();
    fs::create_dir_all(&game_root).unwrap();
    fs::write(game_root.join("modify.bin"), b"not-the-original-asset").unwrap();
    let plan = modify_patch_plan(&task_root, &old_bytes, &new_bytes, md5(&old_bytes));
    let error = assemble_plan(&plan, &game_root, &task_root, &AtomicBool::new(false)).unwrap_err();
    assert!(error.contains("原文件"));
    assert_eq!(fs::read(game_root.join("modify.bin")).unwrap(), b"not-the-original-asset");
    assert!(!task_root.join("tasks/assembler-test/staging/modify.bin").exists());
  }

  #[test]
  fn applies_zstd_hdiff_patch_into_staging() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let game_root = root.game_root();
    let old_bytes = modify_old_bytes();
    let new_bytes = modify_new_bytes();
    fs::create_dir_all(&game_root).unwrap();
    fs::write(game_root.join("modify.bin"), &old_bytes).unwrap();
    let plan = modify_patch_plan(&task_root, &old_bytes, &new_bytes, md5(&old_bytes));
    let summary = assemble_plan(&plan, &game_root, &task_root, &AtomicBool::new(false)).unwrap();
    assert_eq!(summary.asset_count, 1);
    assert_eq!(summary.assembled_bytes, new_bytes.len() as u64);
    assert_eq!(
      fs::read(task_root.join("tasks/assembler-test/staging/modify.bin")).unwrap(),
      new_bytes
    );
    assert_eq!(fs::read(game_root.join("modify.bin")).unwrap(), old_bytes);
  }
}
