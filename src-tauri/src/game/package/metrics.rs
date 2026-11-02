//! 安装流水线指标与计划 workset 基线。
//! @since Beta v0.13.0

use crate::game::{
  assembler,
  downloader::{DownloadTelemetry, DownloadTelemetrySnapshot},
  installer, journal,
  planner::PersistedPlan,
};
use std::{
  collections::{HashMap, HashSet},
  sync::{
    Arc,
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};

/// 计划资源 workset 的性能基线。
///
/// @since Beta v0.13.0
#[derive(Debug)]
struct PlanWorksetBaseline {
  asset_count: usize,
  download_count: usize,
  chunk_count: usize,
  planned_download_bytes: u64,
  planned_output_bytes: u64,
  asset_workset_max: u64,
  asset_workset_p50: u64,
  asset_workset_p95: u64,
  asset_workset_p99: u64,
  asset_workset_chunk_max: usize,
  batch_union_max: u64,
  batch_union_p95: u64,
  max_download_consumers: usize,
  max_download_span: usize,
}

impl PlanWorksetBaseline {
  /// 从计划计算 workset 基线。
  ///
  /// @since Beta v0.13.0
  ///
  /// # 参数
  /// - `plan`: 资源计划。
  /// - `concurrency`: 并发数。
  ///
  /// # 返回
  /// workset 基线。
  fn from_plan(plan: &PersistedPlan, concurrency: usize) -> Self {
    let mut asset_worksets = Vec::with_capacity(plan.assets.len());
    let mut asset_workset_chunk_max = 0_usize;
    let mut batch_unions = Vec::with_capacity(plan.assets.len().div_ceil(concurrency.max(1)));
    let mut consumers = HashMap::<&str, (usize, usize, usize)>::new();
    let batch_size = concurrency.max(1);

    for (batch_start, batch) in plan.assets.chunks(batch_size).enumerate() {
      let mut batch_downloads = HashSet::new();
      let mut batch_bytes = 0_u64;
      for (offset, asset) in batch.iter().enumerate() {
        let asset_index = batch_start.saturating_mul(batch_size).saturating_add(offset);
        let mut asset_downloads = HashSet::new();
        let mut workset_bytes = 0_u64;
        for chunk in &asset.chunks {
          if chunk.reuse.is_some() || !asset_downloads.insert(chunk.id.as_str()) {
            continue;
          }
          workset_bytes = workset_bytes.saturating_add(chunk.compressed_size);
          let entry = consumers.entry(chunk.id.as_str()).or_insert((asset_index, asset_index, 0));
          entry.1 = asset_index;
          entry.2 = entry.2.saturating_add(1);
          if batch_downloads.insert(chunk.id.as_str()) {
            batch_bytes = batch_bytes.saturating_add(chunk.compressed_size);
          }
        }
        asset_workset_chunk_max = asset_workset_chunk_max.max(asset_downloads.len());
        asset_worksets.push(workset_bytes);
      }
      batch_unions.push(batch_bytes);
    }

    let asset_workset_max = asset_worksets.iter().copied().max().unwrap_or_default();
    let batch_union_max = batch_unions.iter().copied().max().unwrap_or_default();
    let max_download_consumers =
      consumers.values().map(|(_, _, count)| *count).max().unwrap_or_default();
    let max_download_span = consumers
      .values()
      .map(|(first, last, _)| last.saturating_sub(*first).saturating_add(1))
      .max()
      .unwrap_or_default();
    Self {
      asset_count: plan.assets.len(),
      download_count: plan.downloads.len(),
      chunk_count: plan.assets.iter().map(|asset| asset.chunks.len()).sum(),
      planned_download_bytes: plan
        .downloads
        .iter()
        .fold(0_u64, |total, download| total.saturating_add(download.compressed_size)),
      planned_output_bytes: plan
        .assets
        .iter()
        .fold(0_u64, |total, asset| total.saturating_add(asset.size)),
      asset_workset_max,
      asset_workset_p50: nearest_rank(&asset_worksets, 50),
      asset_workset_p95: nearest_rank(&asset_worksets, 95),
      asset_workset_p99: nearest_rank(&asset_worksets, 99),
      asset_workset_chunk_max,
      batch_union_max,
      batch_union_p95: nearest_rank(&batch_unions, 95),
      max_download_consumers,
      max_download_span,
    }
  }
}

/// 计算最近邻百分位值。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `values`: 值列表。
/// - `percentile`: 百分位。
///
/// # 返回
/// 百分位值。
fn nearest_rank(values: &[u64], percentile: usize) -> u64 {
  if values.is_empty() {
    return 0;
  }
  let mut sorted = values.to_vec();
  sorted.sort_unstable();
  let rank = sorted.len().saturating_mul(percentile).div_ceil(100).clamp(1, sorted.len());
  sorted[rank - 1]
}

/// 安装流水线的并发指标、计划基线与持久化耗时统计。
///
/// @since Beta v0.13.0
pub(super) struct InstallPipelineMetrics {
  plan_id: String,
  started_at: Instant,
  index_build_micros: u64,
  baseline: PlanWorksetBaseline,
  queue_refill_count: AtomicUsize,
  active_downloads: AtomicUsize,
  peak_active_downloads: AtomicUsize,
  active_assemblies: AtomicUsize,
  peak_active_assemblies: AtomicUsize,
  download_micros: AtomicU64,
  assembly_micros: AtomicU64,
  checkpoint_count: AtomicUsize,
  checkpoint_micros: AtomicU64,
  unique_download_bytes: AtomicU64,
  duplicate_wait_bytes: AtomicU64,
  peak_spool_bytes: AtomicU64,
  peak_logical_staging_bytes: AtomicU64,
  eta_remaining_bytes: AtomicU64,
  download_telemetry: Arc<DownloadTelemetry>,
  assembly_telemetry: Arc<assembler::AssemblyTelemetry>,
  stall_pause_requested: Arc<AtomicBool>,
  journal_attempt_count: AtomicU64,
  journal_write_count: AtomicU64,
  journal_serialized_bytes: AtomicU64,
  journal_serialize_micros: AtomicU64,
  journal_write_micros: AtomicU64,
  journal_file_sync_count: AtomicU64,
  journal_file_sync_micros: AtomicU64,
  journal_rename_micros: AtomicU64,
  journal_directory_sync_count: AtomicU64,
  journal_directory_sync_micros: AtomicU64,
  journal_lock_wait_micros: AtomicU64,
  staging_verify_count: AtomicU64,
  staging_verify_micros: AtomicU64,
  post_publish_verify_count: AtomicU64,
  post_publish_verify_micros: AtomicU64,
  zstd_decode_read_count: AtomicU64,
  zstd_decode_read_bytes: AtomicU64,
  zstd_decode_read_micros: AtomicU64,
  chunk_md5_count: AtomicU64,
  chunk_md5_bytes: AtomicU64,
  chunk_md5_micros: AtomicU64,
  asset_md5_count: AtomicU64,
  asset_md5_bytes: AtomicU64,
  asset_md5_micros: AtomicU64,
  staging_file_sync_count: AtomicU64,
  staging_file_sync_bytes: AtomicU64,
  staging_file_sync_micros: AtomicU64,
  resume_asset_cursor: AtomicUsize,
  recovery_validate_micros: AtomicU64,
}

impl InstallPipelineMetrics {
  /// 创建安装流水线指标收集器。
  /// @since Beta v0.13.0
  pub(super) fn new(
    plan: &PersistedPlan,
    concurrency: usize,
    started_at: Instant,
    index_build_micros: u64,
    stall_pause_requested: Arc<AtomicBool>,
  ) -> Self {
    Self {
      plan_id: plan.plan_id.clone(),
      started_at,
      index_build_micros,
      baseline: PlanWorksetBaseline::from_plan(plan, concurrency),
      queue_refill_count: AtomicUsize::new(0),
      active_downloads: AtomicUsize::new(0),
      peak_active_downloads: AtomicUsize::new(0),
      active_assemblies: AtomicUsize::new(0),
      peak_active_assemblies: AtomicUsize::new(0),
      download_micros: AtomicU64::new(0),
      assembly_micros: AtomicU64::new(0),
      checkpoint_count: AtomicUsize::new(0),
      checkpoint_micros: AtomicU64::new(0),
      unique_download_bytes: AtomicU64::new(0),
      duplicate_wait_bytes: AtomicU64::new(0),
      peak_spool_bytes: AtomicU64::new(0),
      peak_logical_staging_bytes: AtomicU64::new(0),
      eta_remaining_bytes: AtomicU64::new(
        plan
          .downloads
          .iter()
          .fold(0_u64, |total, download| total.saturating_add(download.compressed_size)),
      ),
      download_telemetry: DownloadTelemetry::new(),
      assembly_telemetry: assembler::AssemblyTelemetry::new(),
      stall_pause_requested,
      journal_attempt_count: AtomicU64::new(0),
      journal_write_count: AtomicU64::new(0),
      journal_serialized_bytes: AtomicU64::new(0),
      journal_serialize_micros: AtomicU64::new(0),
      journal_write_micros: AtomicU64::new(0),
      journal_file_sync_count: AtomicU64::new(0),
      journal_file_sync_micros: AtomicU64::new(0),
      journal_rename_micros: AtomicU64::new(0),
      journal_directory_sync_count: AtomicU64::new(0),
      journal_directory_sync_micros: AtomicU64::new(0),
      journal_lock_wait_micros: AtomicU64::new(0),
      staging_verify_count: AtomicU64::new(0),
      staging_verify_micros: AtomicU64::new(0),
      post_publish_verify_count: AtomicU64::new(0),
      post_publish_verify_micros: AtomicU64::new(0),
      zstd_decode_read_count: AtomicU64::new(0),
      zstd_decode_read_bytes: AtomicU64::new(0),
      zstd_decode_read_micros: AtomicU64::new(0),
      chunk_md5_count: AtomicU64::new(0),
      chunk_md5_bytes: AtomicU64::new(0),
      chunk_md5_micros: AtomicU64::new(0),
      asset_md5_count: AtomicU64::new(0),
      asset_md5_bytes: AtomicU64::new(0),
      asset_md5_micros: AtomicU64::new(0),
      staging_file_sync_count: AtomicU64::new(0),
      staging_file_sync_bytes: AtomicU64::new(0),
      staging_file_sync_micros: AtomicU64::new(0),
      resume_asset_cursor: AtomicUsize::new(0),
      recovery_validate_micros: AtomicU64::new(0),
    }
  }

  /// 返回下载遥测快照。
  /// @since Beta v0.13.0
  pub(super) fn download_snapshot(&self) -> DownloadTelemetrySnapshot {
    self.download_telemetry.snapshot()
  }

  /// 返回组装遥测快照。
  /// @since Beta v0.13.0
  pub(super) fn assembly_snapshot(&self) -> assembler::AssemblyTelemetrySnapshot {
    self.assembly_telemetry.snapshot()
  }

  /// 共享下载遥测给准备阶段看门狗。
  /// @since Beta v0.13.0
  pub(super) fn download_telemetry(&self) -> Arc<DownloadTelemetry> {
    Arc::clone(&self.download_telemetry)
  }

  /// 共享组装遥测给准备阶段看门狗。
  /// @since Beta v0.13.0
  pub(super) fn assembly_telemetry(&self) -> Arc<assembler::AssemblyTelemetry> {
    Arc::clone(&self.assembly_telemetry)
  }

  /// 读取当前活跃下载数。
  /// @since Beta v0.13.0
  pub(super) fn active_downloads(&self) -> usize {
    self.active_downloads.load(Ordering::Acquire)
  }

  /// 读取当前活跃组装数。
  /// @since Beta v0.13.0
  pub(super) fn active_assemblies(&self) -> usize {
    self.active_assemblies.load(Ordering::Acquire)
  }

  /// 读取 ETA 使用的剩余下载字节数。
  /// @since Beta v0.13.0
  pub(super) fn remaining_bytes(&self) -> u64 {
    self.eta_remaining_bytes.load(Ordering::Acquire)
  }

  /// 读取队列补充次数。
  /// @since Beta v0.13.0
  pub(super) fn queue_refills(&self) -> usize {
    self.queue_refill_count.load(Ordering::Relaxed)
  }

  /// 记录一次队列补充。
  /// @since Beta v0.13.0
  pub(super) fn record_queue_refill(&self) {
    self.queue_refill_count.fetch_add(1, Ordering::Relaxed);
  }

  /// 读取停滞暂停请求。
  /// @since Beta v0.13.0
  pub(super) fn is_stall_pause_requested(&self) -> bool {
    self.stall_pause_requested.load(Ordering::Acquire)
  }

  /// 原子地请求停滞暂停，并返回是否已有请求。
  /// @since Beta v0.13.0
  pub(super) fn request_stall_pause(&self) -> bool {
    self.stall_pause_requested.swap(true, Ordering::AcqRel)
  }

  /// 记录下载开始并返回起始时刻。
  /// @since Beta v0.13.0
  pub(super) fn begin_download(&self) -> Instant {
    let active = self.active_downloads.fetch_add(1, Ordering::AcqRel).saturating_add(1);
    self.peak_active_downloads.fetch_max(active, Ordering::AcqRel);
    Instant::now()
  }

  /// 记录下载结束及耗时。
  /// @since Beta v0.13.0
  pub(super) fn finish_download(&self, started_at: Instant) {
    self.active_downloads.fetch_sub(1, Ordering::AcqRel);
    self.download_micros.fetch_add(duration_micros(started_at.elapsed()), Ordering::Relaxed);
  }

  /// 记录组装开始并返回起始时刻。
  /// @since Beta v0.13.0
  pub(super) fn begin_assembly(&self) -> Instant {
    let active = self.active_assemblies.fetch_add(1, Ordering::AcqRel).saturating_add(1);
    self.peak_active_assemblies.fetch_max(active, Ordering::AcqRel);
    Instant::now()
  }

  /// 记录组装结束并返回耗时。
  /// @since Beta v0.13.0
  pub(super) fn finish_assembly(&self, started_at: Instant) -> Duration {
    let elapsed = started_at.elapsed();
    self.active_assemblies.fetch_sub(1, Ordering::AcqRel);
    self.assembly_micros.fetch_add(duration_micros(elapsed), Ordering::Relaxed);
    elapsed
  }

  /// 记录一次检查点持久化耗时。
  /// @since Beta v0.13.0
  pub(super) fn record_checkpoint(&self, elapsed: Duration) {
    self.checkpoint_count.fetch_add(1, Ordering::Relaxed);
    self.checkpoint_micros.fetch_add(duration_micros(elapsed), Ordering::Relaxed);
  }

  /// 更新 spool 峰值占用。
  /// @since Beta v0.13.0
  pub(super) fn observe_spool(&self, bytes: u64) {
    self.peak_spool_bytes.fetch_max(bytes, Ordering::Relaxed);
  }

  /// 更新逻辑 staging 峰值占用。
  /// @since Beta v0.13.0
  pub(super) fn observe_logical_staging(&self, bytes: u64) {
    self.peak_logical_staging_bytes.fetch_max(bytes, Ordering::Relaxed);
  }

  /// 汇总 journal 持久化耗时。
  /// @since Beta v0.13.0
  pub(super) fn record_journal(&self, timing: &journal::JournalPersistTiming) {
    self.journal_attempt_count.fetch_add(1, Ordering::Relaxed);
    if timing.persisted {
      self.journal_write_count.fetch_add(1, Ordering::Relaxed);
    }
    self.journal_serialized_bytes.fetch_add(timing.serialized_bytes, Ordering::Relaxed);
    self.journal_serialize_micros.fetch_add(timing.serialize_micros, Ordering::Relaxed);
    self.journal_write_micros.fetch_add(timing.write_micros, Ordering::Relaxed);
    self.journal_file_sync_count.fetch_add(timing.file_sync_count, Ordering::Relaxed);
    self.journal_file_sync_micros.fetch_add(timing.file_sync_micros, Ordering::Relaxed);
    self.journal_rename_micros.fetch_add(timing.rename_micros, Ordering::Relaxed);
    self.journal_directory_sync_count.fetch_add(timing.directory_sync_count, Ordering::Relaxed);
    self.journal_directory_sync_micros.fetch_add(timing.directory_sync_micros, Ordering::Relaxed);
    self.journal_lock_wait_micros.fetch_add(timing.lock_wait_micros, Ordering::Relaxed);
  }

  /// 汇总安装发布后的校验耗时。
  /// @since Beta v0.13.0
  pub(super) fn record_validation(&self, timing: &installer::InstallValidationTiming) {
    self.record_assembly_detail(&timing.assembly);
    self.staging_verify_count.fetch_add(timing.staging_tree_count, Ordering::Relaxed);
    self.staging_verify_micros.fetch_add(timing.staging_tree_micros, Ordering::Relaxed);
    self.post_publish_verify_count.fetch_add(timing.post_publish_count, Ordering::Relaxed);
    self.post_publish_verify_micros.fetch_add(timing.post_publish_micros, Ordering::Relaxed);
    self.journal_attempt_count.fetch_add(timing.journal_attempt_count, Ordering::Relaxed);
    self.journal_write_count.fetch_add(timing.journal_write_count, Ordering::Relaxed);
    self.journal_serialized_bytes.fetch_add(timing.journal_serialized_bytes, Ordering::Relaxed);
    self.journal_serialize_micros.fetch_add(timing.journal_serialize_micros, Ordering::Relaxed);
    self.journal_write_micros.fetch_add(timing.journal_write_micros, Ordering::Relaxed);
    self.journal_file_sync_count.fetch_add(timing.journal_file_sync_count, Ordering::Relaxed);
    self.journal_file_sync_micros.fetch_add(timing.journal_file_sync_micros, Ordering::Relaxed);
    self.journal_rename_micros.fetch_add(timing.journal_rename_micros, Ordering::Relaxed);
    self
      .journal_directory_sync_count
      .fetch_add(timing.journal_directory_sync_count, Ordering::Relaxed);
    self
      .journal_directory_sync_micros
      .fetch_add(timing.journal_directory_sync_micros, Ordering::Relaxed);
    self.journal_lock_wait_micros.fetch_add(timing.journal_lock_wait_micros, Ordering::Relaxed);
  }

  /// 汇总组装阶段耗时。
  /// @since Beta v0.13.0
  pub(super) fn record_assembly_detail(&self, timing: &assembler::AssemblyTiming) {
    self.zstd_decode_read_count.fetch_add(timing.zstd_decode_read_count, Ordering::Relaxed);
    self.zstd_decode_read_bytes.fetch_add(timing.zstd_decode_read_bytes, Ordering::Relaxed);
    self.zstd_decode_read_micros.fetch_add(timing.zstd_decode_read_micros, Ordering::Relaxed);
    self.chunk_md5_count.fetch_add(timing.chunk_md5_count, Ordering::Relaxed);
    self.chunk_md5_bytes.fetch_add(timing.chunk_md5_bytes, Ordering::Relaxed);
    self.chunk_md5_micros.fetch_add(timing.chunk_md5_micros, Ordering::Relaxed);
    self.asset_md5_count.fetch_add(timing.asset_md5_count, Ordering::Relaxed);
    self.asset_md5_bytes.fetch_add(timing.asset_md5_bytes, Ordering::Relaxed);
    self.asset_md5_micros.fetch_add(timing.asset_md5_micros, Ordering::Relaxed);
    self.staging_file_sync_count.fetch_add(timing.staging_file_sync_count, Ordering::Relaxed);
    self.staging_file_sync_bytes.fetch_add(timing.staging_file_sync_bytes, Ordering::Relaxed);
    self.staging_file_sync_micros.fetch_add(timing.staging_file_sync_micros, Ordering::Relaxed);
  }

  /// 记录恢复校验游标与耗时。
  /// @since Beta v0.13.0
  pub(super) fn record_recovery_validation(&self, cursor: usize, elapsed: Duration) {
    self.resume_asset_cursor.store(cursor, Ordering::Relaxed);
    self.recovery_validate_micros.store(duration_micros(elapsed), Ordering::Relaxed);
  }

  /// 记录因并发去重而等待的字节数。
  /// @since Beta v0.13.0
  pub(super) fn record_duplicate_wait(&self, bytes: u64) {
    self.duplicate_wait_bytes.fetch_add(bytes, Ordering::Relaxed);
  }

  /// 记录唯一下载字节数并扣减 ETA 剩余量。
  /// @since Beta v0.13.0
  pub(super) fn record_unique_download(&self, bytes: u64) {
    self.unique_download_bytes.fetch_add(bytes, Ordering::Relaxed);
    let _ = self.eta_remaining_bytes.try_update(Ordering::AcqRel, Ordering::Acquire, |remaining| {
      Some(remaining.saturating_sub(bytes))
    });
  }

  /// 设置 ETA 计算所用的剩余字节数。
  /// @since Beta v0.13.0
  pub(super) fn set_eta_remaining_bytes(&self, bytes: u64) {
    self.eta_remaining_bytes.store(bytes, Ordering::Release);
  }
}

impl Drop for InstallPipelineMetrics {
  /// 输出安装流水线的性能摘要。
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    let download = self.download_telemetry.snapshot();
    let assembly = self.assembly_telemetry.snapshot();
    log::info!(
      "[game-package][install][{}][perf] totalMs={} indexBuildCount=1 indexBuildUs={} assets={} downloads={} chunks={} plannedDownloadBytes={} plannedOutputBytes={} assetWorksetMax={} assetWorksetP50={} assetWorksetP95={} assetWorksetP99={} assetWorksetChunkMax={} batchUnionMax={} batchUnionP95={} maxDownloadConsumers={} maxDownloadSpan={} queueRefills={} peakDownloads={} peakAssemblies={} downloadMs={} assemblyMs={} downloadNetworkMs={} downloadWriteMs={} downloadHashMs={} downloadFileSyncCount={} downloadFileSyncMs={} downloadReceivedBytes={} downloadCacheHits={} downloadAttempts={} downloadAttemptSuccesses={} downloadAttemptFailures={} downloadRetries={} downloadObjectSuccesses={} downloadObjectFailures={} downloadAborts={} downloadPublishFailures={} zstdDecodeReadCount={} zstdDecodeReadBytes={} zstdDecodeReadMs={} chunkMd5Count={} chunkMd5Bytes={} chunkMd5Ms={} assetMd5Count={} assetMd5Bytes={} assetMd5Ms={} stagingFileSyncCount={} stagingFileSyncBytes={} stagingFileSyncMs={} journalAttempts={} journalWrites={} journalSerializedBytes={} journalSerializeMs={} journalWriteMs={} journalFileSyncCount={} journalFileSyncMs={} journalRenameMs={} journalDirectorySyncCount={} journalDirectorySyncMs={} journalLockWaitMs={} stagingVerifyCount={} stagingVerifyMs={} postPublishVerifyCount={} postPublishVerifyMs={} resumeAssetCursor={} recoveryValidateMs={} checkpoints={} checkpointMs={} scheduledUniqueDownloadBytes={} duplicateWaitBytes={} peakSpoolBytes={} peakLogicalStagingBytes={}",
      self.plan_id,
      self.started_at.elapsed().as_millis(),
      self.index_build_micros,
      self.baseline.asset_count,
      self.baseline.download_count,
      self.baseline.chunk_count,
      self.baseline.planned_download_bytes,
      self.baseline.planned_output_bytes,
      self.baseline.asset_workset_max,
      self.baseline.asset_workset_p50,
      self.baseline.asset_workset_p95,
      self.baseline.asset_workset_p99,
      self.baseline.asset_workset_chunk_max,
      self.baseline.batch_union_max,
      self.baseline.batch_union_p95,
      self.baseline.max_download_consumers,
      self.baseline.max_download_span,
      self.queue_refill_count.load(Ordering::Relaxed),
      self.peak_active_downloads.load(Ordering::Relaxed),
      self.peak_active_assemblies.load(Ordering::Relaxed),
      self.download_micros.load(Ordering::Relaxed) / 1_000,
      self.assembly_micros.load(Ordering::Relaxed) / 1_000,
      download.network_wait_micros / 1_000,
      download.write_micros / 1_000,
      download.hash_micros / 1_000,
      download.file_sync_count,
      download.file_sync_micros / 1_000,
      download.received_bytes,
      download.cache_hits,
      download.attempts,
      download.successful_attempts,
      download.failed_attempts,
      download.retries,
      download.successful_objects,
      download.failed_objects,
      download.aborted_objects,
      download.publish_failures,
      self.zstd_decode_read_count.load(Ordering::Relaxed),
      self.zstd_decode_read_bytes.load(Ordering::Relaxed),
      self.zstd_decode_read_micros.load(Ordering::Relaxed) / 1_000,
      self.chunk_md5_count.load(Ordering::Relaxed),
      self.chunk_md5_bytes.load(Ordering::Relaxed),
      self.chunk_md5_micros.load(Ordering::Relaxed) / 1_000,
      self.asset_md5_count.load(Ordering::Relaxed),
      self.asset_md5_bytes.load(Ordering::Relaxed),
      self.asset_md5_micros.load(Ordering::Relaxed) / 1_000,
      self.staging_file_sync_count.load(Ordering::Relaxed),
      self.staging_file_sync_bytes.load(Ordering::Relaxed),
      self.staging_file_sync_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_attempt_count.load(Ordering::Relaxed),
      self.journal_write_count.load(Ordering::Relaxed),
      self.journal_serialized_bytes.load(Ordering::Relaxed),
      self.journal_serialize_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_write_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_file_sync_count.load(Ordering::Relaxed),
      self.journal_file_sync_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_rename_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_directory_sync_count.load(Ordering::Relaxed),
      self.journal_directory_sync_micros.load(Ordering::Relaxed) / 1_000,
      self.journal_lock_wait_micros.load(Ordering::Relaxed) / 1_000,
      self.staging_verify_count.load(Ordering::Relaxed),
      self.staging_verify_micros.load(Ordering::Relaxed) / 1_000,
      self.post_publish_verify_count.load(Ordering::Relaxed),
      self.post_publish_verify_micros.load(Ordering::Relaxed) / 1_000,
      self.resume_asset_cursor.load(Ordering::Relaxed),
      self.recovery_validate_micros.load(Ordering::Relaxed) / 1_000,
      self.checkpoint_count.load(Ordering::Relaxed),
      self.checkpoint_micros.load(Ordering::Relaxed) / 1_000,
      self.unique_download_bytes.load(Ordering::Relaxed),
      self.duplicate_wait_bytes.load(Ordering::Relaxed),
      self.peak_spool_bytes.load(Ordering::Relaxed),
      self.peak_logical_staging_bytes.load(Ordering::Relaxed),
    );
    log::info!(
      "[game-package][install][{}][stage-perf] downloadNetworkOps={} downloadWriteOps={} downloadWrittenBytes={} downloadNetworkMs={} downloadWriteMs={} downloadNetworkMaxMs={} downloadWriteMaxMs={} assemblyReadOps={} assemblyWriteOps={} assemblyHashOps={} assemblySyncOps={} assemblyReadBytes={} assemblyWrittenBytes={} assemblyHashedBytes={} assemblyReadMs={} assemblyWriteMs={} assemblyHashMs={} assemblySyncMs={} assemblyReadMaxMs={} assemblyWriteMaxMs={} assemblyHashMaxMs={} assemblySyncMaxMs={} watchdogPaused={}",
      self.plan_id,
      download.network_wait_operation_count,
      download.local_write_operation_count,
      download.local_written_bytes,
      download.network_wait_micros / 1_000,
      download.write_micros / 1_000,
      download.max_network_wait_micros / 1_000,
      download.max_local_write_micros / 1_000,
      assembly.read_operations,
      assembly.write_operations,
      assembly.hash_operations,
      assembly.sync_operations,
      assembly.read_bytes,
      assembly.written_bytes,
      assembly.hashed_bytes,
      assembly.read_micros / 1_000,
      assembly.write_micros / 1_000,
      assembly.hash_micros / 1_000,
      assembly.sync_micros / 1_000,
      assembly.max_read_micros / 1_000,
      assembly.max_write_micros / 1_000,
      assembly.max_hash_micros / 1_000,
      assembly.max_sync_micros / 1_000,
      self.stall_pause_requested.load(Ordering::Relaxed),
    );
  }
}

/// 把时长换算为微秒并钳制到 `u64` 范围。
/// @since Beta v0.13.0
pub(super) fn duration_micros(duration: Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}
