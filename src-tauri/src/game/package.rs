//! 可恢复资源下载任务编排、安装互斥、取消与事件投影。
//! @since Beta v0.11.5

use super::{
  assembler, committer,
  downloader::{
    DownloadControl, DownloadDurability, DownloadTelemetry, RateLimiter, download_object,
    prepare_cache_root,
  },
  hoyoplay::{create_http_client, get_game_branches},
  installer,
  journal::{self, TaskJournal},
  model::{
    GameInstallation, PackagePlanStrategy, PackagePlanTarget, PackageTaskCleanupSummary,
    PackageTaskOptions, PackageTaskState, PackageTaskSummary, PackageVerifySummary,
  },
  planner::{
    PersistedPlan, PlanDownload, cached_chunk_matches, flush_cache_validation_index,
    hydrate_and_validate_repair_plan, same_volume,
  },
  switch::{self, PersistedSwitchPlan},
  verify::{self, VerifyRuntime},
};
use chrono::Duration as ChronoDuration;
use futures_util::{StreamExt, stream};
use std::{
  collections::{HashMap, HashSet},
  fs,
  path::{Path, PathBuf},
  sync::{
    Arc, Mutex,
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex as AsyncMutex, Semaphore};

const MIN_CONCURRENCY: usize = 4;
const MAX_CONCURRENCY: usize = 64;
const MIN_RATE_LIMIT: u64 = 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;

/// 默认下载/组装并发：按 CPU 核心数，最低 4 路。
fn default_concurrency() -> usize {
  std::thread::available_parallelism()
    .map(|parallelism| parallelism.get())
    .unwrap_or(MIN_CONCURRENCY)
    .max(MIN_CONCURRENCY)
}

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

fn nearest_rank(values: &[u64], percentile: usize) -> u64 {
  if values.is_empty() {
    return 0;
  }
  let mut sorted = values.to_vec();
  sorted.sort_unstable();
  let rank = sorted.len().saturating_mul(percentile).div_ceil(100).clamp(1, sorted.len());
  sorted[rank - 1]
}

struct InstallPipelineMetrics {
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
  download_telemetry: Arc<DownloadTelemetry>,
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

#[derive(Clone, Default)]
struct RecoveryValidationProgress {
  completed: usize,
  total: usize,
  completed_bytes: u64,
  total_bytes: u64,
  current_file: String,
}

/// 在独立阻塞线程中按逐文件证据复检已组装资源，并持续把进度投影到 journal。
async fn run_install_recovery_validation(
  app_handle: &AppHandle,
  task_root: &Path,
  staging_root: &Path,
  plan: &Arc<PersistedPlan>,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  metrics: &Arc<InstallPipelineMetrics>,
  start_cursor: usize,
) -> Result<(), String> {
  let (progress_tx, mut progress_rx) =
    tokio::sync::mpsc::unbounded_channel::<RecoveryValidationProgress>();
  let plan_for_validation = Arc::clone(plan);
  let task_root_for_validation = task_root.to_path_buf();
  let staging_for_validation = staging_root.to_path_buf();
  let canceled_for_validation = Arc::clone(canceled);
  let validation = tauri::async_runtime::spawn_blocking(move || {
    assembler::validate_full_install_cursor_with_evidence(
      &plan_for_validation,
      &task_root_for_validation,
      &staging_for_validation,
      start_cursor,
      &canceled_for_validation,
      |completed, total, completed_bytes, total_bytes, current_file| {
        let _ = progress_tx.send(RecoveryValidationProgress {
          completed,
          total,
          completed_bytes,
          total_bytes,
          current_file: current_file.to_string(),
        });
      },
    )
  });
  let mut validation = Box::pin(validation);
  let mut last_emit = Instant::now();
  loop {
    let recv_future = Box::pin(progress_rx.recv());
    match futures_util::future::select(validation, recv_future).await {
      futures_util::future::Either::Left((result, _)) => {
        return match result {
          Ok(result) => result,
          Err(error) => Err(format!("安装资源复检 worker 异常退出：{error}")),
        };
      }
      futures_util::future::Either::Right((progress, validation_rest)) => {
        validation = validation_rest;
        let Some(progress) = progress else {
          continue;
        };
        let mut value = journal.lock().await;
        value.verification_completed_count = progress.completed;
        value.verification_total_count = progress.total;
        value.assembly_completed_bytes = progress.completed_bytes;
        value.assembly_total_bytes = progress.total_bytes;
        value.commit_current_step =
          Some(format!("复检已组装资源：{}/{}", progress.completed, progress.total));
        value.current_file = Some(progress.current_file);
        value.touch();
        if last_emit.elapsed() >= Duration::from_millis(500) {
          if let Err(error) = persist_install_progress(task_root, &value, metrics) {
            return Err(error);
          }
          emit_progress(app_handle, &value.summary());
          last_emit = Instant::now();
        }
      }
    }
  }
}

impl InstallPipelineMetrics {
  fn new(
    plan: &PersistedPlan,
    concurrency: usize,
    started_at: Instant,
    index_build_micros: u64,
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
      download_telemetry: DownloadTelemetry::new(),
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

  fn begin_download(&self) -> Instant {
    let active = self.active_downloads.fetch_add(1, Ordering::AcqRel).saturating_add(1);
    self.peak_active_downloads.fetch_max(active, Ordering::AcqRel);
    Instant::now()
  }

  fn finish_download(&self, started_at: Instant) {
    self.active_downloads.fetch_sub(1, Ordering::AcqRel);
    self.download_micros.fetch_add(duration_micros(started_at.elapsed()), Ordering::Relaxed);
  }

  fn begin_assembly(&self) -> Instant {
    let active = self.active_assemblies.fetch_add(1, Ordering::AcqRel).saturating_add(1);
    self.peak_active_assemblies.fetch_max(active, Ordering::AcqRel);
    Instant::now()
  }

  fn finish_assembly(&self, started_at: Instant) {
    self.active_assemblies.fetch_sub(1, Ordering::AcqRel);
    self.assembly_micros.fetch_add(duration_micros(started_at.elapsed()), Ordering::Relaxed);
  }

  fn record_checkpoint(&self, elapsed: Duration) {
    self.checkpoint_count.fetch_add(1, Ordering::Relaxed);
    self.checkpoint_micros.fetch_add(duration_micros(elapsed), Ordering::Relaxed);
  }

  fn observe_spool(&self, bytes: u64) {
    self.peak_spool_bytes.fetch_max(bytes, Ordering::Relaxed);
  }

  fn observe_logical_staging(&self, bytes: u64) {
    self.peak_logical_staging_bytes.fetch_max(bytes, Ordering::Relaxed);
  }

  fn record_journal(&self, timing: &journal::JournalPersistTiming) {
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

  fn record_validation(&self, timing: &installer::InstallValidationTiming) {
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

  fn record_assembly_detail(&self, timing: &assembler::AssemblyTiming) {
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

  fn record_recovery_validation(&self, cursor: usize, elapsed: Duration) {
    self.resume_asset_cursor.store(cursor, Ordering::Relaxed);
    self.recovery_validate_micros.store(duration_micros(elapsed), Ordering::Relaxed);
  }

  fn record_duplicate_wait(&self, bytes: u64) {
    self.duplicate_wait_bytes.fetch_add(bytes, Ordering::Relaxed);
  }

  fn record_unique_download(&self, bytes: u64) {
    self.unique_download_bytes.fetch_add(bytes, Ordering::Relaxed);
  }
}

impl Drop for InstallPipelineMetrics {
  fn drop(&mut self) {
    let download = self.download_telemetry.snapshot();
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
  }
}

fn duration_micros(duration: Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

fn persist_install_checkpoint(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> Result<(), String> {
  let mut timing = journal::JournalPersistTiming::default();
  let result = journal::persist_timed(task_root, journal_value, &mut timing);
  metrics.record_checkpoint(Duration::from_micros(timing.total_micros));
  metrics.record_journal(&timing);
  result
}

fn persist_install_progress(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> Result<(), String> {
  let mut timing = journal::JournalPersistTiming::default();
  let result = journal::persist_progress_timed(task_root, journal_value, &mut timing);
  metrics.record_journal(&timing);
  result
}

fn persist_optional_install_checkpoint(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: Option<&InstallPipelineMetrics>,
) -> Result<(), String> {
  match metrics {
    Some(metrics) => persist_install_checkpoint(task_root, journal_value, metrics),
    None => journal::persist(task_root, journal_value),
  }
}

pub(crate) struct GamePackageManager {
  active: Arc<Mutex<ActiveTasks>>,
  verify: Arc<VerifyRuntime>,
}

struct ActiveTasks {
  by_task: HashMap<String, ActiveTask>,
  by_installation: HashMap<String, String>,
}

#[derive(Clone)]
struct ActiveTask {
  installation_id: String,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  journal: Arc<AsyncMutex<TaskJournal>>,
}

#[derive(Clone)]
pub(crate) struct InstallContext {
  pub(crate) pool: sqlx::SqlitePool,
  pub(crate) machine_uid: String,
  pub(crate) draft_id: String,
}

pub(crate) struct TaskReservation {
  active: Arc<Mutex<ActiveTasks>>,
  installation_id: String,
  task_id: String,
  retained: bool,
}

impl TaskReservation {
  fn acquire(
    active: Arc<Mutex<ActiveTasks>>,
    installation_id: &str,
    task_id: &str,
  ) -> Result<Self, String> {
    {
      let mut tasks = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if tasks.by_installation.contains_key(installation_id) {
        return Err("该游戏安装已有资源任务正在运行".to_string());
      }
      tasks.by_installation.insert(installation_id.to_string(), task_id.to_string());
    }
    Ok(Self {
      active,
      installation_id: installation_id.to_string(),
      task_id: task_id.to_string(),
      retained: false,
    })
  }

  fn retain(&mut self) {
    self.retained = true;
  }
}

impl Drop for TaskReservation {
  fn drop(&mut self) {
    if self.retained {
      return;
    }
    let Ok(mut active) = self.active.lock() else {
      return;
    };
    if active.by_installation.get(&self.installation_id) == Some(&self.task_id) {
      active.by_installation.remove(&self.installation_id);
    }
  }
}

impl GamePackageManager {
  pub(crate) fn new() -> Self {
    Self {
      active: Arc::new(Mutex::new(ActiveTasks {
        by_task: HashMap::new(),
        by_installation: HashMap::new(),
      })),
      verify: Arc::new(VerifyRuntime::new()),
    }
  }

  /// 启动只写应用缓存的资源下载。游戏运行时仍允许开始；改游戏目录发生在 apply。
  pub(crate) fn start(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    options: PackageTaskOptions,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    if self.verify.is_running(&plan.installation_id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再开始资源任务".to_string());
    }
    if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      || plan.inventory.is_empty()
    {
      return Err("当前只能启动包含完整目标清单的资源计划".to_string());
    }
    let concurrency = options.concurrency.unwrap_or_else(default_concurrency);
    if options.concurrency.is_some() && !(1..=MAX_CONCURRENCY).contains(&concurrency) {
      return Err(format!("下载并发数必须在 1 到 {MAX_CONCURRENCY} 之间"));
    }
    if options.max_bytes_per_second.is_some_and(|value| value < MIN_RATE_LIMIT) {
      return Err("下载限速不能低于 1 MiB/s".to_string());
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let cache_root = prepare_cache_root(&task_root)?;
    let download_client = create_http_client()?;
    let missing_bytes = plan
      .downloads
      .iter()
      .filter(|download| !cached_chunk_matches(&cache_root, download))
      .try_fold(0_u64, |total, download| {
        total.checked_add(download.compressed_size).ok_or_else(|| "待下载资源大小溢出".to_string())
      })?;
    let required = missing_bytes
      .checked_add(SAFETY_MARGIN_BYTES)
      .ok_or_else(|| "缓存空间需求溢出".to_string())?;
    let available = fs2::available_space(&cache_root)
      .map_err(|error| format!("读取资源缓存磁盘剩余空间失败：{error}"))?;
    if available < required {
      return Err(format!("资源缓存磁盘空间不足：至少还需 {required} 字节，可用 {available} 字节"));
    }

    let mut journal = journal::load_or_create(&task_root, &plan)?;
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的资源任务，请使用恢复操作继续".to_string());
    }
    if recovering && journal.state == PackageTaskState::ReadyToApply {
      return Err("资源任务已经完成下载".to_string());
    }
    rebuild_completed_cache(&mut journal, &plan, &cache_root);
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.bytes_per_second = 0;
    journal.eta_seconds = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;

    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_task(
        app_handle.clone(),
        &task_root,
        &cache_root,
        None,
        plan.clone(),
        download_client,
        shared_journal,
        Arc::clone(&canceled),
        Arc::clone(&paused),
        concurrency,
        options.max_bytes_per_second,
        None,
      )
      .await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn has_running_tasks(&self) -> Result<bool, String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    Ok(!active.by_task.is_empty())
  }

  pub(crate) fn start_install(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    draft_id: String,
    options: PackageTaskOptions,
    context: InstallContext,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    installer::ensure_windows_install_platform()?;
    if plan.target != PackagePlanTarget::Install || plan.strategy != PackagePlanStrategy::Full {
      return Err("当前计划不是全新安装计划".to_string());
    }
    if plan.inventory.is_empty() || plan.install_overlay.is_none() {
      return Err("全新安装计划缺少完整目标清单".to_string());
    }
    let concurrency = options.concurrency.unwrap_or_else(default_concurrency);
    if options.concurrency.is_some() && !(1..=MAX_CONCURRENCY).contains(&concurrency) {
      return Err(format!("下载并发数必须在 1 到 {MAX_CONCURRENCY} 之间"));
    }
    if options.max_bytes_per_second.is_some_and(|value| value < MIN_RATE_LIMIT) {
      return Err("下载限速不能低于 1 MiB/s".to_string());
    }
    let download_client = create_http_client()?;
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let cache_root = prepare_cache_root(&task_root)?;
    let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
    let spool_root = installer::prepare_install_spool(&task_root, &draft_id, overlay)?;
    if matches!(
      installer::load_draft(&task_root, &draft_id)?.state,
      installer::InstallDraftState::Completed | installer::InstallDraftState::Canceled
    ) {
      return Err("安装草稿已经结束，不能重新启动".to_string());
    }
    let install_bytes = plan
      .assets
      .iter()
      .try_fold(overlay.config.len() as u64, |total, asset| {
        total.checked_add(asset.size).ok_or_else(|| "安装大小溢出".to_string())
      })?
      .checked_add(overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size))
      .ok_or_else(|| "安装大小溢出".to_string())?;
    let game_parent = Path::new(&overlay.game_root).parent().unwrap_or(Path::new("."));
    let install_available = fs2::available_space(game_parent)
      .map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
    let spool_parent = Path::new(&overlay.spool_root).parent().unwrap_or(Path::new("."));
    let spool_available = fs2::available_space(spool_parent)
      .map_err(|error| format!("读取安装任务 spool 磁盘剩余空间失败：{error}"))?;
    let minimum_spool_window = 256 * 1024 * 1024;
    let minimum_sufficient = if same_volume(spool_parent, game_parent) {
      install_available
        >= install_bytes.saturating_add(minimum_spool_window).saturating_add(SAFETY_MARGIN_BYTES)
    } else {
      install_available >= install_bytes.saturating_add(SAFETY_MARGIN_BYTES)
        && spool_available >= minimum_spool_window.saturating_add(SAFETY_MARGIN_BYTES)
    };
    if !minimum_sufficient {
      return Err("安装空间不足，无法创建安装任务".to_string());
    }
    let mut journal = journal::load_or_create(&task_root, &plan)?;
    if journal.state.blocks_launch() && !recovering {
      return Err("检测到未完成的安装提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的安装任务，请使用恢复操作继续".to_string());
    }
    if !recovering && journal.state == PackageTaskState::Paused {
      return Err("检测到已暂停的安装任务，请使用恢复操作继续".to_string());
    }
    if recovering
      && matches!(
        journal.state,
        PackageTaskState::Published
          | PackageTaskState::Verified
          | PackageTaskState::RegistrationPending
      )
    {
      return Err("安装已经发布，请使用安装恢复命令完成登记".to_string());
    }
    rebuild_install_cache_state(&mut journal, &plan, &cache_root, &spool_root);
    let cache_complete = journal.committed_step >= journal.total_count;
    let spool_window = install_spool_window(&plan, concurrency, cache_complete);
    let required = install_bytes.saturating_add(spool_window).saturating_add(SAFETY_MARGIN_BYTES);
    let spool_required = spool_window.saturating_add(SAFETY_MARGIN_BYTES);
    let sufficient = if same_volume(spool_parent, game_parent) {
      install_available >= required
    } else {
      install_available >= install_bytes.saturating_add(SAFETY_MARGIN_BYTES)
        && spool_available >= spool_required
    };
    if !sufficient {
      let error = format!(
        "安装空间不足：安装盘可用 {} 字节，spool 盘可用 {} 字节，至少需要安装输出 {} 字节与 spool {} 字节",
        install_available,
        spool_available,
        install_bytes.saturating_add(SAFETY_MARGIN_BYTES),
        spool_required,
      );
      journal.state = PackageTaskState::Failed;
      journal.error_message = Some(error.clone());
      journal.touch();
      journal::persist(&task_root, &journal)?;
      return Err(error);
    }
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.bytes_per_second = 0;
    journal.eta_seconds = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    installer::set_draft_state(&task_root, &draft_id, installer::InstallDraftState::Downloading)?;
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_install_streaming_task(
        app_handle.clone(),
        task_root.clone(),
        cache_root,
        spool_root,
        plan,
        download_client,
        shared_journal,
        canceled,
        paused,
        concurrency,
        options.max_bytes_per_second,
        context,
      )
      .await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn start_switch(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    plan: PersistedSwitchPlan,
    recovering: bool,
  ) -> Result<PackageTaskSummary, String> {
    if is_game_running() {
      return Err("游戏仍在运行，无法开始换服".to_string());
    }
    if self.verify.is_running(plan.installation_id())? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再换服".to_string());
    }
    if journal::has_incomplete_tasks(&task_root, Some(plan.installation_id()))? {
      let incomplete = journal::list(&task_root, Some(plan.installation_id()))?;
      if incomplete.iter().any(|journal| {
        journal.plan_id != plan.plan_id()
          && !matches!(
            journal.state,
            PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
          )
      }) {
        return Err("该游戏安装已有未完成的资源任务，暂时不能换服".to_string());
      }
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), plan.installation_id(), plan.plan_id())?;
    let mut journal = switch::load_or_create_switch_journal(&task_root, &plan)?;
    if journal.state.blocks_launch() && !recovering {
      return Err("检测到未完成的换服提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的换服任务，请使用恢复操作继续".to_string());
    }
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id().to_string(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id().to_string(), task);
    }
    reservation.retain();
    let summary = journal::load(&journal::journal_path(&task_root, plan.plan_id()))?.summary();
    emit_state(&app_handle, &summary);
    let active = Arc::clone(&self.active);
    let finished_task_id = summary.task_id.clone();
    tauri::async_runtime::spawn(async move {
      run_switch(app_handle, task_root, installation, plan, shared_journal, canceled).await;
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn rollback_switch(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    game_root: &Path,
    request: &committer::SwitchApplyRequest,
    retry: bool,
  ) -> Result<PackageTaskSummary, String> {
    let journal_value = journal::load(&journal::journal_path(task_root, &request.plan_id))?;
    let _reservation = TaskReservation::acquire(
      Arc::clone(&self.active),
      &journal_value.installation_id,
      &request.plan_id,
    )?;
    if is_game_running() {
      return Err("游戏仍在运行，无法恢复换服提交".to_string());
    }
    let mut journal_value = journal_value;
    committer::rollback_switch(
      request,
      game_root,
      task_root,
      &mut journal_value,
      retry,
      |journal| {
        emit_state(app_handle, &journal.summary());
      },
    )?;
    Ok(journal_value.summary())
  }

  pub(crate) fn cancel(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    task_id: &str,
  ) -> Result<(), String> {
    if let Some(summary) = self.request_or_reap_cancel(task_root, task_id)? {
      emit_state(app_handle, &summary);
    }
    Ok(())
  }

  /// 暂停全新安装的资源下载，保留草稿与已完成缓存以便后续恢复。
  pub(crate) async fn pause_install(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    task_id: &str,
    installation_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    let task = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.get(task_id).cloned()
    };
    let Some(task) = task else {
      let journal = journal::load(&journal::journal_path(task_root, task_id))?;
      if journal.installation_id != installation_id {
        return Err("安装任务身份不匹配".to_string());
      }
      if journal.state == PackageTaskState::Paused {
        return Ok(journal.summary());
      }
      return Err("安装任务当前不在下载中".to_string());
    };
    if task.installation_id != installation_id {
      return Err("安装任务身份不匹配".to_string());
    }
    let mut journal_value = task.journal.lock().await;
    if journal_value.target != PackagePlanTarget::Install {
      return Err("当前任务不是游戏本体安装任务".to_string());
    }
    if journal_value.installation_id != installation_id {
      return Err("安装任务身份不匹配".to_string());
    }
    if journal_value.state == PackageTaskState::Paused {
      return Ok(journal_value.summary());
    }
    if !matches!(
      journal_value.state,
      PackageTaskState::Queued | PackageTaskState::Downloading | PackageTaskState::Assembling
    ) {
      return Err("安装任务当前不能暂停".to_string());
    }
    let previous_state = journal_value.state;
    task.paused.store(true, Ordering::Release);
    journal_value.state = PackageTaskState::Paused;
    journal_value.current_file = None;
    journal_value.bytes_per_second = 0;
    journal_value.eta_seconds = None;
    journal_value.error_message = None;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      task.paused.store(false, Ordering::Release);
      journal_value.state = previous_state;
      return Err(error);
    }
    let summary = journal_value.summary();
    emit_progress(app_handle, &summary);
    emit_state(app_handle, &summary);
    Ok(summary)
  }

  /// 等待暂停任务的下载 worker 退出，避免恢复或删除与旧 worker 并发操作日志和缓存。
  pub(crate) async fn wait_for_task_idle(&self, task_id: &str) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
      let running = {
        let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
        active.by_task.contains_key(task_id)
      };
      if !running {
        return Ok(());
      }
      if Instant::now() >= deadline {
        return Err("安装任务仍在停止，请稍后重试".to_string());
      }
      tokio::time::sleep(Duration::from_millis(50)).await;
    }
  }

  fn request_or_reap_cancel(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<Option<PackageTaskSummary>, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if let Some(task) = active.by_task.get(task_id) {
        task.canceled.store(true, Ordering::Release);
        return Ok(None);
      }
      if active.by_installation.values().any(|id| id == task_id) {
        return Ok(None);
      }
    }
    let journal = journal::load(&journal::journal_path(task_root, task_id))?;
    if matches!(
      journal.state,
      PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
    ) {
      return Ok(Some(journal.summary()));
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    Ok(Some(self.rollback_download(task_root, task_id)?))
  }

  pub(crate) fn apply(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    plan: PersistedPlan,
  ) -> Result<PackageTaskSummary, String> {
    if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      || plan.inventory.is_empty()
    {
      return Err("当前只能应用包含完整目标清单的资源计划".to_string());
    }
    if self.verify.is_running(&installation.id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再应用更新".to_string());
    }
    let mut reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    if is_game_running() {
      return Err("游戏仍在运行，无法应用资源更新".to_string());
    }
    let journal_value = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?;
    let can_apply = journal_value.state == PackageTaskState::ReadyToApply;
    let can_repair = journal_value.repair.is_some()
      && matches!(
        journal_value.state,
        PackageTaskState::RepairRequired
          | PackageTaskState::Assembling
          | PackageTaskState::Committing
          | PackageTaskState::Verifying
          | PackageTaskState::RollingBack
      );
    if !can_apply && !can_repair {
      return Err("资源任务当前不能应用或修复".to_string());
    }
    let should_execute_apply = can_apply;
    let game_root = PathBuf::from(&installation.root_path);
    let summary = journal_value.summary();
    let canceled = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal_value));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    reservation.retain();
    let active = Arc::clone(&self.active);
    let finished_task_id = plan.plan_id.clone();
    let worker_journal = Arc::clone(&shared_journal);
    tauri::async_runtime::spawn(async move {
      let worker_app_handle = app_handle.clone();
      let canceled_flag = Arc::clone(&canceled);
      let snapshot = Arc::clone(&worker_journal);
      if should_execute_apply {
        let apply_plan = plan.clone();
        let apply_game_root = game_root.clone();
        let apply_task_root = task_root.clone();
        let apply_canceled = Arc::clone(&canceled_flag);
        let apply_snapshot = Arc::clone(&snapshot);
        let apply_handle = worker_app_handle.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
          let mut journal_value = apply_snapshot.blocking_lock().clone();
          let emit = |journal: &TaskJournal| {
            *apply_snapshot.blocking_lock() = journal.clone();
            let summary = journal.summary();
            emit_state(&apply_handle, &summary);
            emit_progress(&apply_handle, &summary);
          };
          committer::execute_apply(
            &apply_plan,
            &apply_game_root,
            &apply_task_root,
            &mut journal_value,
            &apply_canceled,
            emit,
          )
        })
        .await;
        match result {
          Ok(Ok(committer::ApplyOutcome::Completed)) => {
            finish_task(&active, &finished_task_id);
            return;
          }
          Ok(Ok(committer::ApplyOutcome::RepairNeeded)) => {}
          Ok(Err(error)) => {
            log::warn!("[game-package] 应用资源任务失败：{error}");
            finish_task(&active, &finished_task_id);
            return;
          }
          Err(error) => {
            log::error!("[game-package] 应用资源任务异常退出：{error}");
            finish_task(&active, &finished_task_id);
            return;
          }
        }
      }
      if let Err(error) = continue_repair(
        worker_app_handle,
        task_root,
        game_root,
        installation,
        plan,
        snapshot,
        canceled_flag,
      )
      .await
      {
        log::warn!("[game-package] 修复资源任务失败：{error}");
      }
      finish_task(&active, &finished_task_id);
    });
    Ok(summary)
  }

  pub(crate) fn rollback_apply(
    &self,
    app_handle: &AppHandle,
    task_root: &Path,
    game_root: &Path,
    plan: &PersistedPlan,
    repair_plan: Option<&PersistedPlan>,
    retry: bool,
  ) -> Result<PackageTaskSummary, String> {
    let _reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    if is_game_running() {
      return Err("游戏仍在运行，无法恢复资源提交".to_string());
    }
    let mut journal_value = journal::load(&journal::journal_path(task_root, &plan.plan_id))?;
    committer::rollback_apply(
      plan,
      repair_plan,
      game_root,
      task_root,
      &mut journal_value,
      retry,
      |journal| {
        emit_state(app_handle, &journal.summary());
      },
    )?;
    Ok(journal_value.summary())
  }

  pub(crate) fn start_verify(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    branches: super::hoyoplay::GameBranches,
  ) -> Result<PackageVerifySummary, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if active.by_installation.contains_key(&installation.id) {
        return Err("该游戏安装已有资源任务正在运行".to_string());
      }
    }
    verify::start_verify(&self.verify, app_handle, task_root, installation, branches)
  }

  pub(crate) fn verify_status(
    &self,
    task_root: &Path,
    installation_id: &str,
  ) -> Result<Option<PackageVerifySummary>, String> {
    self.verify.status(task_root, installation_id)
  }

  pub(crate) fn cancel_verify(&self, installation_id: &str) -> Result<(), String> {
    self.verify.cancel(installation_id)
  }

  pub(crate) fn clear_verify(&self, task_root: &Path, installation_id: &str) -> Result<(), String> {
    self.verify.clear(task_root, installation_id)
  }

  pub(crate) fn reserve_installation(
    &self,
    installation_id: &str,
  ) -> Result<TaskReservation, String> {
    TaskReservation::acquire(Arc::clone(&self.active), installation_id, "game-launch")
  }

  pub(crate) async fn list(
    &self,
    task_root: &Path,
    installation_id: Option<&str>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let live_ids = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      let mut ids = active.by_task.keys().cloned().collect::<HashSet<_>>();
      ids.extend(active.by_installation.values().cloned());
      ids
    };
    let mut summaries = HashMap::new();
    for mut journal in journal::list(task_root, installation_id)? {
      if matches!(journal.state, PackageTaskState::Queued | PackageTaskState::Downloading)
        && !live_ids.contains(&journal.task_id)
      {
        journal.state = PackageTaskState::Failed;
        journal.error_message = Some("资源任务已中断，请恢复或放弃".to_string());
        journal.current_file = None;
        journal.touch();
        journal::persist(task_root, &journal)?;
      }
      let mut summary = journal.summary();
      if summary.state.requires_recovery() {
        summary.state = PackageTaskState::RecoveryRequired;
      }
      summaries.insert(summary.task_id.clone(), summary);
    }
    let active = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.values().cloned().collect::<Vec<_>>()
    };
    for task in active {
      if installation_id.is_none_or(|id| id == task.installation_id) {
        let summary = task.journal.lock().await.summary();
        summaries.insert(summary.task_id.clone(), summary);
      }
    }
    let mut summaries = summaries.into_values().collect::<Vec<_>>();
    summaries.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(summaries)
  }

  pub(crate) fn cleanup_tasks(
    &self,
    task_root: &Path,
    max_age: Option<ChronoDuration>,
  ) -> Result<PackageTaskCleanupSummary, String> {
    let active_ids = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.keys().cloned().collect::<HashSet<_>>()
    };
    journal::cleanup_terminal_tasks(task_root, &active_ids, max_age)
  }

  pub(crate) fn rollback_download(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if active.by_task.contains_key(task_id) {
        return Err("任务仍在运行，请先请求取消并等待安全边界".to_string());
      }
    }
    let path = journal::journal_path(task_root, task_id);
    let mut journal = journal::load(&path)?;
    if journal.state == PackageTaskState::Completed {
      return Err("资源任务已经完成".to_string());
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    cleanup_task_partials(&task_root.join("cache/chunks"), task_id)?;
    cleanup_task_partials(&task_root.join("cache/sdks"), task_id)?;
    journal.state = PackageTaskState::Canceled;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(task_root, &journal)?;
    Ok(journal.summary())
  }
}

async fn run_install_streaming_task(
  app_handle: AppHandle,
  task_root: PathBuf,
  shared_cache_root: PathBuf,
  spool_root: PathBuf,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  context: InstallContext,
) {
  let pipeline_started_at = Instant::now();
  let plan = Arc::new(plan);
  let staging_root = match installer::prepare_install_assembly(&plan, &task_root) {
    Ok(path) => path,
    Err(error) => {
      let mut value = journal.lock().await;
      persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
      return;
    }
  };
  let limiter = Arc::new(RateLimiter::new(max_bytes_per_second));
  let index_started_at = Instant::now();
  let download_index = match assembler::FullInstallDownloadIndex::from_plan(&plan) {
    Ok(index) => Arc::new(index),
    Err(error) => {
      persist_install_stream_error(&task_root, &app_handle, &journal, error, false, false).await;
      return;
    }
  };
  let metrics = Arc::new(InstallPipelineMetrics::new(
    &plan,
    concurrency,
    pipeline_started_at,
    duration_micros(index_started_at.elapsed()),
  ));
  let start_cursor = journal.lock().await.completed_asset_cursor.min(plan.assets.len());
  let recovery_started_at = Instant::now();
  let recovery_result = if start_cursor == 0 {
    Ok(())
  } else {
    {
      let mut value = journal.lock().await;
      value.state = PackageTaskState::Assembling;
      value.verification_completed_count = 0;
      value.verification_total_count = start_cursor;
      value.commit_current_step = Some("正在复检已组装资源".to_string());
      value.current_file = value.commit_current_step.clone();
      value.assembly_current_file = None;
      value.touch();
      if let Err(error) = persist_install_checkpoint(&task_root, &value, &metrics) {
        persist_install_stream_error(&task_root, &app_handle, &journal, error, false, false).await;
        return;
      }
      emit_state(&app_handle, &value.summary());
    }
    run_install_recovery_validation(
      &app_handle,
      &task_root,
      &staging_root,
      &plan,
      &journal,
      &canceled,
      &metrics,
      start_cursor,
    )
    .await
  };
  metrics.record_recovery_validation(start_cursor, recovery_started_at.elapsed());
  if let Err(error) = recovery_result {
    persist_install_stream_error(&task_root, &app_handle, &journal, error, false, false).await;
    return;
  }
  if concurrency > 1 {
    if let Err(error) = run_install_bounded_asset_pipeline(
      &app_handle,
      &task_root,
      &shared_cache_root,
      &spool_root,
      &plan,
      &download_index,
      &metrics,
      &download_client,
      &journal,
      &canceled,
      &paused,
      concurrency,
      &limiter,
      &staging_root,
    )
    .await
    {
      let paused_flag = paused.load(Ordering::Acquire);
      let canceled_flag = canceled.load(Ordering::Acquire);
      if canceled_flag {
        let _ = installer::cancel_draft(&task_root, &context.draft_id);
      }
      persist_install_stream_error(
        &task_root,
        &app_handle,
        &journal,
        error,
        paused_flag,
        canceled_flag,
      )
      .await;
      return;
    }
  } else {
    for asset_index in start_cursor..plan.assets.len() {
      if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
        break;
      }
      metrics.queue_refill_count.fetch_add(1, Ordering::Relaxed);
      let asset = &plan.assets[asset_index];
      let mut pending = Vec::new();
      let mut seen = HashSet::new();
      for chunk in &asset.chunks {
        if chunk.reuse.is_some() || !seen.insert(chunk.id.as_str()) {
          continue;
        }
        let Some(download) = download_index.get(&plan, chunk.id.as_str()) else {
          persist_install_stream_error(
            &task_root,
            &app_handle,
            &journal,
            format!("资源 chunk 缺少下载计划：{}", chunk.id),
            false,
            false,
          )
          .await;
          return;
        };
        if !cached_chunk_matches(&shared_cache_root, download)
          && !cached_chunk_matches(&spool_root, download)
        {
          pending.push(download.clone());
        }
      }
      if let Err(error) = check_install_stream_space(&plan, asset_index, &pending, &spool_root) {
        persist_install_stream_error(&task_root, &app_handle, &journal, error, false, false).await;
        return;
      }
      {
        let mut value = journal.lock().await;
        value.state = PackageTaskState::Downloading;
        value.download_current_file = Some(format!("资源文件：{}", asset.name));
        value.assembly_current_file = None;
        value.touch();
        if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
          persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
          return;
        }
        emit_state(&app_handle, &value.summary());
      }
      let tasks = stream::iter(pending.into_iter().map(|download| {
        let root = spool_root.clone();
        let task_id = plan.plan_id.clone();
        let canceled = Arc::clone(&canceled);
        let paused = Arc::clone(&paused);
        let limiter = Arc::clone(&limiter);
        let metrics = Arc::clone(&metrics);
        let client = download_client.clone();
        async move {
          let started_at = metrics.begin_download();
          let result = download_object(
            &client,
            &root,
            &download,
            DownloadControl::new(
              &task_id,
              &canceled,
              &paused,
              &limiter,
              DownloadDurability::Recoverable,
            )
            .with_telemetry(Arc::clone(&metrics.download_telemetry)),
          )
          .await;
          metrics.finish_download(started_at);
          result
        }
      }))
      .buffer_unordered(concurrency);
      futures_util::pin_mut!(tasks);
      while let Some(result) = tasks.next().await {
        match result {
          Ok(downloaded) => {
            metrics.record_unique_download(downloaded.bytes);
            let mut value = journal.lock().await;
            value.downloaded_bytes = value.downloaded_bytes.saturating_add(downloaded.bytes);
            value.spool_bytes = spool_bytes(&spool_root);
            metrics.observe_spool(value.spool_bytes);
            value.touch();
            if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
              persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
              return;
            }
            emit_progress(&app_handle, &value.summary());
          }
          Err(error) => {
            let paused_flag = paused.load(Ordering::Acquire);
            let canceled_flag = canceled.load(Ordering::Acquire);
            if canceled_flag {
              let _ = installer::cancel_draft(&task_root, &context.draft_id);
            }
            persist_install_stream_error(
              &task_root,
              &app_handle,
              &journal,
              error,
              paused_flag,
              canceled_flag,
            )
            .await;
            return;
          }
        }
      }
      {
        let mut value = journal.lock().await;
        value.download_current_file = None;
        value.assembly_current_file =
          Some(format!("组装资源 {}/{}：{}", asset_index + 1, plan.assets.len(), asset.name));
        value.touch();
        if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
          persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
          return;
        }
        emit_progress(&app_handle, &value.summary());
      }
      let assemble_plan = Arc::clone(&plan);
      let assemble_download_index = Arc::clone(&download_index);
      let assemble_staging = staging_root.clone();
      let assemble_shared = shared_cache_root.clone();
      let assemble_spool = spool_root.clone();
      let assemble_canceled = Arc::clone(&canceled);
      let assembly_started_at = metrics.begin_assembly();
      let assembly_worker_result = tauri::async_runtime::spawn_blocking(move || {
        let mut timing = assembler::AssemblyTiming::default();
        let result = assembler::assemble_full_install_asset_with_timing_observer(
          &assemble_plan,
          &assemble_download_index,
          asset_index,
          &assemble_staging,
          &assemble_shared,
          &assemble_spool,
          &assemble_canceled,
          &mut timing,
        );
        (result, timing)
      })
      .await;
      metrics.finish_assembly(assembly_started_at);
      let assembly_result = match assembly_worker_result {
        Ok((result, timing)) => {
          metrics.record_assembly_detail(&timing);
          result.and_then(|()| {
            super::evidence::capture_and_persist_asset_evidence(
              &task_root,
              &plan,
              asset_index,
              &staging_root,
            )
            .map(|_| ())
          })
        }
        Err(error) => Err(format!("组装 worker 异常退出：{error}")),
      };
      if let Err(error) = assembly_result {
        let paused_flag = paused.load(Ordering::Acquire);
        let canceled_flag = canceled.load(Ordering::Acquire);
        if canceled_flag {
          let _ = installer::cancel_draft(&task_root, &context.draft_id);
        }
        persist_install_stream_error(
          &task_root,
          &app_handle,
          &journal,
          error,
          paused_flag,
          canceled_flag,
        )
        .await;
        return;
      }
      let mut value = journal.lock().await;
      let completed = asset_index + 1;
      let completed_bytes = plan.assets[..completed].iter().map(|item| item.size).sum();
      value.completed_asset_cursor = completed;
      value.assembly_completed_count = completed;
      value.assembly_completed_bytes = completed_bytes;
      value.assembly_completed_bytes_total = completed_bytes;
      metrics.observe_logical_staging(completed_bytes);
      value.spool_bytes = spool_bytes(&spool_root);
      value.committed_step =
        completed_download_count(&plan, completed, &shared_cache_root, &spool_root);
      value.download_current_file = None;
      value.assembly_current_file = None;
      value.touch();
      if let Err(error) = persist_install_checkpoint(&task_root, &value, &metrics) {
        persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
        return;
      }
      let released = release_install_spool(&plan, completed, &spool_root);
      value.released_bytes = value.released_bytes.saturating_add(released);
      value.spool_bytes = spool_bytes(&spool_root);
      metrics.observe_spool(value.spool_bytes);
      value.touch();
      if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
        persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
        return;
      }
      emit_progress(&app_handle, &value.summary());
    }
  }
  if paused.load(Ordering::Acquire) {
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Paused;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.touch();
    let _ = journal::persist(&task_root, &value);
    let _ = journal::forget_progress(&task_root, &value.task_id);
    emit_state(&app_handle, &value.summary());
    return;
  }
  if canceled.load(Ordering::Acquire) {
    let _ = installer::cancel_draft(&task_root, &context.draft_id);
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Canceled;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.touch();
    let _ = journal::persist(&task_root, &value);
    let _ = journal::forget_progress(&task_root, &value.task_id);
    emit_state(&app_handle, &value.summary());
    return;
  }
  if let Some(sdk) = plan.install_overlay.as_ref().and_then(|overlay| overlay.sdk.as_ref()) {
    let Some(download) = plan.downloads.iter().find(|download| download.cache_key == sdk.cache_key)
    else {
      persist_install_stream_error(
        &task_root,
        &app_handle,
        &journal,
        format!("安装计划缺少渠道 SDK 下载项：{}", sdk.cache_key),
        false,
        false,
      )
      .await;
      return;
    };
    if !cached_chunk_matches(&shared_cache_root, download)
      && !cached_chunk_matches(&spool_root, download)
    {
      if let Err(error) = check_install_stream_space(
        &plan,
        plan.assets.len(),
        std::slice::from_ref(download),
        &spool_root,
      ) {
        persist_install_stream_error(&task_root, &app_handle, &journal, error, false, false).await;
        return;
      }
      {
        let mut value = journal.lock().await;
        value.download_current_file = Some("渠道 SDK".to_string());
        value.touch();
        if let Err(error) = journal::persist(&task_root, &value) {
          persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
          return;
        }
        emit_progress(&app_handle, &value.summary());
      }
      if let Err(error) = download_object(
        &download_client,
        &spool_root,
        download,
        DownloadControl::new(
          &plan.plan_id,
          &canceled,
          &paused,
          &limiter,
          DownloadDurability::Recoverable,
        )
        .with_telemetry(Arc::clone(&metrics.download_telemetry)),
      )
      .await
      {
        let paused_flag = paused.load(Ordering::Acquire);
        let canceled_flag = canceled.load(Ordering::Acquire);
        if canceled_flag {
          let _ = installer::cancel_draft(&task_root, &context.draft_id);
        }
        persist_install_stream_error(
          &task_root,
          &app_handle,
          &journal,
          error,
          paused_flag,
          canceled_flag,
        )
        .await;
        return;
      }
      let mut value = journal.lock().await;
      value.downloaded_bytes =
        value.downloaded_bytes.saturating_add(download.compressed_size).min(value.total_bytes);
      value.download_current_file = None;
      value.spool_bytes = spool_bytes(&spool_root);
      value.touch();
      if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
        persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
        return;
      }
      emit_progress(&app_handle, &value.summary());
    }
  }
  {
    let mut value = journal.lock().await;
    value.state = PackageTaskState::ReadyToApply;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.spool_bytes = spool_bytes(&spool_root);
    value.touch();
    if let Err(error) = persist_install_checkpoint(&task_root, &value, &metrics) {
      persist_terminal_journal(&task_root, &mut value, error, false, &app_handle);
      return;
    }
    emit_state(&app_handle, &value.summary());
  }
  run_install_task(app_handle, task_root, plan, journal, canceled, context, Some(metrics)).await;
}

struct InstallAssetJob {
  asset_index: usize,
  pending: Vec<PlanDownload>,
  scheduled_download_ids: Vec<String>,
  reserved_bytes: u64,
}

struct InstallAssetJobCompletion {
  asset_index: usize,
  reserved_bytes: u64,
  result: Result<(), String>,
}

async fn run_install_bounded_asset_pipeline(
  app_handle: &AppHandle,
  task_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  plan: &Arc<PersistedPlan>,
  download_index: &Arc<assembler::FullInstallDownloadIndex>,
  metrics: &Arc<InstallPipelineMetrics>,
  download_client: &reqwest::Client,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  concurrency: usize,
  limiter: &Arc<RateLimiter>,
  staging_root: &Path,
) -> Result<(), String> {
  let download_slots = Arc::new(Semaphore::new(concurrency.max(1)));
  let assembly_slots = Arc::new(Semaphore::new(concurrency.max(1)));
  let mut asset_cursor = {
    let mut value = journal.lock().await;
    let cursor = value.completed_asset_cursor.min(plan.assets.len());
    let completed_bytes = plan.assets[..cursor].iter().map(|asset| asset.size).sum();
    value.assembly_completed_count = cursor;
    value.assembly_completed_bytes = completed_bytes;
    value.assembly_completed_bytes_total = completed_bytes;
    metrics.observe_logical_staging(completed_bytes);
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.touch();
    persist_install_checkpoint(task_root, &value, metrics)?;
    emit_progress(app_handle, &value.summary());
    cursor
  };
  let cache_complete = journal.lock().await.committed_step >= plan.downloads.len();
  let spool_budget = install_spool_window(plan, concurrency, cache_complete);
  let max_in_flight = concurrency.max(1).saturating_mul(2);
  let mut next_asset_index = asset_cursor;
  let mut reserved_spool_bytes = 0_u64;
  let mut scheduled_downloads = HashSet::<String>::new();
  let download_guards = Arc::new(AsyncMutex::new(HashMap::<String, Arc<AsyncMutex<()>>>::new()));
  let mut completed_assets = HashSet::<usize>::new();
  let mut jobs = futures_util::stream::FuturesUnordered::new();
  let mut first_error = None;

  loop {
    let mut scheduled_count = 0_usize;
    while first_error.is_none()
      && !canceled.load(Ordering::Acquire)
      && !paused.load(Ordering::Acquire)
      && next_asset_index < plan.assets.len()
      && jobs.len() < max_in_flight
    {
      let job = prepare_install_asset_job(
        plan,
        download_index,
        next_asset_index,
        shared_cache_root,
        spool_root,
        &scheduled_downloads,
        metrics,
      )?;
      let projected_spool = spool_bytes(spool_root)
        .saturating_add(reserved_spool_bytes)
        .saturating_add(job.reserved_bytes);
      if projected_spool > spool_budget && !jobs.is_empty() {
        break;
      }
      check_install_stream_space(plan, asset_cursor, &job.pending, spool_root)?;
      for download_id in &job.scheduled_download_ids {
        scheduled_downloads.insert(download_id.clone());
      }
      reserved_spool_bytes = reserved_spool_bytes.saturating_add(job.reserved_bytes);
      next_asset_index = next_asset_index.saturating_add(1);
      scheduled_count = scheduled_count.saturating_add(1);
      jobs.push(run_install_asset_job(
        job,
        app_handle.clone(),
        task_root.to_path_buf(),
        shared_cache_root.to_path_buf(),
        spool_root.to_path_buf(),
        Arc::clone(plan),
        Arc::clone(download_index),
        Arc::clone(metrics),
        download_client.clone(),
        Arc::clone(journal),
        Arc::clone(canceled),
        Arc::clone(paused),
        Arc::clone(limiter),
        Arc::clone(&download_slots),
        Arc::clone(&download_guards),
        Arc::clone(&assembly_slots),
        staging_root.to_path_buf(),
        concurrency,
      ));
    }
    if scheduled_count > 0 {
      metrics.queue_refill_count.fetch_add(1, Ordering::Relaxed);
      let mut value = journal.lock().await;
      value.state = PackageTaskState::Downloading;
      value.download_current_file =
        Some(format!("持续队列已调度 {}/{} 个资源", next_asset_index, plan.assets.len()));
      value.touch();
      persist_install_progress(task_root, &value, metrics)?;
      emit_state(app_handle, &value.summary());
    }

    let Some(completion) = jobs.next().await else {
      break;
    };
    reserved_spool_bytes = reserved_spool_bytes.saturating_sub(completion.reserved_bytes);
    match completion.result {
      Ok(()) => {
        completed_assets.insert(completion.asset_index);
        let mut value = journal.lock().await;
        value.assembly_completed_count =
          value.assembly_completed_count.saturating_add(1).min(value.assembly_total_count);
        value.assembly_completed_bytes = value
          .assembly_completed_bytes
          .saturating_add(plan.assets[completion.asset_index].size)
          .min(value.assembly_total_bytes);
        let previous_cursor = asset_cursor;
        while asset_cursor < plan.assets.len() && completed_assets.remove(&asset_cursor) {
          asset_cursor = asset_cursor.saturating_add(1);
        }
        value.assembly_current_file = (value.assembly_completed_count < value.assembly_total_count)
          .then_some(format!(
            "已组装 {}/{}，持续队列继续补充资源",
            value.assembly_completed_count, value.assembly_total_count
          ));
        value.spool_bytes = spool_bytes(spool_root);
        metrics.observe_spool(value.spool_bytes);
        value.touch();
        if asset_cursor > previous_cursor {
          let completed_bytes = plan.assets[..asset_cursor]
            .iter()
            .fold(0_u64, |total, asset| total.saturating_add(asset.size));
          value.completed_asset_cursor = asset_cursor;
          value.assembly_completed_bytes_total = completed_bytes;
          metrics.observe_logical_staging(completed_bytes);
          value.committed_step =
            completed_download_count(plan, asset_cursor, shared_cache_root, spool_root);
          persist_install_checkpoint(task_root, &value, metrics)?;
          let released = release_install_spool(plan, asset_cursor, spool_root);
          value.released_bytes = value.released_bytes.saturating_add(released);
          value.spool_bytes = spool_bytes(spool_root);
          metrics.observe_spool(value.spool_bytes);
          value.touch();
        }
        persist_install_progress(task_root, &value, metrics)?;
        emit_progress(app_handle, &value.summary());
      }
      Err(error) => {
        first_error.get_or_insert(error);
      }
    }
  }
  if let Some(error) = first_error { Err(error) } else { Ok(()) }
}

fn prepare_install_asset_job(
  plan: &PersistedPlan,
  download_index: &assembler::FullInstallDownloadIndex,
  asset_index: usize,
  shared_cache_root: &Path,
  spool_root: &Path,
  scheduled_downloads: &HashSet<String>,
  metrics: &InstallPipelineMetrics,
) -> Result<InstallAssetJob, String> {
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let mut pending = Vec::new();
  let mut scheduled_download_ids = Vec::new();
  let mut reserved_bytes = 0_u64;
  let mut seen = HashSet::new();
  for chunk in &asset.chunks {
    if chunk.reuse.is_some() || !seen.insert(chunk.id.as_str()) {
      continue;
    }
    let download = download_index
      .get(plan, chunk.id.as_str())
      .ok_or_else(|| format!("资源 chunk 缺少下载计划：{}", chunk.id))?;
    if cached_chunk_matches(shared_cache_root, download)
      || cached_chunk_matches(spool_root, download)
    {
      continue;
    }
    if !scheduled_downloads.contains(&download.id) {
      reserved_bytes = reserved_bytes.saturating_add(download.compressed_size);
      scheduled_download_ids.push(download.id.clone());
    } else {
      metrics.record_duplicate_wait(download.compressed_size);
    }
    pending.push(download.clone());
  }
  Ok(InstallAssetJob { asset_index, pending, scheduled_download_ids, reserved_bytes })
}

#[allow(clippy::too_many_arguments)]
async fn run_install_asset_job(
  job: InstallAssetJob,
  app_handle: AppHandle,
  task_root: PathBuf,
  shared_cache_root: PathBuf,
  spool_root: PathBuf,
  plan: Arc<PersistedPlan>,
  download_index: Arc<assembler::FullInstallDownloadIndex>,
  metrics: Arc<InstallPipelineMetrics>,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  limiter: Arc<RateLimiter>,
  download_slots: Arc<Semaphore>,
  download_guards: Arc<AsyncMutex<HashMap<String, Arc<AsyncMutex<()>>>>>,
  assembly_slots: Arc<Semaphore>,
  staging_root: PathBuf,
  concurrency: usize,
) -> InstallAssetJobCompletion {
  let InstallAssetJob { asset_index, pending, reserved_bytes, .. } = job;
  let result = async {
    let downloads = stream::iter(pending.into_iter().map(|download| {
      let client = download_client.clone();
      let root = spool_root.clone();
      let shared_root = shared_cache_root.clone();
      let task_id = plan.plan_id.clone();
      let canceled = Arc::clone(&canceled);
      let paused = Arc::clone(&paused);
      let limiter = Arc::clone(&limiter);
      let metrics = Arc::clone(&metrics);
      let slots = Arc::clone(&download_slots);
      let guards = Arc::clone(&download_guards);
      async move {
        let download_guard = {
          let mut values = guards.lock().await;
          Arc::clone(
            values.entry(download.id.clone()).or_insert_with(|| Arc::new(AsyncMutex::new(()))),
          )
        };
        let _download_guard = download_guard.lock().await;
        if cached_chunk_matches(&shared_root, &download) || cached_chunk_matches(&root, &download) {
          return Ok(None);
        }
        let permit =
          slots.acquire_owned().await.map_err(|error| format!("获取下载并发槽位失败：{error}"))?;
        let started_at = metrics.begin_download();
        let result = download_object(
          &client,
          &root,
          &download,
          DownloadControl::new(
            &task_id,
            &canceled,
            &paused,
            &limiter,
            DownloadDurability::Recoverable,
          )
          .with_telemetry(Arc::clone(&metrics.download_telemetry)),
        )
        .await;
        metrics.finish_download(started_at);
        drop(permit);
        result.map(|downloaded| Some(downloaded.bytes))
      }
    }))
    .buffer_unordered(concurrency.max(1));
    futures_util::pin_mut!(downloads);
    while let Some(download_result) = downloads.next().await {
      if let Some(downloaded_bytes) = download_result? {
        metrics.record_unique_download(downloaded_bytes);
        let mut value = journal.lock().await;
        value.downloaded_bytes =
          value.downloaded_bytes.saturating_add(downloaded_bytes).min(value.total_bytes);
        value.download_current_file =
          (value.downloaded_bytes < value.total_bytes).then_some("持续下载资源对象".to_string());
        value.spool_bytes = spool_bytes(&spool_root);
        metrics.observe_spool(value.spool_bytes);
        value.touch();
        persist_install_progress(&task_root, &value, &metrics)?;
        emit_progress(&app_handle, &value.summary());
      }
    }

    {
      let mut value = journal.lock().await;
      value.assembly_current_file = Some(format!(
        "等待组装 {}/{}：{}",
        asset_index + 1,
        plan.assets.len(),
        plan.assets[asset_index].name
      ));
      value.touch();
      emit_progress(&app_handle, &value.summary());
    }
    let assembly_permit = assembly_slots
      .acquire_owned()
      .await
      .map_err(|error| format!("获取组装并发槽位失败：{error}"))?;
    let assemble_plan = Arc::clone(&plan);
    let assemble_download_index = Arc::clone(&download_index);
    let assemble_staging = staging_root.clone();
    let assemble_shared = shared_cache_root.clone();
    let assemble_spool = spool_root.clone();
    let assemble_canceled = Arc::clone(&canceled);
    let assembly_started_at = metrics.begin_assembly();
    let worker_result = tauri::async_runtime::spawn_blocking(move || {
      let mut timing = assembler::AssemblyTiming::default();
      let result = assembler::assemble_full_install_asset_with_timing_observer(
        &assemble_plan,
        &assemble_download_index,
        asset_index,
        &assemble_staging,
        &assemble_shared,
        &assemble_spool,
        &assemble_canceled,
        &mut timing,
      );
      (result, timing)
    })
    .await;
    metrics.finish_assembly(assembly_started_at);
    drop(assembly_permit);
    match worker_result {
      Ok((result, timing)) => {
        metrics.record_assembly_detail(&timing);
        result.and_then(|()| {
          super::evidence::capture_and_persist_asset_evidence(
            &task_root,
            &plan,
            asset_index,
            &staging_root,
          )
          .map(|_| ())
        })
      }
      Err(error) => Err(format!("组装 worker 异常退出：{error}")),
    }
  }
  .await;
  InstallAssetJobCompletion { asset_index, reserved_bytes, result }
}

#[allow(dead_code)]
async fn run_install_streaming_asset_pipeline(
  app_handle: &AppHandle,
  task_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  plan: &Arc<PersistedPlan>,
  download_index: &Arc<assembler::FullInstallDownloadIndex>,
  download_client: &reqwest::Client,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  concurrency: usize,
  limiter: &Arc<RateLimiter>,
  staging_root: &Path,
) -> Result<(), String> {
  let mut asset_cursor = journal.lock().await.completed_asset_cursor.min(plan.assets.len());
  while asset_cursor < plan.assets.len() {
    if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
      break;
    }
    let batch_end = asset_cursor.saturating_add(concurrency.max(1)).min(plan.assets.len());
    let mut pending = Vec::new();
    let mut seen = HashSet::new();
    for asset_index in asset_cursor..batch_end {
      for chunk in &plan.assets[asset_index].chunks {
        if chunk.reuse.is_some() || !seen.insert(chunk.id.as_str()) {
          continue;
        }
        let download = download_index
          .get(plan, chunk.id.as_str())
          .ok_or_else(|| format!("资源 chunk 缺少下载计划：{}", chunk.id))?;
        if !cached_chunk_matches(shared_cache_root, download)
          && !cached_chunk_matches(spool_root, download)
        {
          pending.push(download.clone());
        }
      }
    }
    check_install_stream_space(plan, asset_cursor, &pending, spool_root)?;
    {
      let mut value = journal.lock().await;
      value.state = PackageTaskState::Downloading;
      value.download_current_file = Some(format!("资源文件 {} - {}", asset_cursor + 1, batch_end));
      value.assembly_current_file = None;
      value.touch();
      journal::persist_progress(task_root, &value)?;
      emit_state(app_handle, &value.summary());
    }
    let tasks = stream::iter(pending.into_iter().map(|download| {
      let root = spool_root.to_path_buf();
      let task_id = plan.plan_id.clone();
      let canceled = Arc::clone(canceled);
      let paused = Arc::clone(paused);
      let limiter = Arc::clone(limiter);
      let client = download_client.clone();
      async move {
        download_object(
          &client,
          &root,
          &download,
          DownloadControl::new(
            &task_id,
            &canceled,
            &paused,
            &limiter,
            DownloadDurability::Recoverable,
          ),
        )
        .await
      }
    }))
    .buffer_unordered(concurrency.max(1));
    futures_util::pin_mut!(tasks);
    while let Some(result) = tasks.next().await {
      let downloaded = result?;
      let mut value = journal.lock().await;
      value.downloaded_bytes = value.downloaded_bytes.saturating_add(downloaded.bytes);
      value.spool_bytes = spool_bytes(spool_root);
      value.touch();
      journal::persist_progress(task_root, &value)?;
      emit_progress(app_handle, &value.summary());
    }

    let assembly_tasks = stream::iter(asset_cursor..batch_end)
      .map(|asset_index| {
        let assemble_plan = Arc::clone(plan);
        let assemble_download_index = Arc::clone(download_index);
        let assemble_staging = staging_root.to_path_buf();
        let assemble_shared = shared_cache_root.to_path_buf();
        let assemble_spool = spool_root.to_path_buf();
        let assemble_canceled = Arc::clone(canceled);
        async move {
          tauri::async_runtime::spawn_blocking(move || {
            assembler::assemble_full_install_asset(
              &assemble_plan,
              &assemble_download_index,
              asset_index,
              &assemble_staging,
              &assemble_shared,
              &assemble_spool,
              &assemble_canceled,
            )
          })
          .await
          .map_err(|error| format!("组装 worker 异常退出：{error}"))
          .and_then(|result| result)
        }
      })
      .buffer_unordered(concurrency.max(1));
    futures_util::pin_mut!(assembly_tasks);
    while let Some(result) = assembly_tasks.next().await {
      result?;
    }

    let completed = batch_end;
    let completed_bytes = plan.assets[..completed].iter().map(|asset| asset.size).sum();
    let mut value = journal.lock().await;
    value.completed_asset_cursor = completed;
    value.assembly_completed_count = completed;
    value.assembly_completed_bytes = completed_bytes;
    value.assembly_completed_bytes_total = completed_bytes;
    value.spool_bytes = spool_bytes(spool_root);
    value.committed_step = completed_download_count(plan, completed, shared_cache_root, spool_root);
    value.download_current_file = None;
    value.assembly_current_file = Some(format!(
      "已组装 {}/{}，最近完成：{}",
      value.assembly_completed_count,
      value.assembly_total_count,
      plan.assets[completed - 1].name
    ));
    value.touch();
    journal::persist(task_root, &value)?;
    let released = release_install_spool(plan, completed, spool_root);
    value.released_bytes = value.released_bytes.saturating_add(released);
    value.spool_bytes = spool_bytes(spool_root);
    value.touch();
    journal::persist_progress(task_root, &value)?;
    emit_progress(app_handle, &value.summary());
    asset_cursor = completed;
  }
  Ok(())
}

async fn persist_install_stream_error(
  task_root: &Path,
  app_handle: &AppHandle,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  error: String,
  paused_requested: bool,
  canceled_requested: bool,
) {
  let mut value = journal.lock().await;
  let _ = journal::flush_progress(task_root, &value);
  value.state = if paused_requested {
    PackageTaskState::Paused
  } else if canceled_requested {
    PackageTaskState::Canceled
  } else {
    PackageTaskState::Failed
  };
  value.error_message = (!paused_requested && !canceled_requested).then_some(error);
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.current_file = None;
  value.touch();
  let _ = journal::persist(task_root, &value);
  let _ = journal::forget_progress(task_root, &value.task_id);
  emit_state(app_handle, &value.summary());
}

fn release_install_spool(plan: &PersistedPlan, completed: usize, spool_root: &Path) -> u64 {
  let retained = plan
    .assets
    .iter()
    .skip(completed)
    .flat_map(|asset| asset.chunks.iter())
    .filter(|chunk| chunk.reuse.is_none())
    .map(|chunk| chunk.id.as_str())
    .collect::<HashSet<_>>();
  plan
    .downloads
    .iter()
    .filter(|download| {
      !retained.contains(download.id.as_str())
        && plan
          .install_overlay
          .as_ref()
          .and_then(|overlay| overlay.sdk.as_ref())
          .is_none_or(|sdk| sdk.cache_key != download.cache_key)
    })
    .filter_map(|download| {
      let path = spool_root.join(&download.cache_key);
      let metadata = fs::symlink_metadata(&path).ok()?;
      if metadata.file_type().is_symlink() || !metadata.is_file() {
        return None;
      }
      let bytes = metadata.len();
      fs::remove_file(path).ok()?;
      Some(bytes)
    })
    .sum()
}

fn completed_download_count(
  plan: &PersistedPlan,
  completed: usize,
  shared_cache_root: &Path,
  spool_root: &Path,
) -> usize {
  let consumed = plan
    .assets
    .iter()
    .take(completed)
    .flat_map(|asset| asset.chunks.iter())
    .filter(|chunk| chunk.reuse.is_none())
    .map(|chunk| chunk.id.as_str())
    .collect::<HashSet<_>>();
  plan
    .downloads
    .iter()
    .filter(|download| {
      consumed.contains(download.id.as_str())
        || cached_chunk_matches(shared_cache_root, download)
        || cached_chunk_matches(spool_root, download)
    })
    .count()
}

async fn continue_repair(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
) -> Result<(), String> {
  let files = {
    let journal_value = journal.lock().await;
    let can_continue = journal_value.repair.is_some()
      && matches!(
        journal_value.state,
        PackageTaskState::RepairRequired
          | PackageTaskState::Assembling
          | PackageTaskState::Committing
          | PackageTaskState::Verifying
          | PackageTaskState::RollingBack
      );
    if !can_continue {
      return Ok(());
    }
    journal_value.repair.as_ref().ok_or_else(|| "资源任务缺少修复清单".to_string())?.files.clone()
  };
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::Assembling;
    journal_value.current_file = Some("准备修复资源".to_string());
    journal_value.error_message = None;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
    emit_state(&app_handle, &journal_value.summary());
  }
  let result = run_repair(
    app_handle.clone(),
    task_root.clone(),
    game_root,
    installation,
    plan,
    journal.clone(),
    canceled,
    files,
  )
  .await;
  if let Err(error) = &result {
    let mut journal_value = journal.lock().await;
    let incomplete_repair =
      journal_value.repair.as_ref().is_some_and(|repair| repair.apply.is_some());
    if journal_value.state != PackageTaskState::Completed
      && journal_value.state != PackageTaskState::RecoveryRequired
      && !incomplete_repair
    {
      journal_value.state = PackageTaskState::RepairRequired;
      journal_value.error_message = Some(error.clone());
      journal_value.current_file = None;
      journal_value.touch();
      if journal::persist(&task_root, &journal_value).is_ok() {
        emit_state(&app_handle, &journal_value.summary());
      }
    }
  }
  result
}

async fn run_repair(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  files: Vec<super::planner::PlanFile>,
) -> Result<(), String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let repair_plan =
    hydrate_and_validate_repair_plan(&installation, &branches, plan.clone(), &files).await?;
  {
    let mut journal_value = journal.lock().await;
    if journal_value.repair.as_ref().is_some_and(|repair| repair.apply.is_some()) {
      committer::revert_incomplete_repair(
        &repair_plan,
        &game_root,
        &task_root,
        &mut journal_value,
      )?;
      emit_state(&app_handle, &journal_value.summary());
    }
    journal_value.state = PackageTaskState::RepairRequired;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
  }
  let cache_root = prepare_cache_root(&task_root)?;
  let pending = repair_plan
    .downloads
    .iter()
    .filter(|download| !cached_chunk_matches(&cache_root, download))
    .cloned()
    .collect::<Vec<_>>();
  if !pending.is_empty() {
    {
      let mut journal_value = journal.lock().await;
      journal_value.state = PackageTaskState::Assembling;
      journal_value.current_file = Some("下载修复资源".to_string());
      journal_value.touch();
      journal::persist(&task_root, &journal_value)?;
      emit_state(&app_handle, &journal_value.summary());
    }
    let limiter = Arc::new(RateLimiter::new(None));
    let paused = Arc::new(AtomicBool::new(false));
    let downloads = stream::iter(pending.into_iter().map(|download| {
      let cache_root = cache_root.clone();
      let task_id = repair_plan.plan_id.clone();
      let canceled = Arc::clone(&canceled);
      let paused = Arc::clone(&paused);
      let limiter = Arc::clone(&limiter);
      let client = client.clone();
      async move {
        download_object(
          &client,
          &cache_root,
          &download,
          DownloadControl::new(&task_id, &canceled, &paused, &limiter, DownloadDurability::Strict),
        )
        .await
      }
    }))
    .buffer_unordered(default_concurrency());
    futures_util::pin_mut!(downloads);
    while let Some(result) = downloads.next().await {
      result?;
      if canceled.load(Ordering::Acquire) {
        return Err("应用更新已取消".to_string());
      }
    }
    flush_cache_validation_index(&cache_root);
  }
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::RepairRequired;
    journal_value.current_file = None;
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
  }
  let repair_handle = app_handle.clone();
  let repair_snapshot = Arc::clone(&journal);
  tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = repair_snapshot.blocking_lock().clone();
    let emit = |journal: &TaskJournal| {
      *repair_snapshot.blocking_lock() = journal.clone();
      let summary = journal.summary();
      emit_state(&repair_handle, &summary);
      emit_progress(&repair_handle, &summary);
    };
    committer::execute_repair(
      &plan,
      &repair_plan,
      &game_root,
      &task_root,
      &mut journal_value,
      &canceled,
      emit,
    )
  })
  .await
  .map_err(|error| format!("修复资源任务异常退出：{error}"))?
}

async fn run_switch(
  app_handle: AppHandle,
  task_root: PathBuf,
  installation: GameInstallation,
  plan: PersistedSwitchPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
) {
  let fail = |journal: &Arc<AsyncMutex<TaskJournal>>, error: String, canceled_flag: bool| {
    if let Ok(mut journal_value) = journal.try_lock() {
      persist_terminal_journal(&task_root, &mut journal_value, error, canceled_flag, &app_handle);
    }
  };
  let client = match create_http_client() {
    Ok(client) => client,
    Err(error) => {
      fail(&journal, error, false);
      return;
    }
  };
  {
    let mut journal_value = journal.lock().await;
    journal_value.state = PackageTaskState::Downloading;
    journal_value.current_file = Some("下载渠道 SDK".to_string());
    journal_value.touch();
    if let Err(error) = journal::persist(&task_root, &journal_value) {
      persist_terminal_journal(&task_root, &mut journal_value, error, false, &app_handle);
      return;
    }
    emit_state(&app_handle, &journal_value.summary());
  }
  let request = {
    let mut journal_value = journal.lock().await;
    let started_at = Instant::now();
    let mut emit_prepare_progress = |summary: &TaskJournal| -> Result<(), String> {
      journal::persist(&task_root, summary)?;
      let summary = summary.summary();
      emit_state(&app_handle, &summary);
      emit_progress(&app_handle, &summary);
      Ok(())
    };
    match switch::prepare_switch_commit(
      &client,
      &installation,
      &plan,
      &task_root,
      &mut journal_value,
      &canceled,
      started_at,
      &mut emit_prepare_progress,
    )
    .await
    {
      Ok(request) => {
        journal_value.state = PackageTaskState::ReadyToApply;
        journal_value.current_file = Some("渠道文件已就绪".to_string());
        journal_value.download_current_file = None;
        journal_value.assembly_current_file = None;
        journal_value.bytes_per_second = 0;
        journal_value.eta_seconds = None;
        journal_value.touch();
        if let Err(error) = journal::persist(&task_root, &journal_value) {
          persist_terminal_journal(&task_root, &mut journal_value, error, false, &app_handle);
          return;
        }
        emit_state(&app_handle, &journal_value.summary());
        request
      }
      Err(error) => {
        let canceled_flag = canceled.load(Ordering::Acquire) || error.contains("已取消");
        cleanup_task_partials(&task_root.join("cache/sdks"), plan.plan_id()).ok();
        journal_value.state =
          if canceled_flag { PackageTaskState::Canceled } else { PackageTaskState::Failed };
        journal_value.error_message = (!canceled_flag).then_some(error);
        journal_value.current_file = None;
        journal_value.download_current_file = None;
        journal_value.assembly_current_file = None;
        journal_value.bytes_per_second = 0;
        journal_value.eta_seconds = None;
        journal_value.touch();
        let _ = journal::persist(&task_root, &journal_value);
        emit_state(&app_handle, &journal_value.summary());
        return;
      }
    }
  };
  let game_root = PathBuf::from(&installation.root_path);
  let apply_journal = Arc::clone(&journal);
  let apply_handle = app_handle.clone();
  let apply_task_root = task_root.clone();
  let apply_canceled = Arc::clone(&canceled);
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = apply_journal.blocking_lock().clone();
    let emit = |journal: &TaskJournal| {
      *apply_journal.blocking_lock() = journal.clone();
      let summary = journal.summary();
      emit_state(&apply_handle, &summary);
      emit_progress(&apply_handle, &summary);
    };
    committer::execute_switch(
      &request,
      &game_root,
      &apply_task_root,
      &mut journal_value,
      &apply_canceled,
      emit,
    )
  })
  .await;
  match result {
    Ok(Ok(())) => {}
    Ok(Err(error)) => log::warn!("[game-package] 换服失败：{error}"),
    Err(error) => log::error!("[game-package] 换服任务异常退出：{error}"),
  }
}

fn finish_task(active: &Mutex<ActiveTasks>, task_id: &str) {
  let Ok(mut active) = active.lock() else {
    return;
  };
  if let Some(task) = active.by_task.remove(task_id) {
    active.by_installation.remove(&task.installation_id);
  }
}

async fn run_task(
  app_handle: AppHandle,
  task_root: &Path,
  cache_root: &Path,
  spool_root: Option<PathBuf>,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  install_context: Option<InstallContext>,
) {
  {
    let mut journal_value = journal.lock().await;
    if paused.load(Ordering::Acquire) {
      journal_value.state = PackageTaskState::Paused;
      journal_value.error_message = None;
      journal_value.touch();
      if let Err(error) = journal::persist(task_root, &journal_value) {
        persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
        return;
      }
      emit_state(&app_handle, &journal_value.summary());
      return;
    }
    journal_value.state = PackageTaskState::Downloading;
    journal_value.download_current_file = None;
    journal_value.assembly_current_file = None;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
      return;
    }
    emit_state(&app_handle, &journal_value.summary());
  }
  let limiter = Arc::new(RateLimiter::new(max_bytes_per_second));
  let download_root = spool_root.as_deref().unwrap_or(cache_root);
  let pending = plan
    .downloads
    .iter()
    .filter(|download| {
      !cached_chunk_matches(cache_root, download)
        && spool_root.as_ref().is_none_or(|root| !cached_chunk_matches(root, download))
    })
    .cloned()
    .collect::<Vec<_>>();
  let download_labels = build_download_labels(&plan);
  let started_at = Instant::now();
  let mut last_emit = Instant::now() - Duration::from_secs(1);
  let mut last_persist = Instant::now();
  let mut fatal_error = None;
  let mut completed_cache_keys = {
    let journal_value = journal.lock().await;
    journal_value.owned_cache_files.iter().cloned().collect::<HashSet<_>>()
  };
  let downloads = stream::iter(pending.into_iter().map(|download| {
    let cache_root = download_root.to_path_buf();
    let task_id = plan.plan_id.clone();
    let current_file = download_labels
      .get(&download.cache_key)
      .cloned()
      .unwrap_or_else(|| format!("资源对象：{}", download.id));
    let canceled = Arc::clone(&canceled);
    let paused = Arc::clone(&paused);
    let limiter = Arc::clone(&limiter);
    let client = download_client.clone();
    async move {
      let result = download_object(
        &client,
        &cache_root,
        &download,
        DownloadControl::new(&task_id, &canceled, &paused, &limiter, DownloadDurability::Strict),
      )
      .await;
      (current_file, result)
    }
  }))
  .buffer_unordered(concurrency);
  futures_util::pin_mut!(downloads);
  while let Some((current_file, result)) = downloads.next().await {
    match result {
      Ok(downloaded) => {
        let mut journal_value = journal.lock().await;
        if completed_cache_keys.insert(downloaded.cache_key.clone()) {
          journal_value.owned_cache_files.push(downloaded.cache_key);
          journal_value.committed_step = journal_value.owned_cache_files.len();
          journal_value.downloaded_bytes =
            journal_value.downloaded_bytes.saturating_add(downloaded.bytes);
        }
        journal_value.current_file = Some(current_file.clone());
        journal_value.download_current_file = Some(current_file);
        let elapsed = started_at.elapsed().as_secs_f64().max(0.001);
        journal_value.bytes_per_second = (journal_value.downloaded_bytes as f64 / elapsed) as u64;
        let remaining = journal_value.total_bytes.saturating_sub(journal_value.downloaded_bytes);
        journal_value.eta_seconds = (journal_value.bytes_per_second > 0)
          .then_some(remaining / journal_value.bytes_per_second);
        journal_value.touch();
        if last_persist.elapsed() >= Duration::from_secs(1) {
          if let Err(error) = journal::persist(task_root, &journal_value) {
            fatal_error = Some(error);
            canceled.store(true, Ordering::Release);
          }
          last_persist = Instant::now();
        }
        if last_emit.elapsed() >= Duration::from_millis(250) {
          emit_progress(&app_handle, &journal_value.summary());
          last_emit = Instant::now();
        }
      }
      Err(error) => {
        if !canceled.load(Ordering::Acquire) && !paused.load(Ordering::Acquire) {
          fatal_error = Some(error);
          canceled.store(true, Ordering::Release);
        }
      }
    }
  }

  drop(downloads);

  let mut journal_value = journal.lock().await;
  if let Some(spool_root) = spool_root.as_deref() {
    rebuild_completed_cache_with_fallback(&mut journal_value, &plan, cache_root, spool_root);
  } else {
    rebuild_completed_cache(&mut journal_value, &plan, download_root);
  }
  flush_cache_validation_index(cache_root);
  if let Some(spool_root) = spool_root.as_ref() {
    flush_cache_validation_index(spool_root);
  }
  journal_value.current_file = None;
  journal_value.download_current_file = None;
  journal_value.assembly_current_file = None;
  journal_value.bytes_per_second = 0;
  journal_value.eta_seconds = None;
  if paused.load(Ordering::Acquire) {
    journal_value.state = PackageTaskState::Paused;
    journal_value.error_message = None;
  } else if let Some(error) = fatal_error {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some(error);
  } else if canceled.load(Ordering::Acquire) {
    let draft_canceled = install_context
      .as_ref()
      .is_none_or(|context| installer::cancel_draft(task_root, &context.draft_id).is_ok());
    if draft_canceled {
      journal_value.state = PackageTaskState::Canceled;
      journal_value.error_message = None;
    } else {
      journal_value.state = PackageTaskState::RecoveryRequired;
      journal_value.error_message =
        Some("取消时已进入安装提交边界，请通过恢复入口继续处理".to_string());
    }
  } else if journal_value.owned_cache_files.len() == plan.downloads.len() {
    journal_value.state = PackageTaskState::ReadyToApply;
    journal_value.error_message = None;
  } else {
    journal_value.state = PackageTaskState::Failed;
    journal_value.error_message = Some("下载结束后仍有资源未通过完整性校验".to_string());
  }
  journal_value.touch();
  if matches!(journal_value.state, PackageTaskState::Failed | PackageTaskState::RecoveryRequired) {
    log_install_failure(&journal_value);
  }
  if let Err(error) = journal::persist(task_root, &journal_value) {
    persist_terminal_journal(task_root, &mut journal_value, error, false, &app_handle);
    return;
  }
  emit_progress(&app_handle, &journal_value.summary());
  emit_state(&app_handle, &journal_value.summary());
  let should_install =
    install_context.is_some() && journal_value.state == PackageTaskState::ReadyToApply;
  if should_install {
    if let Some(context) = install_context.as_ref() {
      let _ = installer::set_draft_state(
        task_root,
        &context.draft_id,
        installer::InstallDraftState::ReadyToApply,
      );
    }
  }
  if matches!(journal_value.state, PackageTaskState::Canceled | PackageTaskState::Failed)
    && let Some(spool_root) = spool_root.as_deref()
  {
    let _ = fs::remove_dir_all(spool_root);
  }
  drop(journal_value);
  if should_install {
    if let Some(context) = install_context {
      run_install_task(
        app_handle,
        task_root.to_path_buf(),
        Arc::new(plan.clone()),
        journal,
        Arc::clone(&canceled),
        context,
        None,
      )
      .await;
    }
  }
}

async fn run_install_task(
  app_handle: AppHandle,
  task_root: PathBuf,
  plan: Arc<PersistedPlan>,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  context: InstallContext,
  metrics: Option<Arc<InstallPipelineMetrics>>,
) {
  let snapshot = Arc::clone(&journal);
  let handle = app_handle.clone();
  let task_root_for_blocking = task_root.clone();
  let plan_for_blocking = Arc::clone(&plan);
  let canceled_for_blocking = Arc::clone(&canceled);
  let machine_uid = context.machine_uid.clone();
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = snapshot.blocking_lock().clone();
    let mut validation_timing = installer::InstallValidationTiming::default();
    let emit = |value: &TaskJournal| {
      *snapshot.blocking_lock() = value.clone();
      let summary = value.summary();
      emit_state(&handle, &summary);
      emit_progress(&handle, &summary);
    };
    let result = installer::execute_install(
      &plan_for_blocking,
      &task_root_for_blocking,
      &machine_uid,
      &mut journal_value,
      &canceled_for_blocking,
      &emit,
      &mut validation_timing,
    );
    (result, validation_timing)
  })
  .await;
  let installation = match result {
    Ok((result, validation_timing)) => {
      if let Some(metrics) = metrics.as_ref() {
        metrics.record_validation(&validation_timing);
      }
      match result {
        Ok(installation) => installation,
        Err(error) => {
          log::error!("[game-package][install][{}] 全新安装提交失败：{error}", plan.plan_id);
          let mut value = journal.lock().await;
          if value.state != PackageTaskState::Canceled {
            value.state = if value.state.blocks_launch() {
              PackageTaskState::RecoveryRequired
            } else {
              PackageTaskState::Failed
            };
            value.error_message = Some(error);
            value.touch();
            if let Err(persist_error) =
              persist_optional_install_checkpoint(&task_root, &value, metrics.as_deref())
            {
              log::error!(
                "[game-package][install][{}] 持久化失败任务日志失败：{persist_error}",
                plan.plan_id
              );
            }
            emit_state(&app_handle, &value.summary());
          }
          return;
        }
      }
    }
    Err(error) => {
      log::error!("[game-package] 全新安装 worker 异常退出：{error}");
      let mut value = journal.lock().await;
      value.state = PackageTaskState::RecoveryRequired;
      value.error_message = Some(format!("安装 worker 异常退出：{error}"));
      value.touch();
      if let Err(persist_error) =
        persist_optional_install_checkpoint(&task_root, &value, metrics.as_deref())
      {
        log::error!(
          "[game-package][install][{}] 持久化 worker 异常日志失败：{persist_error}",
          plan.plan_id
        );
      }
      emit_state(&app_handle, &value.summary());
      return;
    }
  };
  if let Err(error) = installer::register_installation(&context.pool, &installation).await {
    log::error!("[game-package][install][{}] 登记游戏安装失败：{error}", plan.plan_id);
    let mut value = journal.lock().await;
    value.state = PackageTaskState::RecoveryRequired;
    value.error_message = Some(error);
    value.touch();
    if let Err(persist_error) =
      persist_optional_install_checkpoint(&task_root, &value, metrics.as_deref())
    {
      log::error!(
        "[game-package][install][{}] 持久化登记失败日志失败：{persist_error}",
        plan.plan_id
      );
    }
    emit_state(&app_handle, &value.summary());
    return;
  }
  let mut value = journal.lock().await;
  value.commit_completed_count = value.commit_total_count;
  value.commit_current_step = Some("安装登记完成".to_string());
  value.state = PackageTaskState::Completed;
  value.error_message = None;
  value.current_file = None;
  value.touch();
  if let Err(error) = persist_optional_install_checkpoint(&task_root, &value, metrics.as_deref()) {
    log::error!("[game-package][install][{}] 写入安装完成状态失败：{error}", plan.plan_id);
  }
  let _ = journal::forget_progress(&task_root, &value.task_id);
  if let Err(error) = installer::set_draft_state(
    &task_root,
    &context.draft_id,
    installer::InstallDraftState::Completed,
  ) {
    log::error!("[game-package][install][{}] 写入安装草稿完成状态失败：{error}", plan.plan_id);
  }
  if let Some(overlay) = plan.install_overlay.as_ref() {
    if let Err(error) = installer::cleanup_install_spool(&task_root, &context.draft_id, overlay) {
      log::warn!("[game-package][install][{}] 清理任务 spool 失败：{error}", plan.plan_id);
    }
  }
  emit_state(&app_handle, &value.summary());
}

fn rebuild_completed_cache(journal: &mut TaskJournal, plan: &PersistedPlan, cache_root: &Path) {
  let mut completed = Vec::new();
  let mut bytes = 0_u64;
  for download in &plan.downloads {
    if cached_chunk_matches(cache_root, download) {
      completed.push(download.cache_key.clone());
      bytes = bytes.saturating_add(download.compressed_size);
    }
  }
  journal.committed_step = completed.len();
  journal.owned_cache_files = completed;
  journal.downloaded_bytes = bytes;
}

fn rebuild_install_cache_state(
  journal: &mut TaskJournal,
  plan: &PersistedPlan,
  shared_cache_root: &Path,
  spool_root: &Path,
) {
  let mut shared = Vec::new();
  let mut available_bytes = 0_u64;
  for download in &plan.downloads {
    if cached_chunk_matches(shared_cache_root, download) {
      shared.push(download.cache_key.clone());
      available_bytes = available_bytes.saturating_add(download.compressed_size);
    } else if cached_chunk_matches(spool_root, download) {
      available_bytes = available_bytes.saturating_add(download.compressed_size);
    }
  }
  journal.committed_step = shared.len();
  journal.owned_cache_files = shared;
  if journal.downloaded_bytes == 0 {
    journal.downloaded_bytes = available_bytes.min(journal.total_bytes);
  }
  journal.spool_bytes = spool_bytes(spool_root);
}

fn rebuild_completed_cache_with_fallback(
  journal: &mut TaskJournal,
  plan: &PersistedPlan,
  shared_cache_root: &Path,
  spool_root: &Path,
) {
  let mut completed = Vec::new();
  let mut bytes = 0_u64;
  for download in &plan.downloads {
    if cached_chunk_matches(shared_cache_root, download)
      || cached_chunk_matches(spool_root, download)
    {
      completed.push(download.cache_key.clone());
      bytes = bytes.saturating_add(download.compressed_size);
    }
  }
  journal.committed_step = completed.len();
  journal.owned_cache_files = completed;
  journal.downloaded_bytes = bytes.min(journal.total_bytes);
  journal.spool_bytes = spool_bytes(spool_root);
}

fn check_install_stream_space<'a>(
  plan: &PersistedPlan,
  asset_index: usize,
  pending: impl IntoIterator<Item = &'a PlanDownload>,
  spool_root: &Path,
) -> Result<(), String> {
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let remaining_assets = plan.assets.iter().skip(asset_index).try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "安装空间需求溢出".to_string())
  })?;
  let pending_bytes = pending.into_iter().try_fold(0_u64, |total, download| {
    total.checked_add(download.compressed_size).ok_or_else(|| "下载空间需求溢出".to_string())
  })?;
  let current_spool = spool_bytes(spool_root);
  let sdk_bytes = if asset_index >= plan.assets.len() {
    overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size)
  } else {
    0
  };
  let required = remaining_assets
    .saturating_add(current_spool)
    .saturating_add(pending_bytes)
    .saturating_add(sdk_bytes)
    .saturating_add(SAFETY_MARGIN_BYTES);
  let parent = Path::new(&overlay.game_root).parent().unwrap_or(Path::new("."));
  let available =
    fs2::available_space(parent).map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
  if available < required {
    return Err(format!("安装磁盘空间不足：至少需要 {required} 字节，可用 {available} 字节"));
  }
  Ok(())
}

fn install_spool_window(plan: &PersistedPlan, concurrency: usize, cache_complete: bool) -> u64 {
  if cache_complete {
    return 256 * 1024 * 1024;
  }
  let mut asset_worksets = plan
    .assets
    .iter()
    .map(|asset| {
      let mut seen = HashSet::new();
      asset
        .chunks
        .iter()
        .filter(|chunk| chunk.reuse.is_none() && seen.insert(chunk.id.as_str()))
        .fold(0_u64, |total, chunk| total.saturating_add(chunk.compressed_size))
    })
    .collect::<Vec<_>>();
  asset_worksets.sort_unstable_by(|left, right| right.cmp(left));
  asset_worksets
    .into_iter()
    .take(concurrency.max(1).saturating_mul(2))
    .fold(256 * 1024 * 1024, u64::saturating_add)
}

fn spool_bytes(root: &Path) -> u64 {
  fs::read_dir(root)
    .ok()
    .into_iter()
    .flatten()
    .filter_map(Result::ok)
    .filter_map(|entry| fs::metadata(entry.path()).ok())
    .filter(|metadata| metadata.is_file())
    .map(|metadata| metadata.len())
    .sum()
}

/// 构建进度展示名称，避免直接向用户展示内部 chunk 或缓存键。
fn build_download_labels(plan: &PersistedPlan) -> HashMap<String, String> {
  let mut asset_names = HashMap::<String, String>::new();
  for asset in &plan.assets {
    for chunk in &asset.chunks {
      asset_names.entry(chunk.id.clone()).or_insert_with(|| asset.name.clone());
    }
    if let Some(patch) = &asset.patch {
      asset_names.entry(patch.id.clone()).or_insert_with(|| asset.name.clone());
    }
  }

  plan
    .downloads
    .iter()
    .map(|download| {
      let label = plan
        .install_overlay
        .as_ref()
        .and_then(|overlay| overlay.sdk.as_ref())
        .filter(|sdk| sdk.cache_key == download.cache_key)
        .map(|sdk| format!("渠道 SDK：{}", sdk.pkg_version_file_name))
        .or_else(|| asset_names.get(&download.id).map(|name| format!("游戏文件：{name}")))
        .unwrap_or_else(|| format!("资源对象：{}", download.id));
      (download.cache_key.clone(), truncate_progress_label(label))
    })
    .collect()
}

fn truncate_progress_label(value: String) -> String {
  const MAX_PROGRESS_LABEL_BYTES: usize = 256;
  if value.len() <= MAX_PROGRESS_LABEL_BYTES {
    return value;
  }
  let suffix = "…";
  let mut end = MAX_PROGRESS_LABEL_BYTES - suffix.len();
  while !value.is_char_boundary(end) {
    end -= 1;
  }
  format!("{}{}", &value[..end], suffix)
}

fn cleanup_task_partials(cache_root: &Path, task_id: &str) -> Result<(), String> {
  let entries = match fs::read_dir(cache_root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
    Err(error) => return Err(format!("读取游戏资源缓存目录失败：{error}")),
  };
  let suffix = format!(".part.{task_id}");
  for entry in entries {
    let path = entry.map_err(|error| format!("读取缓存临时文件失败：{error}"))?.path();
    if path.file_name().and_then(|name| name.to_str()).is_some_and(|name| name.ends_with(&suffix)) {
      fs::remove_file(path).map_err(|error| format!("清理任务下载临时文件失败：{error}"))?;
    }
  }
  Ok(())
}

fn persist_terminal_journal(
  task_root: &Path,
  journal: &mut TaskJournal,
  error: String,
  canceled: bool,
  app_handle: &AppHandle,
) {
  let _ = journal::flush_progress(task_root, journal);
  journal.state = if canceled { PackageTaskState::Canceled } else { PackageTaskState::Failed };
  journal.error_message = (!canceled).then_some(error);
  journal.current_file = None;
  journal.touch();
  if !canceled {
    log_install_failure(journal);
  }
  if let Err(persist_error) = journal::persist(task_root, journal) {
    log::error!("[game-package] 持久化终止任务日志失败：{persist_error}");
  }
  let _ = journal::forget_progress(task_root, &journal.task_id);
  emit_state(app_handle, &journal.summary());
}

fn log_install_failure(journal: &TaskJournal) {
  if journal.target != PackagePlanTarget::Install {
    return;
  }
  log::error!(
    "[game-package][install][{}] 安装任务失败：{}",
    journal.task_id,
    journal.error_message.as_deref().unwrap_or("未提供错误信息")
  );
}

fn emit_state(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Err(error) = app_handle.emit("game-package://state", summary) {
    log::warn!("[game-package] 发送任务状态事件失败：{error}");
  }
}

fn emit_progress(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Err(error) = app_handle.emit("game-package://progress", summary) {
    log::warn!("[game-package] 发送任务进度事件失败：{error}");
  }
}

#[cfg(target_os = "windows")]
const GAME_PROCESS_NAME: &str = "YuanShen.exe";

#[cfg(target_os = "windows")]
pub(crate) fn is_game_running() -> bool {
  yuan_shen_process_ids().map(|ids| !ids.is_empty()).unwrap_or(true)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn is_game_running() -> bool {
  false
}

/// 结束国服客户端进程；未在运行时直接成功。
pub(crate) fn stop_game() -> Result<(), String> {
  #[cfg(not(target_os = "windows"))]
  {
    Ok(())
  }
  #[cfg(target_os = "windows")]
  {
    let ids = yuan_shen_process_ids()?;
    if ids.is_empty() {
      return Ok(());
    }
    for pid in ids {
      terminate_pid(pid)?;
    }
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
      let remaining = yuan_shen_process_ids()?;
      if remaining.is_empty() {
        return Ok(());
      }
      if Instant::now() >= deadline {
        return Err("游戏未在时限内退出，请手动关闭后再换服".to_string());
      }
      std::thread::sleep(Duration::from_millis(200));
    }
  }
}

#[cfg(target_os = "windows")]
fn yuan_shen_process_ids() -> Result<Vec<u32>, String> {
  use windows_sys::Win32::{
    Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
    System::Diagnostics::ToolHelp::{
      CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
      TH32CS_SNAPPROCESS,
    },
  };
  unsafe {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if snapshot == INVALID_HANDLE_VALUE {
      return Err(format!("枚举游戏进程失败：{}", std::io::Error::last_os_error()));
    }
    let mut entry: PROCESSENTRY32W = std::mem::zeroed();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
    let mut ids = Vec::new();
    if Process32FirstW(snapshot, &mut entry) != 0 {
      loop {
        let length =
          entry.szExeFile.iter().position(|value| *value == 0).unwrap_or(entry.szExeFile.len());
        if String::from_utf16_lossy(&entry.szExeFile[..length])
          .eq_ignore_ascii_case(GAME_PROCESS_NAME)
        {
          ids.push(entry.th32ProcessID);
        }
        if Process32NextW(snapshot, &mut entry) == 0 {
          break;
        }
      }
    }
    CloseHandle(snapshot);
    Ok(ids)
  }
}

#[cfg(target_os = "windows")]
fn terminate_pid(pid: u32) -> Result<(), String> {
  use windows_sys::Win32::{
    Foundation::CloseHandle,
    System::Threading::{OpenProcess, PROCESS_TERMINATE, TerminateProcess},
  };
  if pid == 0 {
    return Ok(());
  }
  unsafe {
    let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
    if handle.is_null() {
      return Err(format!("结束游戏进程失败：{}", std::io::Error::last_os_error()));
    }
    let ok = TerminateProcess(handle, 1);
    CloseHandle(handle);
    if ok == 0 {
      return Err(format!("结束游戏进程失败：{}", std::io::Error::last_os_error()));
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{
    ActiveTask, GamePackageManager, PlanWorksetBaseline, install_spool_window, nearest_rank,
  };
  use crate::game::{
    journal::{self, TaskJournal},
    model::{PackagePlanStrategy, PackagePlanTarget, PackageTaskState, SchemeId},
    planner::{
      PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction, PlanChunk, PlanDownload,
      PlanDownloadHashKind, PlanReuse,
    },
  };
  use std::{
    fs,
    path::PathBuf,
    sync::{
      Arc,
      atomic::{AtomicBool, Ordering},
    },
  };
  use tokio::sync::Mutex as AsyncMutex;
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-package-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn switch_journal(task_id: &str) -> TaskJournal {
    TaskJournal::from_switch(
      task_id.to_string(),
      "installation".to_string(),
      SchemeId::CnOfficial,
      SchemeId::CnBilibili,
      "a".repeat(64),
      0,
      0,
    )
  }

  fn baseline_download(id: &str, compressed_size: u64) -> PlanDownload {
    PlanDownload {
      id: id.to_string(),
      cache_key: id.to_string(),
      hash_kind: PlanDownloadHashKind::Md5,
      expected_hash: "0".repeat(32),
      compressed_size,
      decompressed_size: compressed_size,
      encoding: PayloadEncoding::Raw,
      url_prefix: String::new(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    }
  }

  fn baseline_chunk(id: &str, compressed_size: u64, reused: bool) -> PlanChunk {
    PlanChunk {
      id: id.to_string(),
      decompressed_md5: "0".repeat(32),
      target_offset: 0,
      compressed_size,
      decompressed_size: compressed_size,
      reuse: reused.then(|| PlanReuse { asset_name: "source.bin".to_string(), source_offset: 0 }),
    }
  }

  fn baseline_asset(name: &str, size: u64, chunks: Vec<PlanChunk>) -> PlanAsset {
    PlanAsset {
      name: name.to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size,
      md5: "0".repeat(32),
      chunks,
      patch: None,
    }
  }

  #[test]
  fn plan_workset_baseline_deduplicates_assets_and_fixed_batches() {
    let plan = PersistedPlan {
      schema_version: 5,
      plan_id: "plan".to_string(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Install,
      source_tag: None,
      target_tag: "1.0.0".to_string(),
      manifest_digest: "0".repeat(64),
      strategy: PackagePlanStrategy::Full,
      downloads: vec![
        baseline_download("a", 10),
        baseline_download("b", 20),
        baseline_download("c", 30),
      ],
      assets: vec![
        baseline_asset(
          "a.bin",
          30,
          vec![
            baseline_chunk("a", 10, false),
            baseline_chunk("a", 10, false),
            baseline_chunk("b", 20, false),
            baseline_chunk("reuse", 5, true),
          ],
        ),
        baseline_asset(
          "b.bin",
          50,
          vec![baseline_chunk("b", 20, false), baseline_chunk("c", 30, false)],
        ),
        baseline_asset("c.bin", 30, vec![baseline_chunk("c", 30, false)]),
      ],
      delete_files: Vec::new(),
      inventory: Vec::new(),
      install_overlay: None,
      created_at: "2026-01-01T00:00:00Z".to_string(),
    };

    let baseline = PlanWorksetBaseline::from_plan(&plan, 2);
    assert_eq!(baseline.asset_count, 3);
    assert_eq!(baseline.download_count, 3);
    assert_eq!(baseline.chunk_count, 7);
    assert_eq!(baseline.planned_download_bytes, 60);
    assert_eq!(baseline.planned_output_bytes, 110);
    assert_eq!(baseline.asset_workset_max, 50);
    assert_eq!(baseline.asset_workset_p50, 30);
    assert_eq!(baseline.asset_workset_p95, 50);
    assert_eq!(baseline.asset_workset_p99, 50);
    assert_eq!(baseline.asset_workset_chunk_max, 2);
    assert_eq!(baseline.batch_union_max, 60);
    assert_eq!(baseline.batch_union_p95, 60);
    assert_eq!(baseline.max_download_consumers, 2);
    assert_eq!(baseline.max_download_span, 2);
    assert_eq!(install_spool_window(&plan, 2, false), 256 * 1024 * 1024 + 110);
    assert_eq!(install_spool_window(&plan, 2, true), 256 * 1024 * 1024);
  }

  #[test]
  fn nearest_rank_handles_empty_and_tail_percentiles() {
    assert_eq!(nearest_rank(&[], 95), 0);
    assert_eq!(nearest_rank(&[50, 10, 30, 20, 40], 50), 30);
    assert_eq!(nearest_rank(&[50, 10, 30, 20, 40], 95), 50);
  }

  #[test]
  fn cancel_reaps_orphaned_downloading_switch_journal() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let summary = manager.request_or_reap_cancel(&root.0, &task_id).unwrap().unwrap();
    assert_eq!(summary.state, PackageTaskState::Canceled);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Canceled);
  }

  #[test]
  fn cancel_live_task_only_sets_flag() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let canceled = Arc::new(AtomicBool::new(false));
    {
      let mut active = manager.active.lock().unwrap();
      active.by_task.insert(
        task_id.clone(),
        ActiveTask {
          installation_id: "installation".to_string(),
          canceled: Arc::clone(&canceled),
          paused: Arc::new(AtomicBool::new(false)),
          journal: Arc::new(AsyncMutex::new(journal)),
        },
      );
    }
    assert!(manager.request_or_reap_cancel(&root.0, &task_id).unwrap().is_none());
    assert!(canceled.load(Ordering::Acquire));
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Downloading);
  }

  #[test]
  fn list_persists_orphaned_downloading_as_failed() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Downloading;
    journal::persist(&root.0, &journal).unwrap();
    let listed = tauri::async_runtime::block_on(manager.list(&root.0, None)).unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].state, PackageTaskState::Failed);
    assert_eq!(listed[0].error_message.as_deref(), Some("资源任务已中断，请恢复或放弃"));
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Failed);
  }

  #[test]
  fn list_keeps_ready_to_apply_without_worker() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::ReadyToApply;
    journal::persist(&root.0, &journal).unwrap();
    let listed = tauri::async_runtime::block_on(manager.list(&root.0, None)).unwrap();
    assert_eq!(listed[0].state, PackageTaskState::ReadyToApply);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::ReadyToApply);
  }

  #[test]
  fn cancel_terminal_journal_is_idempotent() {
    let root = TempRoot::new();
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let mut journal = switch_journal(&task_id);
    journal.state = PackageTaskState::Failed;
    journal.error_message = Some("先前失败".to_string());
    journal::persist(&root.0, &journal).unwrap();
    let summary = manager.request_or_reap_cancel(&root.0, &task_id).unwrap().unwrap();
    assert_eq!(summary.state, PackageTaskState::Failed);
    let loaded = journal::load(&journal::journal_path(&root.0, &task_id)).unwrap();
    assert_eq!(loaded.state, PackageTaskState::Failed);
    assert_eq!(loaded.error_message.as_deref(), Some("先前失败"));
  }
}
