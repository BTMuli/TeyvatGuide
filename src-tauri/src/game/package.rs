//! 可恢复资源下载任务编排、安装互斥、取消与事件投影。
//! 分片回收与资源作废由编排任务串行推进；资源 worker 不得并发作废回收候选。
//! @since Beta v0.13.0

mod events;
mod metrics;
mod progress;
mod scheduling;
mod spool;
mod workers;

use events::{TaskEventDispatcher, emit_progress, emit_state, should_emit_progress};
use metrics::{InstallPipelineMetrics, duration_micros};
use progress::{
  AudioLiveAssemblyOverlay, overlay_install_download_progress,
  start_assembly_write_progress_monitor, start_install_download_progress_monitor,
};
use scheduling::{PipelineScheduler, PipelineStagePermit};
use workers::{
  drain_assembly_workers, has_active_assembly_workers, spawn_assembly_worker, spawn_pipeline_job,
};

use spool::{
  InstallCompletionSnapshot, InstallSpoolTracker, install_tracker_spool_bytes,
  release_spool_unneeded_async,
};

use super::{
  assembler, committer, defender,
  downloader::{
    DownloadControl, DownloadDurability, DownloadTelemetry, RateLimiter, download_object,
    prepare_cache_root,
  },
  evidence,
  hoyoplay::{create_http_client, get_game_branches},
  installation::{inspect_audio_languages, inspect_executable, normalize_audio_languages},
  installer,
  journal::{self, TaskJournal},
  model::{
    GameInstallation, PackagePlanStrategy, PackagePlanTarget, PackageRecoveryProgress,
    PackageTaskCleanupSummary, PackageTaskOptions, PackageTaskRecord, PackageTaskRecordKind,
    PackageTaskState, PackageTaskSummary, PackageVerifySummary,
  },
  path_guard::{prepare_manifest_output_file, resolve_optional_manifest_file},
  plan_lifecycle,
  planner::{
    PersistedPlan, PlanDelete, PlanDownload, cached_chunk_matches, cached_chunk_matches_async,
    default_install_concurrency, fallback_asset_plan, flush_cache_validation_index,
    hydrate_and_validate_apply_plan, hydrate_and_validate_repair_plan, install_spool_window,
    invalidate_cached_download, load_persisted_plan, persist_validated_plan, same_volume,
    scan_cached_downloads,
  },
  switch::{self, PersistedSwitchPlan},
  verify::{self, VerifyRuntime},
};
use chrono::{Duration as ChronoDuration, Utc};
use futures_util::{Stream, StreamExt, future::AbortHandle, stream};
use std::{
  collections::{HashMap, HashSet},
  fs,
  path::{Path, PathBuf},
  sync::{
    Arc, LazyLock, Mutex,
    atomic::{AtomicBool, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, ipc::Channel};
use tauri_plugin_notification::NotificationExt;
use tokio::{
  sync::{Mutex as AsyncMutex, Semaphore},
  task::JoinSet,
};
use uuid::Uuid;

const MAX_CONCURRENCY: usize = 64;
const MIN_ASSEMBLY_CONCURRENCY: usize = 4;
const MIN_RATE_LIMIT: u64 = 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
// 中止后等待上一轮组装 worker 收尾的上限。卡在磁盘 syscall 的 worker 无法被中断，
// 等待过长会让恢复安装长时间停在“正在准备”；30 秒足够健康的 worker 完成当前分块。
const INSTALL_ABORT_DRAIN_TIMEOUT: Duration = Duration::from_secs(30);
const INSTALL_STALL_THRESHOLD: Duration = Duration::from_secs(45);
const INSTALL_STALL_POLL_INTERVAL: Duration = Duration::from_secs(5);
const INSTALL_STALL_CONFIRMATIONS: usize = 3;
// 看门狗写入自动暂停状态时等待流水线释放 journal 锁的上限；超时后直接从磁盘回退写入，
// 避免被“持有锁等待无超时磁盘 I/O”的流水线永久卡住。
const INSTALL_WATCHDOG_PAUSE_LOCK_TIMEOUT: Duration = Duration::from_secs(5);
const INSTALL_AUTO_STALL_RETRY_LIMIT: usize = 1;
/// 连续多少轮“仅网络等待”仍没有任何字节进展后，升级为可恢复暂停 / 单次自动重试。
const INSTALL_NETWORK_STALL_CYCLES: usize = 3;
const INSTALL_AUTO_STALL_RETRY_MESSAGE: &str = "检测到持续停滞，正在自动重试 1/1";
const INSTALL_STALL_PAUSE_MESSAGE: &str =
  "检测到下载写入或资源组装持续停滞，任务已自动暂停；可从任务记录继续。详情见运行日志。";
const INSTALL_STALL_NOTIFICATION_TITLE: &str = "游戏安装已暂停";
const INSTALL_STALL_NOTIFICATION_BODY: &str =
  "自动重试后仍检测到磁盘 I/O 持续停滞，请检查磁盘状态后手动继续。";
const MAIN_UPDATE_AUTO_STALL_RETRY_MESSAGE: &str = "检测到正式更新准备持续停滞，正在自动重试 1/1";
const MAIN_UPDATE_STALL_PAUSE_MESSAGE: &str =
  "检测到正式更新下载写入或资源组装持续停滞，任务已自动暂停；可从任务记录继续。";
const MAIN_UPDATE_STALL_RETRY_EXHAUSTED_MESSAGE: &str =
  "自动重试后仍检测到正式更新下载写入或资源组装停滞，任务已暂停；请检查磁盘状态后从任务记录继续。";
const MAIN_UPDATE_NETWORK_STALL_PAUSE_MESSAGE: &str =
  "检测到正式更新下载长时间没有数据，任务已自动暂停；请检查网络后从任务记录继续。";
const MAIN_UPDATE_NETWORK_STALL_RETRY_EXHAUSTED_MESSAGE: &str =
  "自动重试后仍未收到正式更新下载数据，任务已暂停；请检查网络后从任务记录继续。";
const MAIN_UPDATE_WORKER_DRAIN_MESSAGE: &str =
  "旧的正式更新组装 worker 未在超时内退出，任务保持暂停；请确认磁盘健康后再次恢复。";
const MAIN_UPDATE_STALL_NOTIFICATION_TITLE: &str = "正式更新已暂停";
const MAIN_UPDATE_STALL_NOTIFICATION_BODY: &str =
  "自动重试后仍检测到下载写入或资源组装持续停滞，请检查磁盘状态后手动继续。";
const MAIN_UPDATE_NETWORK_STALL_NOTIFICATION_BODY: &str =
  "自动重试后仍未收到下载数据，请检查网络后手动继续。";
const AUDIO_WORKER_DRAIN_MESSAGE: &str =
  "上一轮配音组装仍在退出，任务保持暂停；请等待磁盘操作结束后再次恢复。";
const AUDIO_STALL_PAUSE_MESSAGE: &str =
  "检测到配音包下载或资源组装持续停滞，任务已自动暂停；可从任务记录继续。详情见运行日志。";
const AUDIO_NETWORK_STALL_PAUSE_MESSAGE: &str =
  "检测到配音包下载长时间没有数据，任务已自动暂停；请检查网络后从任务记录继续。";
const AUDIO_STALL_NOTIFICATION_TITLE: &str = "配音包任务已暂停";
const AUDIO_STALL_NOTIFICATION_BODY: &str =
  "检测到配音包下载或资源组装持续停滞，请确认磁盘与网络状态后手动继续。";
const AUDIO_NETWORK_STALL_NOTIFICATION_BODY: &str =
  "检测到配音包下载长时间没有数据，请检查网络后手动继续。";
/// 配音包同时让 4 个资源占用下载槽；真正下多少仍由这个焦点信号量卡住。
const AUDIO_DOWNLOAD_FOCUS: usize = 4;
/// 4 路下载之外再预取 1 个资源，焦点空出后立刻接上下一包。
const AUDIO_DOWNLOAD_PREFETCH: usize = 1;

/// 应用阶段轻量心跳：长时间校验时继续推送当前 journal，避免页面看起来冻结。
fn spawn_apply_heartbeat(
  app_handle: AppHandle,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
) -> Arc<AtomicBool> {
  let stop = Arc::new(AtomicBool::new(false));
  let stop_flag = Arc::clone(&stop);
  std::thread::spawn(move || {
    loop {
      std::thread::sleep(Duration::from_secs(8));
      if stop_flag.load(Ordering::Acquire) || canceled.load(Ordering::Acquire) {
        break;
      }
      let Ok(value) = journal.try_lock() else {
        continue;
      };
      if !matches!(
        value.state,
        PackageTaskState::Assembling
          | PackageTaskState::CommitPrepared
          | PackageTaskState::Committing
          | PackageTaskState::Verifying
      ) {
        continue;
      }
      let summary = value.summary();
      drop(value);
      emit_progress(&app_handle, &summary);
    }
  });
  stop
}

/// 安装流水线停滞看门狗：独立线程联合检查 journal 与下载/组装阶段心跳。
/// @since Beta v0.13.0
fn spawn_install_stall_watchdog(
  app_handle: AppHandle,
  events: TaskEventDispatcher,
  task_root: PathBuf,
  plan_id: String,
  journal: Arc<AsyncMutex<TaskJournal>>,
  paused: Arc<AtomicBool>,
  canceled: Arc<AtomicBool>,
  metrics: Arc<InstallPipelineMetrics>,
  notify_on_stall: bool,
  abort_handle: AbortHandle,
) {
  let runtime = tokio::runtime::Handle::current();
  std::thread::spawn(move || {
    let journal_path = journal::journal_path(&task_root, &plan_id);
    let mut last_signature = None;
    let mut last_progress_at = Instant::now();
    let mut confirmations = 0_usize;
    loop {
      std::thread::sleep(INSTALL_STALL_POLL_INTERVAL);
      if paused.load(Ordering::Acquire) || canceled.load(Ordering::Acquire) {
        break;
      }
      let Some((state, revision)) = install_watchdog_live_progress(&journal, &journal_path) else {
        continue;
      };
      if !matches!(state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
        break;
      }
      let download = metrics.download_snapshot();
      let assembly = metrics.assembly_snapshot();
      let signature = install_watchdog_progress_signature(revision, &download, &assembly);
      if last_signature != Some(signature) {
        last_signature = Some(signature);
        last_progress_at = Instant::now();
        confirmations = 0;
        continue;
      }
      let stalled_for = last_progress_at.elapsed();
      if install_watchdog_is_network_only_wait(&download, &assembly) {
        if stalled_for >= INSTALL_STALL_THRESHOLD {
          log::info!(
            "[game-install][{plan_id}] 仅网络等待持续 {}s，交由单对象超时处理，不暂停流水线",
            stalled_for.as_secs()
          );
          last_progress_at = Instant::now();
        }
        confirmations = 0;
        continue;
      }
      if stalled_for < INSTALL_STALL_THRESHOLD {
        continue;
      }
      confirmations = confirmations.saturating_add(1);
      let journal_age_seconds = fs::metadata(&journal_path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|modified| modified.elapsed().ok())
        .map_or(0, |age| age.as_secs());
      log_install_stall_diagnostics(
        &plan_id,
        stalled_for,
        journal_age_seconds,
        confirmations,
        &metrics,
        download,
        assembly,
      );
      if confirmations >= INSTALL_STALL_CONFIRMATIONS && !metrics.request_stall_pause() {
        paused.store(true, Ordering::Release);
        log::error!("[game-install][{plan_id}] 安装流水线已连续确认停滞，自动转为可恢复暂停状态");
        if notify_on_stall {
          if let Err(error) = app_handle
            .notification()
            .builder()
            .title(INSTALL_STALL_NOTIFICATION_TITLE)
            .body(INSTALL_STALL_NOTIFICATION_BODY)
            .show()
          {
            log::error!("[game-install][{plan_id}] 发送安装停滞系统通知失败：{error}");
          }
        }
        persist_install_watchdog_pause(
          &events,
          &task_root,
          &plan_id,
          &journal,
          INSTALL_STALL_PAUSE_MESSAGE,
          &runtime,
        );
        abort_handle.abort();
        break;
      }
    }
  });
}

/// 读取流水线实时进度：内存锁可获取时读内存；锁被卡住的流水线占住时回退读取磁盘上的
/// journal，保证看门狗不会因为锁不可用而永久失明。
fn install_watchdog_live_progress(
  journal: &Arc<AsyncMutex<TaskJournal>>,
  journal_path: &Path,
) -> Option<(PackageTaskState, u64)> {
  if let Ok(value) = journal.try_lock() {
    return Some((value.state, value.revision));
  }
  let journal_value = journal::load(journal_path).ok()?;
  Some((journal_value.state, journal_value.revision))
}

/// 生成安装看门狗进度签名。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `revision`: 日志修订号。
/// - `download`: 下载遥测快照。
/// - `assembly`: 组装遥测快照。
///
/// # 返回
/// 进度签名元组。
fn install_watchdog_progress_signature(
  revision: u64,
  download: &super::downloader::DownloadTelemetrySnapshot,
  assembly: &assembler::AssemblyTelemetrySnapshot,
) -> (u64, u64, u64, u64, u64, u64, u64, u64) {
  (
    revision,
    download.heartbeat_count,
    download.received_bytes,
    download.in_flight_bytes,
    download.local_written_bytes,
    assembly.heartbeat_count,
    assembly.written_bytes,
    assembly.hashed_bytes,
  )
}

/// 纯网络等待先交给单对象 I/O 超时处理；连续多轮仍无任何字节进展时，
/// 调用方会升级为可恢复暂停 + 单次自动重试，避免任务无声卡住。
fn install_watchdog_is_network_only_wait(
  download: &super::downloader::DownloadTelemetrySnapshot,
  assembly: &assembler::AssemblyTelemetrySnapshot,
) -> bool {
  let assembly_io_active = assembly.active_reads > 0
    || assembly.active_writes > 0
    || assembly.active_hashes > 0
    || assembly.active_syncs > 0;
  download.active_network_waits > 0 && download.active_local_writes == 0 && !assembly_io_active
}

/// 记录安装流水线停滞诊断信息。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `plan_id`: 计划 ID。
/// - `stalled_for`: 停滞时长。
/// - `journal_age_seconds`: 日志年龄秒数。
/// - `confirmations`: 确认次数。
/// - `metrics`: 安装管道指标。
/// - `download`: 下载遥测快照。
/// - `assembly`: 组装遥测快照。
fn log_install_stall_diagnostics(
  plan_id: &str,
  stalled_for: Duration,
  journal_age_seconds: u64,
  confirmations: usize,
  metrics: &InstallPipelineMetrics,
  download: super::downloader::DownloadTelemetrySnapshot,
  assembly: assembler::AssemblyTelemetrySnapshot,
) {
  log::warn!(
    "[game-install][{plan_id}] 安装流水线停滞样本：stalled={}s journalAge={}s confirmation={}/{} activeDownloads={} activeAssemblies={} downloadHeartbeatAge={}ms downloadNetworkActive={} downloadWriteActive={} downloadNetworkOps={} downloadWriteOps={} downloadWrittenBytes={} downloadAttempts={} downloadCacheHits={} downloadNetworkMax={}ms downloadWriteMax={}ms assemblyHeartbeatAge={}ms assemblyReadActive={} assemblyWriteActive={} assemblyHashActive={} assemblySyncActive={} assemblyReadOps={} assemblyWriteOps={} assemblyHashOps={} assemblySyncOps={} assemblyReadBytes={} assemblyWrittenBytes={} assemblyHashedBytes={} assemblyReadMax={}ms assemblyWriteMax={}ms assemblyHashMax={}ms assemblySyncMax={}ms queueRefills={}",
    stalled_for.as_secs(),
    journal_age_seconds,
    confirmations,
    INSTALL_STALL_CONFIRMATIONS,
    metrics.active_downloads(),
    metrics.active_assemblies(),
    download.last_activity_age_millis,
    download.active_network_waits,
    download.active_local_writes,
    download.network_wait_operation_count,
    download.local_write_operation_count,
    download.local_written_bytes,
    download.attempts,
    download.cache_hits,
    download.max_network_wait_micros / 1_000,
    download.max_local_write_micros / 1_000,
    assembly.last_activity_age_millis,
    assembly.active_reads,
    assembly.active_writes,
    assembly.active_hashes,
    assembly.active_syncs,
    assembly.read_operations,
    assembly.write_operations,
    assembly.hash_operations,
    assembly.sync_operations,
    assembly.read_bytes,
    assembly.written_bytes,
    assembly.hashed_bytes,
    assembly.max_read_micros / 1_000,
    assembly.max_write_micros / 1_000,
    assembly.max_hash_micros / 1_000,
    assembly.max_sync_micros / 1_000,
    metrics.queue_refills(),
  );
}

/// 在下载或组装状态时应用看门狗暂停。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `value`: 任务日志。
/// - `message`: 暂停信息。
///
/// # 返回
/// 是否应用暂停。
fn apply_install_watchdog_pause(value: &mut TaskJournal, message: &str) -> bool {
  if !matches!(value.state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
    return false;
  }
  value.state = PackageTaskState::Paused;
  value.error_message = Some(message.to_string());
  value.auto_retry_message = None;
  value.active_assembly_count = 0;
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.current_file = None;
  value.bytes_per_second = 0;
  value.eta_seconds = None;
  value.assembly_bytes_per_second = 0;
  value.assembly_eta_seconds = None;
  value.touch();
  true
}

/// 持久化看门狗暂停状态。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `events`: 事件分发器。
/// - `task_root`: 任务根目录。
/// - `plan_id`: 计划 ID。
/// - `journal`: 任务日志。
/// - `message`: 暂停信息。
/// - `runtime`: Tokio 运行时句柄。
fn persist_install_watchdog_pause(
  events: &TaskEventDispatcher,
  task_root: &Path,
  plan_id: &str,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  message: &str,
  runtime: &tokio::runtime::Handle,
) {
  let pause = async {
    match tokio::time::timeout(
      INSTALL_WATCHDOG_PAUSE_LOCK_TIMEOUT,
      apply_install_watchdog_pause_locked(task_root, journal, message),
    )
    .await
    {
      Ok(Some(summary)) => Some(summary),
      Ok(None) => None,
      Err(_) => persist_install_watchdog_pause_from_disk(task_root, plan_id, message),
    }
  };
  let Some(summary) = runtime.block_on(pause) else {
    return;
  };
  events.publish_state(summary);
}

/// 内存锁被卡住的流水线占用时，直接从磁盘读取最新 journal 写入暂停态，
/// 不依赖内存锁；调用方随后会中止流水线任务，避免暂停状态被旧快照覆盖。
fn persist_install_watchdog_pause_from_disk(
  task_root: &Path,
  plan_id: &str,
  message: &str,
) -> Option<PackageTaskSummary> {
  let journal_path = journal::journal_path(task_root, plan_id);
  let mut value = journal::load(&journal_path).ok()?;
  if !apply_install_watchdog_pause(&mut value, message) {
    return None;
  }
  if let Err(error) = journal::persist(task_root, &value) {
    log::error!("[game-install][{plan_id}] 磁盘回退写入自动暂停状态失败：{error}");
    return None;
  }
  let _ = journal::forget_progress(task_root, &value.task_id);
  Some(value.summary())
}

/// 在锁内应用看门狗暂停并持久化。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `task_root`: 任务根目录。
/// - `journal`: 任务日志。
/// - `message`: 暂停信息。
///
/// # 返回
/// 应用后的任务摘要或 `None`。
async fn apply_install_watchdog_pause_locked(
  task_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  message: &str,
) -> Option<PackageTaskSummary> {
  let mut value = journal.lock().await;
  if !apply_install_watchdog_pause(&mut value, message) {
    return None;
  }
  if let Err(error) = journal::persist(task_root, &value) {
    log::error!("[game-install][{}] 持久化自动暂停状态失败：{error}", value.plan_id);
  }
  let _ = journal::forget_progress(task_root, &value.task_id);
  Some(value.summary())
}

/// 等待下载 worker 完成。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `worker`: worker 句柄。
///
/// # 返回
/// - `Ok(T)`: worker 结果。
/// - `Err(String)`: 异常退出的错误描述。
async fn await_install_download_worker<T>(
  worker: tauri::async_runtime::JoinHandle<Result<T, String>>,
) -> Result<T, String> {
  worker.await.map_err(|error| format!("下载 worker 异常退出：{error}"))?
}

/// 配音下载完成后自动提交所需的可信安装与登记上下文。
pub(crate) struct AudioApplyContext {
  pub installation: GameInstallation,
  pub machine_uid: String,
  pub registration_pool: sqlx::SqlitePool,
}

/// 准备流水线停滞看门狗的文案与日志范围。
struct StallWatchdogLabels {
  log_scope: &'static str,
  pause_message: &'static str,
  retry_exhausted_message: &'static str,
  network_pause_message: &'static str,
  network_retry_exhausted_message: &'static str,
  notification_title: &'static str,
  notification_body: &'static str,
  network_notification_body: &'static str,
}

impl StallWatchdogLabels {
  /// 正式更新：磁盘停滞先自动重试一次，重试用尽后才提醒。
  const MAIN_UPDATE: Self = Self {
    log_scope: "game-main-update",
    pause_message: MAIN_UPDATE_STALL_PAUSE_MESSAGE,
    retry_exhausted_message: MAIN_UPDATE_STALL_RETRY_EXHAUSTED_MESSAGE,
    network_pause_message: MAIN_UPDATE_NETWORK_STALL_PAUSE_MESSAGE,
    network_retry_exhausted_message: MAIN_UPDATE_NETWORK_STALL_RETRY_EXHAUSTED_MESSAGE,
    notification_title: MAIN_UPDATE_STALL_NOTIFICATION_TITLE,
    notification_body: MAIN_UPDATE_STALL_NOTIFICATION_BODY,
    network_notification_body: MAIN_UPDATE_NETWORK_STALL_NOTIFICATION_BODY,
  };
  /// 配音包：没有自动重试流程，停滞即暂停并提醒。
  const AUDIO: Self = Self {
    log_scope: "game-audio-update",
    pause_message: AUDIO_STALL_PAUSE_MESSAGE,
    retry_exhausted_message: AUDIO_STALL_PAUSE_MESSAGE,
    network_pause_message: AUDIO_NETWORK_STALL_PAUSE_MESSAGE,
    network_retry_exhausted_message: AUDIO_NETWORK_STALL_PAUSE_MESSAGE,
    notification_title: AUDIO_STALL_NOTIFICATION_TITLE,
    notification_body: AUDIO_STALL_NOTIFICATION_BODY,
    network_notification_body: AUDIO_NETWORK_STALL_NOTIFICATION_BODY,
  };
}

/// 准备流水线的停滞监测上下文，正式更新与配音包变更共用。
struct PreparePipelineWatchdogContext {
  download_telemetry: Arc<DownloadTelemetry>,
  assembly_telemetry: Arc<assembler::AssemblyTelemetry>,
  stall_pause_requested: Arc<AtomicBool>,
  retry_budget_exhausted: bool,
  notify_on_stall: bool,
  labels: StallWatchdogLabels,
  abort_handle: AbortHandle,
}

/// 准备流水线停滞看门狗：写盘/组装停滞或长时间无下载数据时暂停任务并提示用户。
#[allow(clippy::too_many_arguments)]
fn spawn_prepare_stall_watchdog(
  app_handle: AppHandle,
  task_root: PathBuf,
  plan_id: String,
  journal: Arc<AsyncMutex<TaskJournal>>,
  paused: Arc<AtomicBool>,
  canceled: Arc<AtomicBool>,
  context: PreparePipelineWatchdogContext,
) {
  let runtime = tokio::runtime::Handle::current();
  let log_scope = context.labels.log_scope;
  std::thread::spawn(move || {
    let journal_path = journal::journal_path(&task_root, &plan_id);
    let mut last_signature = None;
    let mut last_progress_at = Instant::now();
    let mut confirmations = 0_usize;
    let mut network_stall_cycles = 0_usize;
    loop {
      std::thread::sleep(INSTALL_STALL_POLL_INTERVAL);
      if paused.load(Ordering::Acquire) || canceled.load(Ordering::Acquire) {
        break;
      }
      let Some((state, revision)) = install_watchdog_live_progress(&journal, &journal_path) else {
        continue;
      };
      if !matches!(state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
        break;
      }
      let download = context.download_telemetry.snapshot();
      let assembly = context.assembly_telemetry.snapshot();
      let signature = install_watchdog_progress_signature(revision, &download, &assembly);
      if last_signature != Some(signature) {
        last_signature = Some(signature);
        last_progress_at = Instant::now();
        confirmations = 0;
        network_stall_cycles = 0;
        continue;
      }
      let stalled_for = last_progress_at.elapsed();
      let network_only = install_watchdog_is_network_only_wait(&download, &assembly);
      if network_only {
        if stalled_for >= INSTALL_STALL_THRESHOLD {
          network_stall_cycles = network_stall_cycles.saturating_add(1);
          log::info!(
            "[{log_scope}][{plan_id}] 仅网络等待持续 {}s（{}/{}），本轮未收到任何下载数据",
            stalled_for.as_secs(),
            network_stall_cycles,
            INSTALL_NETWORK_STALL_CYCLES
          );
          last_progress_at = Instant::now();
        }
        confirmations = 0;
        // 单对象超时可能反复重试，长时间只看到“网络等待”；连续多轮没有任何字节进展时同样
        // 升级为可恢复暂停 + 单次自动重试，避免任务无声卡住、前端没有可用的重试入口。
        if network_stall_cycles < INSTALL_NETWORK_STALL_CYCLES {
          continue;
        }
      } else {
        if stalled_for < INSTALL_STALL_THRESHOLD {
          continue;
        }
        confirmations = confirmations.saturating_add(1);
        log::warn!(
          "[{log_scope}][{plan_id}] 准备流水线停滞样本：stalled={}s confirmation={}/{} downloadHeartbeatAge={}ms downloadWriteActive={} downloadWrittenBytes={} assemblyHeartbeatAge={}ms assemblyReadActive={} assemblyWriteActive={} assemblyHashActive={} assemblySyncActive={} assemblyWrittenBytes={} assemblyHashedBytes={}",
          stalled_for.as_secs(),
          confirmations,
          INSTALL_STALL_CONFIRMATIONS,
          download.last_activity_age_millis,
          download.active_local_writes,
          download.local_written_bytes,
          assembly.last_activity_age_millis,
          assembly.active_reads,
          assembly.active_writes,
          assembly.active_hashes,
          assembly.active_syncs,
          assembly.written_bytes,
          assembly.hashed_bytes,
        );
        if confirmations < INSTALL_STALL_CONFIRMATIONS {
          continue;
        }
      }
      if context.stall_pause_requested.swap(true, Ordering::AcqRel) {
        continue;
      }
      paused.store(true, Ordering::Release);
      let labels = &context.labels;
      let message = match (network_only, context.retry_budget_exhausted) {
        (false, false) => labels.pause_message,
        (false, true) => labels.retry_exhausted_message,
        (true, false) => labels.network_pause_message,
        (true, true) => labels.network_retry_exhausted_message,
      };
      log::error!(
        "[{log_scope}][{plan_id}] 已确认停滞（networkOnly={network_only}，retryExhausted={}），自动转为可恢复暂停状态",
        context.retry_budget_exhausted
      );
      if context.notify_on_stall {
        let body =
          if network_only { labels.network_notification_body } else { labels.notification_body };
        if let Err(error) =
          app_handle.notification().builder().title(labels.notification_title).body(body).show()
        {
          log::error!("[{log_scope}][{plan_id}] 发送停滞系统通知失败：{error}");
        }
      }
      persist_prepare_watchdog_pause(
        &app_handle,
        &task_root,
        &plan_id,
        &journal,
        message,
        &runtime,
      );
      context.abort_handle.abort();
      break;
    }
  });
}

/// 持久化看门狗暂停状态并同步给前端。
fn persist_prepare_watchdog_pause(
  app_handle: &AppHandle,
  task_root: &Path,
  plan_id: &str,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  message: &str,
  runtime: &tokio::runtime::Handle,
) {
  let pause = async {
    match tokio::time::timeout(
      INSTALL_WATCHDOG_PAUSE_LOCK_TIMEOUT,
      apply_install_watchdog_pause_locked(task_root, journal, message),
    )
    .await
    {
      Ok(Some(summary)) => Some(summary),
      Ok(None) => None,
      Err(_) => persist_install_watchdog_pause_from_disk(task_root, plan_id, message),
    }
  };
  let Some(summary) = runtime.block_on(pause) else {
    return;
  };
  emit_state(app_handle, &summary);
  emit_progress(app_handle, &summary);
}

struct AudioAssetJob {
  asset_index: usize,
  pending: Vec<(usize, PlanDownload)>,
}

/// 资源组装与证据落盘后的完成结果；下载阶段容量由独立 permit 管理。
/// @since Beta v0.13.0
struct AudioAssetJobCompletion {
  asset_index: usize,
  result: Result<(), String>,
}

/// 默认下载/组装并发：按 CPU 核心数，最低 4 路。
pub(crate) fn default_concurrency() -> usize {
  default_install_concurrency()
}

/// 计算安装下载并发数。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `pipeline_concurrency`: 管道并发数。
///
/// # 返回
/// 下载并发数。
fn install_download_concurrency(pipeline_concurrency: usize) -> usize {
  pipeline_concurrency.clamp(1, MAX_CONCURRENCY)
}

/// 组装并发与下载默认同一套：跟随流水线 concurrency，最低 4 路，最高 64 路。
fn install_assembly_concurrency(pipeline_concurrency: usize) -> usize {
  pipeline_concurrency.clamp(MIN_ASSEMBLY_CONCURRENCY, MAX_CONCURRENCY)
}

/// 配音/更新任务总窗口：组装槽 + 4 路下载 + 1 路预取。
///
/// 下载和组装独立计数；总窗口继续限制在途资源以及尚未回收的完成结果。
/// @since Beta v0.13.0
fn audio_pipeline_window(pipeline_concurrency: usize) -> usize {
  install_assembly_concurrency(pipeline_concurrency)
    .saturating_add(AUDIO_DOWNLOAD_FOCUS)
    .saturating_add(AUDIO_DOWNLOAD_PREFETCH)
}

#[allow(clippy::too_many_arguments)]
/// 派生安装组装 worker。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `plan_id`: 计划 ID。
/// - `plan`: 资源计划。
/// - `download_index`: 下载索引。
/// - `asset_index`: 资源游标。
/// - `staging_root`: staging 根目录。
/// - `shared_cache_root`: 共享缓存根目录。
/// - `spool_root`: spool 根目录。
/// - `canceled`: 取消标志。
/// - `telemetry`: 组装遥测。
///
/// # 返回
/// worker 句柄。
fn spawn_install_assembly_worker(
  plan_id: &str,
  plan: Arc<PersistedPlan>,
  download_index: Arc<assembler::FullInstallDownloadIndex>,
  asset_index: usize,
  staging_root: PathBuf,
  shared_cache_root: PathBuf,
  spool_root: PathBuf,
  canceled: Arc<AtomicBool>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
) -> tauri::async_runtime::JoinHandle<(Result<(), String>, assembler::AssemblyTiming)> {
  spawn_assembly_worker(plan_id, move || {
    let mut timing = assembler::AssemblyTiming::default();
    let result = assembler::assemble_full_install_asset_with_observers(
      &plan,
      &download_index,
      asset_index,
      &staging_root,
      &shared_cache_root,
      &spool_root,
      &canceled,
      &mut timing,
      &telemetry,
    );
    (result, timing)
  })
}

/// 派生正式更新组装 worker，并登记到中止后的退出栅栏。
#[allow(clippy::too_many_arguments)]
/// @since Beta v0.13.0
fn spawn_main_update_assembly_worker(
  plan: Arc<PersistedPlan>,
  asset_index: usize,
  fallback: bool,
  game_root: PathBuf,
  task_root: PathBuf,
  output_root: PathBuf,
  canceled: Arc<AtomicBool>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
) -> tauri::async_runtime::JoinHandle<Result<assembler::AssetAssemblyOutcome, String>> {
  let plan_id = plan.plan_id.clone();
  spawn_assembly_worker(&plan_id, move || {
    let fallback_plan = fallback.then(|| fallback_asset_plan(&plan, asset_index)).transpose()?;
    let outcome = assembler::assemble_plan_asset_with_source_outcome(
      fallback_plan.as_ref().unwrap_or(&plan),
      if fallback { 0 } else { asset_index },
      &game_root,
      &task_root,
      &output_root,
      &canceled,
      Some(&telemetry),
    )?;
    if matches!(outcome, assembler::AssetAssemblyOutcome::Assembled) {
      evidence::capture_and_persist_asset_evidence(&task_root, &plan, asset_index, &output_root)?;
    }
    Ok(outcome)
  })
}

/// 把当前活跃组装数写回任务日志并发布进度。
/// @since Beta v0.13.0
async fn emit_active_assembly_count(
  events: &TaskEventDispatcher,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  metrics: &InstallPipelineMetrics,
) {
  let mut value = journal.lock().await;
  value.active_assembly_count = metrics.active_assemblies();
  value.touch();
  let summary = value.summary();
  drop(value);
  events.publish_progress(summary);
}

/// 把安装完成快照写回任务日志，并同步逻辑 staging 占用指标。
fn apply_install_completion_snapshot(
  value: &mut TaskJournal,
  snapshot: InstallCompletionSnapshot,
  metrics: &InstallPipelineMetrics,
) {
  value.completed_asset_cursor = snapshot.contiguous_cursor;
  value.assembly_completed_count = snapshot.completed_count;
  value.assembly_completed_bytes = snapshot.completed_bytes;
  value.assembly_completed_bytes_total = snapshot.contiguous_bytes;
  metrics.observe_logical_staging(snapshot.completed_bytes);
}

/// 持久化安装检查点，并记录检查点及 journal 写入耗时指标。
/// @since Beta v0.13.0
fn persist_install_checkpoint(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> Result<(), String> {
  if metrics.is_stall_pause_requested() {
    return Ok(());
  }
  let mut timing = journal::JournalPersistTiming::default();
  let result = journal::persist_timed(task_root, journal_value, &mut timing);
  metrics.record_checkpoint(Duration::from_micros(timing.total_micros));
  metrics.record_journal(&timing);
  result
}

/// 持久化安装进度，并记录 journal 写入耗时指标。
/// @since Beta v0.13.0
fn persist_install_progress(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> Result<(), String> {
  if metrics.is_stall_pause_requested() {
    return Ok(());
  }
  let mut timing = journal::JournalPersistTiming::default();
  let result = journal::persist_progress_timed(task_root, journal_value, &mut timing);
  metrics.record_journal(&timing);
  result
}

/// 在 blocking 线程池中异步持久化安装进度。
async fn persist_install_progress_async(
  task_root: PathBuf,
  journal_value: TaskJournal,
  metrics: Arc<InstallPipelineMetrics>,
) -> Result<(), String> {
  tauri::async_runtime::spawn_blocking(move || {
    persist_install_progress(&task_root, &journal_value, &metrics)
  })
  .await
  .map_err(|error| format!("持久化安装进度 worker 异常退出：{error}"))?
}

/// 在 blocking 线程池中异步持久化安装检查点。
async fn persist_install_checkpoint_async(
  task_root: PathBuf,
  journal_value: TaskJournal,
  metrics: Arc<InstallPipelineMetrics>,
) -> Result<(), String> {
  tauri::async_runtime::spawn_blocking(move || {
    persist_install_checkpoint(&task_root, &journal_value, &metrics)
  })
  .await
  .map_err(|error| format!("持久化安装检查点 worker 异常退出：{error}"))?
}

/// 在 journal 锁内应用下载进度更新、异步持久化，并按节流规则发布进度。
/// @since Beta v0.13.0
async fn commit_install_download_progress(
  events: &TaskEventDispatcher,
  task_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  metrics: &Arc<InstallPipelineMetrics>,
  update: impl FnOnce(&mut TaskJournal),
) -> Result<TaskJournal, String> {
  let persist_value = {
    let mut value = journal.lock().await;
    update(&mut value);
    value.touch();
    value.clone()
  };
  persist_install_progress_async(
    task_root.to_path_buf(),
    persist_value.clone(),
    Arc::clone(metrics),
  )
  .await?;
  let summary = overlay_install_download_progress(&persist_value, metrics);
  if should_emit_progress(&summary.task_id) {
    events.publish_progress(summary);
  }
  Ok(persist_value)
}

/// 有指标时使用带计时的检查点持久化，否则直接持久化 journal。
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
  by_installation: HashMap<String, InstallationReservation>,
  record_operations: HashSet<String>,
  retired_task_ids: HashSet<String>,
  cache_clear_active: bool,
}

/// 收集当前活动任务与安装互斥所覆盖的任务 ID。
fn active_task_ids(active: &ActiveTasks) -> HashSet<String> {
  let mut active_ids = active.by_task.keys().cloned().collect::<HashSet<_>>();
  active_ids.extend(active.by_installation.values().map(|reservation| reservation.task_id.clone()));
  active_ids
}

/// 在持有任务生命周期锁期间执行同步清理，阻止新的 reservation 与目录删除交错。
fn with_active_task_ids<T>(
  active: &Arc<Mutex<ActiveTasks>>,
  operation: impl FnOnce(&HashSet<String>) -> Result<T, String>,
) -> Result<T, String> {
  let active_guard = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
  let mut active_ids = active_task_ids(&active_guard);
  active_ids.extend(active_guard.record_operations.iter().cloned());
  let result = operation(&active_ids);
  drop(active_guard);
  result
}

struct InstallationReservation {
  task_id: String,
  canceled: Arc<AtomicBool>,
}

#[derive(Clone)]
struct ActiveTask {
  installation_id: String,
  canceled: Arc<AtomicBool>,
  paused: Arc<Mutex<Arc<AtomicBool>>>,
  manual_pause_requested: Arc<AtomicBool>,
  journal: Arc<AsyncMutex<TaskJournal>>,
}

/// 设置手动暂停请求，并返回暂停令牌与 journal 锁。
async fn signal_pause_and_lock_journal(
  task: &ActiveTask,
) -> Result<(Arc<AtomicBool>, bool, tokio::sync::MutexGuard<'_, TaskJournal>), String> {
  let paused = task.paused.lock().map_err(|_| "游戏资源任务暂停令牌锁已损坏".to_string())?.clone();
  task.manual_pause_requested.store(true, Ordering::Release);
  let was_paused = paused.swap(true, Ordering::AcqRel);
  let journal = task.journal.lock().await;
  Ok((paused, was_paused, journal))
}

#[derive(Clone)]
pub(crate) struct InstallContext {
  pub(crate) pool: sqlx::SqlitePool,
  pub(crate) machine_uid: String,
  pub(crate) draft_id: String,
  pub(crate) preserve_chunks: bool,
}

/// 安装运行互斥及正式更新的临时 Defender 排除清理责任。
/// @since Beta v0.13.0
pub(crate) struct TaskReservation {
  active: Arc<Mutex<ActiveTasks>>,
  installation_id: String,
  task_id: String,
  canceled: Arc<AtomicBool>,
  defender_task_root: Option<PathBuf>,
}

pub(crate) struct TaskRecordOperation {
  active: Arc<Mutex<ActiveTasks>>,
  task_id: String,
}

impl TaskRecordOperation {
  /// 预留任务记录变更互斥。
  fn acquire(active: Arc<Mutex<ActiveTasks>>, task_id: &str) -> Result<Self, String> {
    let task_id =
      Uuid::parse_str(task_id).map_err(|_| "任务 ID 无效：必须是 UUID".to_string())?.to_string();
    {
      let mut tasks = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if tasks.retired_task_ids.contains(&task_id) {
        return Err("任务计划已清除，请重新评估".to_string());
      }
      if !tasks.record_operations.insert(task_id.clone()) {
        return Err("任务记录正在被其他操作使用，请稍后重试".to_string());
      }
    }
    Ok(Self { active, task_id })
  }
}

impl Drop for TaskRecordOperation {
  /// 释放任务记录变更互斥。
  fn drop(&mut self) {
    if let Ok(mut active) = self.active.lock() {
      active.record_operations.remove(&self.task_id);
    }
  }
}

impl TaskReservation {
  /// 预留安装运行互斥。
  /// @since Beta v0.13.0
  fn acquire(
    active: Arc<Mutex<ActiveTasks>>,
    installation_id: &str,
    task_id: &str,
  ) -> Result<Self, String> {
    let canceled = Arc::new(AtomicBool::new(false));
    {
      let mut tasks = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      if tasks.cache_clear_active {
        return Err("游戏资源缓存正在清理，请稍后重试".to_string());
      }
      if tasks.retired_task_ids.contains(task_id) {
        return Err("任务计划已清除，请重新评估".to_string());
      }
      if tasks.by_installation.contains_key(installation_id) {
        return Err("该游戏安装已有资源任务正在运行".to_string());
      }
      tasks.by_installation.insert(
        installation_id.to_string(),
        InstallationReservation { task_id: task_id.to_string(), canceled: Arc::clone(&canceled) },
      );
    }
    Ok(Self {
      active,
      installation_id: installation_id.to_string(),
      task_id: task_id.to_string(),
      canceled,
      defender_task_root: None,
    })
  }

  /// 在释放安装互斥前清理正式更新终态拥有的临时排除。
  /// @since Beta v0.13.0
  fn with_defender_cleanup(mut self, task_root: &Path, target: PackagePlanTarget) -> Self {
    if target == PackagePlanTarget::Main {
      self.defender_task_root = Some(task_root.to_path_buf());
    }
    self
  }

  /// 返回该任务的取消标志。
  pub(crate) fn canceled_flag(&self) -> Arc<AtomicBool> {
    Arc::clone(&self.canceled)
  }
}

/// 只释放仍指向同一取消令牌的安装互斥，避免旧任务误删后继任务。
/// @since Beta v0.13.0
fn release_task_reservation(
  active: &Arc<Mutex<ActiveTasks>>,
  installation_id: &str,
  task_id: &str,
  canceled: &Arc<AtomicBool>,
) {
  let Ok(mut active) = active.lock() else {
    return;
  };
  if active.by_task.get(task_id).is_some_and(|task| {
    task.installation_id == installation_id && Arc::ptr_eq(&task.canceled, canceled)
  }) {
    active.by_task.remove(task_id);
  }
  if active.by_installation.get(installation_id).is_some_and(|reservation| {
    reservation.task_id == task_id && Arc::ptr_eq(&reservation.canceled, canceled)
  }) {
    active.by_installation.remove(installation_id);
  }
}

impl Drop for TaskReservation {
  /// 等资源子任务与组装 worker 退出并完成终态排除清理后再释放互斥。
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    let cleanup_required =
      self.defender_task_root.as_ref().is_some_and(
        |task_root| match update_exclusions_need_cleanup(task_root, &self.task_id) {
          Ok(required) => required,
          Err(error) => {
            log::warn!("[game-package][{}] 检查 Defender 清理状态失败：{error}", self.task_id);
            false
          }
        },
      );
    if !cleanup_required && !has_active_assembly_workers(&self.task_id) {
      release_task_reservation(&self.active, &self.installation_id, &self.task_id, &self.canceled);
      return;
    }
    let active = Arc::clone(&self.active);
    let installation_id = self.installation_id.clone();
    let task_id = self.task_id.clone();
    let canceled = Arc::clone(&self.canceled);
    let defender_task_root = self.defender_task_root.take();
    tauri::async_runtime::spawn(async move {
      while !drain_assembly_workers(&task_id, INSTALL_ABORT_DRAIN_TIMEOUT).await {}
      if let Some(task_root) = defender_task_root {
        let cleanup_task_id = task_id.clone();
        if let Err(error) = tauri::async_runtime::spawn_blocking(move || {
          if let Err(error) = cleanup_finished_update_exclusions(&task_root, &cleanup_task_id) {
            log::warn!("[game-package][{cleanup_task_id}] 清理 Defender 排除失败：{error}");
          }
        })
        .await
        {
          log::warn!("[game-package][{task_id}] Defender 排除清理线程异常退出：{error}");
        }
      }
      release_task_reservation(&active, &installation_id, &task_id, &canceled);
    });
  }
}

/// 仅清理已结束或尚未创建日志的正式更新；可恢复任务继续保留排除。
/// @since Beta v0.13.0
fn update_exclusions_need_cleanup(task_root: &Path, task_id: &str) -> Result<bool, String> {
  let path = journal::journal_path(task_root, task_id);
  if !path.try_exists().map_err(|error| format!("读取更新日志路径失败：{error}"))? {
    return Ok(true);
  }
  Ok(journal::load(&path)?.state.is_history_terminal())
}

/// 核对任务日志后移除终态正式更新拥有的临时排除。
/// @since Beta v0.13.0
fn cleanup_finished_update_exclusions(task_root: &Path, task_id: &str) -> Result<(), String> {
  if !update_exclusions_need_cleanup(task_root, task_id)? {
    return Ok(());
  }
  defender::cleanup_install_exclusions(task_root, task_id)
}

pub(crate) struct CacheClearReservation {
  active: Arc<Mutex<ActiveTasks>>,
}

impl Drop for CacheClearReservation {
  /// 释放游戏资源缓存清理互斥。
  fn drop(&mut self) {
    if let Ok(mut active) = self.active.lock() {
      active.cache_clear_active = false;
    }
  }
}

impl GamePackageManager {
  /// 创建游戏包管理器。
  pub(crate) fn new() -> Self {
    Self {
      active: Arc::new(Mutex::new(ActiveTasks {
        by_task: HashMap::new(),
        by_installation: HashMap::new(),
        record_operations: HashSet::new(),
        retired_task_ids: HashSet::new(),
        cache_clear_active: false,
      })),
      verify: Arc::new(VerifyRuntime::new()),
    }
  }

  /// 启动资源下载。Main / Audio 边下边组装到 incoming；PreDownload 只写分片缓存。
  /// 游戏运行时仍允许开始；提交仍须游戏未在运行。
  /// @since Beta v0.13.0
  pub(crate) async fn start(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    game_root: PathBuf,
    options: PackageTaskOptions,
    recovering: bool,
    audio_apply: Option<AudioApplyContext>,
    main_apply: Option<GameInstallation>,
    recovery_progress: Option<Channel<PackageRecoveryProgress>>,
  ) -> Result<PackageTaskSummary, String> {
    if self.verify.is_running(&plan.installation_id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再开始资源任务".to_string());
    }
    if journal::list(&task_root, Some(&plan.installation_id))?
      .iter()
      .any(|task| task.state.blocks_launch())
    {
      return Err("该游戏安装存在等待恢复的资源提交，请先完成恢复".to_string());
    }
    journal::reject_occupying_resource_task(
      &task_root,
      &plan.installation_id,
      Some(&plan.plan_id),
    )?;
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
    let plan = Arc::new(plan);
    let reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?
        .with_defender_cleanup(&task_root, plan.target);
    if plan.target == PackagePlanTarget::Main {
      defender::require_registry(&task_root, &plan.plan_id)?;
    }
    let canceled = reservation.canceled_flag();
    let mut journal = journal::load_or_create(&task_root, &plan)?;
    if let Err(error) =
      drain_audio_workers_before_start(&task_root, &mut journal, INSTALL_ABORT_DRAIN_TIMEOUT).await
    {
      let summary = journal.summary();
      emit_state(&app_handle, &summary);
      emit_progress(&app_handle, &summary);
      return Err(error);
    }
    let cache_root = prepare_cache_root(&task_root)?;
    let download_client = create_http_client()?;
    let scan_task_id = plan.plan_id.clone();
    let scan_cache_root = cache_root.clone();
    let active_downloads = active_update_downloads(&plan, &journal.fallback_assets)?;
    update_download_totals(&mut journal, &active_downloads)?;
    journal.fallback_download_bytes = journal
      .total_bytes
      .saturating_sub(plan.downloads.iter().map(|item| item.compressed_size).sum::<u64>());
    let scan_downloads = active_downloads.clone();
    let scan_progress = recovery_progress.clone();
    let cache_scan = tauri::async_runtime::spawn_blocking(move || {
      scan_cached_downloads(
        &scan_cache_root,
        &scan_downloads,
        |scanned_objects, total_objects, confirmed_bytes| {
          if let Some(channel) = &scan_progress {
            let _ = channel.send(PackageRecoveryProgress {
              task_id: scan_task_id.clone(),
              step: 3,
              total_steps: 4,
              scanned_objects,
              total_objects,
              confirmed_bytes,
              message: "正在核对已下载缓存".to_string(),
            });
          }
        },
      )
    })
    .await
    .map_err(|error| format!("资源缓存核对任务异常退出：{error}"))??;
    let plan = Arc::try_unwrap(plan).map_err(|_| "资源计划核对完成后仍被占用".to_string())?;
    let required = cache_scan
      .missing_bytes
      .checked_add(SAFETY_MARGIN_BYTES)
      .ok_or_else(|| "缓存空间需求溢出".to_string())?;
    let available = fs2::available_space(&cache_root)
      .map_err(|error| format!("读取资源缓存磁盘剩余空间失败：{error}"))?;
    if available < required {
      return Err(format!("资源缓存磁盘空间不足：至少还需 {required} 字节，可用 {available} 字节"));
    }
    if plan.target == PackagePlanTarget::Main {
      let remaining_incoming = committer::remaining_incoming_bytes(&plan, &game_root, &task_root)?;
      let incoming_required = remaining_incoming.saturating_add(SAFETY_MARGIN_BYTES);
      let game_available = fs2::available_space(&game_root)
        .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
      if game_available < incoming_required {
        return Err(format!(
          "游戏磁盘空间不足：至少还需 {incoming_required} 字节，可用 {game_available} 字节"
        ));
      }
      if same_volume(&cache_root, &game_root) {
        let peak = cache_scan
          .missing_bytes
          .saturating_add(remaining_incoming)
          .saturating_add(SAFETY_MARGIN_BYTES);
        if available < peak {
          return Err(format!(
            "磁盘空间不足：下载并组装至少还需 {peak} 字节，可用 {available} 字节"
          ));
        }
      }
    }

    journal.ensure_update_commit_progress(&plan);
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的资源任务，请使用恢复操作继续".to_string());
    }
    if !recovering && journal.state == PackageTaskState::Paused {
      return Err("检测到已暂停的资源任务，请使用恢复操作继续".to_string());
    }
    if recovering && journal.state == PackageTaskState::ReadyToApply {
      return Err(if plan.target == PackagePlanTarget::Main {
        "资源任务已经完成下载和组装".to_string()
      } else {
        "资源任务已经完成下载".to_string()
      });
    }
    journal.resume_elapsed();
    journal.committed_step = cache_scan.completed_cache_keys.len();
    journal.owned_cache_files = cache_scan.completed_cache_keys;
    journal.downloaded_bytes = cache_scan.confirmed_bytes;
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.bytes_per_second = 0;
    journal.eta_seconds = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    if let Some(channel) = &recovery_progress {
      let _ = channel.send(PackageRecoveryProgress {
        task_id: plan.plan_id.clone(),
        step: 4,
        total_steps: 4,
        scanned_objects: active_downloads.len(),
        total_objects: active_downloads.len(),
        confirmed_bytes: journal.downloaded_bytes,
        message: "缓存核对完成，正在继续任务".to_string(),
      });
    }

    let summary = journal.summary();
    let retry_budget_exhausted =
      journal.install_auto_stall_retry_count >= INSTALL_AUTO_STALL_RETRY_LIMIT;
    let paused = Arc::new(AtomicBool::new(false));
    let paused_slot = Arc::new(Mutex::new(Arc::clone(&paused)));
    let manual_pause_requested = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused_slot),
      manual_pause_requested: Arc::clone(&manual_pause_requested),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    emit_state(&app_handle, &summary);
    tauri::async_runtime::spawn(async move {
      let _reservation = reservation;
      let stream_assemble = audio_apply.is_some() || plan.target == PackagePlanTarget::Main;
      if stream_assemble {
        if plan.target == PackagePlanTarget::Main {
          run_main_streaming_prepare_supervisor(
            app_handle.clone(),
            task_root.clone(),
            cache_root,
            game_root.clone(),
            plan.clone(),
            download_client,
            Arc::clone(&shared_journal),
            Arc::clone(&canceled),
            Arc::clone(&paused_slot),
            manual_pause_requested,
            concurrency,
            options.max_bytes_per_second,
            retry_budget_exhausted,
          )
          .await;
        } else {
          // 配音包没有自动重试流程：停滞看门狗确认后直接暂停并系统通知，因此按"重试预算已
          // 用尽"呈现提示文案。
          let stall_pause_requested = Arc::new(AtomicBool::new(false));
          let (abort_handle, abort_registration) = futures_util::future::AbortHandle::new_pair();
          let watchdog_context = PreparePipelineWatchdogContext {
            download_telemetry: DownloadTelemetry::new(),
            assembly_telemetry: assembler::AssemblyTelemetry::new(),
            stall_pause_requested: Arc::clone(&stall_pause_requested),
            retry_budget_exhausted: true,
            notify_on_stall: true,
            labels: StallWatchdogLabels::AUDIO,
            abort_handle,
          };
          let pipeline = futures_util::future::Abortable::new(
            run_streaming_prepare_task(
              app_handle.clone(),
              task_root.clone(),
              cache_root,
              game_root.clone(),
              plan.clone(),
              download_client,
              Arc::clone(&shared_journal),
              Arc::clone(&canceled),
              Arc::clone(&paused),
              concurrency,
              options.max_bytes_per_second,
              audio_apply.is_some(),
              Some(watchdog_context),
            ),
            abort_registration,
          );
          let _ = pipeline.await;
          if stall_pause_requested.load(Ordering::Acquire)
            && !drain_assembly_workers(&plan.plan_id, INSTALL_ABORT_DRAIN_TIMEOUT).await
          {
            log::error!(
              "[game-audio-update][{}] 停滞中止后的组装 worker 未在超时内结束",
              plan.plan_id
            );
            persist_prepare_paused_message(
              &app_handle,
              &task_root,
              &shared_journal,
              AUDIO_WORKER_DRAIN_MESSAGE,
            )
            .await;
            return;
          }
        }
        if let Some(installation) = main_apply {
          let apply_paused = paused_slot.lock().unwrap().clone();
          let ready_to_apply = shared_journal.lock().await.state == PackageTaskState::ReadyToApply;
          if ready_to_apply && is_game_running() {
            log::info!("[game-package] 正式更新已组装完成，游戏仍在运行，等待前端确认停游后应用");
          } else if ready_to_apply
            && let Err(error) = apply_main_after_download(
              app_handle.clone(),
              task_root.clone(),
              game_root.clone(),
              plan.clone(),
              Arc::clone(&shared_journal),
              Arc::clone(&canceled),
              installation,
              apply_paused,
              concurrency,
              options.max_bytes_per_second,
            )
            .await
          {
            log::warn!("[game-package] 正式更新自动应用失败：{error}");
          }
        }
        if let Some(context) = audio_apply
          && let Err(error) = apply_audio_after_download(
            app_handle.clone(),
            task_root.clone(),
            plan.clone(),
            Arc::clone(&shared_journal),
            Arc::clone(&canceled),
            context,
          )
          .await
        {
          let mut journal_value = shared_journal.lock().await;
          if journal_value.state == PackageTaskState::ReadyToApply
            && journal_value.error_message.is_none()
          {
            journal_value.error_message = Some(error.clone());
            journal_value.current_file = None;
            journal_value.commit_current_step = Some("等待重试提交配音文件".to_string());
            journal_value.touch();
            let _ = journal::persist(&task_root, &journal_value);
            let summary = journal_value.summary();
            emit_state(&app_handle, &summary);
            emit_progress(&app_handle, &summary);
          }
          log::warn!("[game-package] 自动应用配音包变更失败：{error}");
        }
      } else {
        let _ = game_root;
        run_task(
          app_handle.clone(),
          &task_root,
          &cache_root,
          None,
          plan.clone(),
          download_client,
          Arc::clone(&shared_journal),
          Arc::clone(&canceled),
          Arc::clone(&paused),
          concurrency,
          options.max_bytes_per_second,
          None,
        )
        .await;
      }
    });
    Ok(summary)
  }

  /// 判断指定安装的运行互斥是否正由同一个任务持有。
  pub(crate) fn is_task_running(
    &self,
    task_id: &str,
    installation_id: &str,
  ) -> Result<bool, String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    Ok(
      active
        .by_installation
        .get(installation_id)
        .is_some_and(|reservation| reservation.task_id == task_id),
    )
  }

  /// 返回当前正持有该安装运行互斥的任务 ID（资源任务或一次性操作）。
  pub(crate) fn running_task_for_installation(
    &self,
    installation_id: &str,
  ) -> Result<Option<String>, String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    Ok(active.by_installation.get(installation_id).map(|reservation| reservation.task_id.clone()))
  }

  /// 启动全新安装下载、组装与提交任务。
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
    let reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let canceled = reservation.canceled_flag();
    let cache_root = prepare_cache_root(&task_root)?;
    let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
    let spool_root = installer::prepare_install_spool(&task_root, &draft_id, overlay)?;
    let mut draft = installer::load_draft(&task_root, &draft_id)?;
    if matches!(
      draft.state,
      installer::InstallDraftState::Completed | installer::InstallDraftState::Canceled
    ) {
      return Err("安装草稿已经结束，不能重新启动".to_string());
    }
    let preserve_chunks = options.preserve_chunks.unwrap_or(draft.preserve_chunks);
    let options_changed = draft.preserve_chunks != preserve_chunks
      || draft.last_concurrency != options.concurrency
      || draft.last_max_bytes_per_second != options.max_bytes_per_second;
    if options_changed {
      draft.preserve_chunks = preserve_chunks;
      draft.last_concurrency = options.concurrency;
      draft.last_max_bytes_per_second = options.max_bytes_per_second;
      installer::persist_draft(&task_root, &draft)?;
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
    journal.resume_elapsed();
    rebuild_install_cache_state(&mut journal, &plan, &cache_root, &spool_root);
    if preserve_chunks {
      let total_download_bytes = plan.downloads.iter().try_fold(0_u64, |total, download| {
        total.checked_add(download.compressed_size).ok_or_else(|| "安装下载大小溢出".to_string())
      })?;
      let shared_cache_bytes = plan.downloads.iter().try_fold(0_u64, |total, download| {
        if cached_chunk_matches(&cache_root, download) {
          total.checked_add(download.compressed_size).ok_or_else(|| "安装缓存大小溢出".to_string())
        } else {
          Ok(total)
        }
      })?;
      let cache_storage_required =
        total_download_bytes.saturating_sub(shared_cache_bytes).saturating_add(SAFETY_MARGIN_BYTES);
      let cache_storage_available = fs2::available_space(&cache_root)
        .map_err(|error| format!("读取应用缓存磁盘剩余空间失败：{error}"))?;
      if cache_storage_available < cache_storage_required {
        let error = format!(
          "缓存目录所在磁盘空间不足：保留下载分片需要约 {} 字节，当前仅 {} 字节可用；请释放应用缓存磁盘空间或取消保留分片选项",
          cache_storage_required, cache_storage_available
        );
        journal.state = PackageTaskState::Failed;
        journal.error_message = Some(error.clone());
        journal.touch();
        journal::persist(&task_root, &journal)?;
        return Err(error);
      }
    }
    let cache_complete = journal.committed_step >= journal.total_count;
    let spool_window = install_spool_window(&plan.assets, concurrency, cache_complete);
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
    let summary = journal.summary();
    let retry_budget_exhausted =
      journal.install_auto_stall_retry_count >= INSTALL_AUTO_STALL_RETRY_LIMIT;
    let paused = Arc::new(AtomicBool::new(false));
    let paused_slot = Arc::new(Mutex::new(Arc::clone(&paused)));
    let manual_pause_requested = Arc::new(AtomicBool::new(false));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: Arc::clone(&paused_slot),
      manual_pause_requested: Arc::clone(&manual_pause_requested),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    emit_state(&app_handle, &summary);
    let context = InstallContext { preserve_chunks, ..context };
    tauri::async_runtime::spawn(async move {
      let _reservation = reservation;
      run_install_streaming_supervisor(
        app_handle.clone(),
        task_root.clone(),
        cache_root,
        spool_root,
        plan,
        download_client,
        shared_journal,
        canceled,
        paused_slot,
        manual_pause_requested,
        concurrency,
        options.max_bytes_per_second,
        context,
        retry_budget_exhausted,
      )
      .await;
    });
    Ok(summary)
  }

  /// 启动换服任务的下载、准备与提交。
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
      if incomplete
        .iter()
        .any(|journal| journal.plan_id != plan.plan_id() && !journal.state.is_history_terminal())
      {
        return Err("该游戏安装已有未完成的资源任务，暂时不能换服".to_string());
      }
    }
    let reservation =
      TaskReservation::acquire(Arc::clone(&self.active), plan.installation_id(), plan.plan_id())?;
    let canceled = reservation.canceled_flag();
    let mut journal = switch::load_or_create_switch_journal(&task_root, &plan)?;
    if journal.state.blocks_launch() && !recovering {
      return Err("检测到未完成的换服提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的换服任务，请使用恢复操作继续".to_string());
    }
    journal.resume_elapsed();
    journal.state = PackageTaskState::Queued;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(&task_root, &journal)?;
    let summary = journal.summary();
    let paused = Arc::new(AtomicBool::new(false));
    let paused_slot = Arc::new(Mutex::new(Arc::clone(&paused)));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
    let task = ActiveTask {
      installation_id: plan.installation_id().to_string(),
      canceled: Arc::clone(&canceled),
      paused: paused_slot,
      manual_pause_requested: Arc::new(AtomicBool::new(false)),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id().to_string(), task);
    }
    emit_state(&app_handle, &summary);
    tauri::async_runtime::spawn(async move {
      let _reservation = reservation;
      run_switch(app_handle, task_root, installation, plan, shared_journal, canceled).await;
    });
    Ok(summary)
  }

  /// 恢复或回滚换服提交。
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

  /// 请求取消任务，并发布产生的状态变化。
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

  /// 暂停安装、配音、正式更新或预下载的资源下载，以及安装/配音/正式更新的组装。
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
        return Err("资源任务身份不匹配".to_string());
      }
      if journal.state == PackageTaskState::Paused {
        return Ok(journal.summary());
      }
      return Err("资源任务当前不在下载中".to_string());
    };
    if task.installation_id != installation_id {
      return Err("资源任务身份不匹配".to_string());
    }
    // 先通知下载 worker 停止，再等待高频更新的任务日志锁。否则流水线越繁忙，
    // 暂停命令越容易长期排在进度更新之后，前端也会一直停留在加载态。
    let (paused, was_paused, mut journal_value) = signal_pause_and_lock_journal(&task).await?;
    let can_pause = match journal_value.target {
      PackagePlanTarget::Install | PackagePlanTarget::Audio | PackagePlanTarget::Main => matches!(
        journal_value.state,
        PackageTaskState::Queued | PackageTaskState::Downloading | PackageTaskState::Assembling
      ),
      PackagePlanTarget::PreDownload => {
        matches!(journal_value.state, PackageTaskState::Queued | PackageTaskState::Downloading)
      }
      PackagePlanTarget::Switch => false,
    };
    if !can_pause {
      paused.store(was_paused, Ordering::Release);
      return Err("当前资源任务不能暂停".to_string());
    }
    if journal_value.installation_id != installation_id {
      paused.store(was_paused, Ordering::Release);
      return Err("资源任务身份不匹配".to_string());
    }
    if journal_value.state == PackageTaskState::Paused {
      return Ok(journal_value.summary());
    }
    let previous_state = journal_value.state;
    journal_value.state = PackageTaskState::Paused;
    journal_value.current_file = None;
    journal_value.bytes_per_second = 0;
    journal_value.eta_seconds = None;
    journal_value.error_message = None;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      paused.store(was_paused, Ordering::Release);
      journal_value.state = previous_state;
      return Err(error);
    }
    let summary = journal_value.summary();
    emit_progress(app_handle, &summary);
    emit_state(app_handle, &summary);
    Ok(summary)
  }

  /// 等待指定资源 worker 退出，避免恢复或删除与旧 worker 并发操作日志和缓存。
  pub(crate) async fn wait_for_task_idle(&self, task_id: &str) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
      let running = {
        let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
        active.by_task.contains_key(task_id)
          || active.by_installation.values().any(|reservation| reservation.task_id == task_id)
      };
      if !running {
        return Ok(());
      }
      if Instant::now() >= deadline {
        return Err("资源任务仍在停止，请稍后重试".to_string());
      }
      tokio::time::sleep(Duration::from_millis(50)).await;
    }
  }

  /// 若指定任务仍在运行，请求它在安全边界取消。
  pub(crate) fn cancel_if_running(&self, task_id: &str) -> Result<bool, String> {
    let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    if let Some(task) = active.by_task.get(task_id) {
      task.canceled.store(true, Ordering::Release);
      return Ok(true);
    }
    if let Some(reservation) =
      active.by_installation.values().find(|reservation| reservation.task_id == task_id)
    {
      reservation.canceled.store(true, Ordering::Release);
      return Ok(true);
    }
    Ok(false)
  }

  /// 请求运行中任务取消；若已不在运行，则直接回滚下载并返回状态。
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
      if let Some(reservation) =
        active.by_installation.values().find(|reservation| reservation.task_id == task_id)
      {
        reservation.canceled.store(true, Ordering::Release);
        return Ok(None);
      }
    }
    let journal = journal::load(&journal::journal_path(task_root, task_id))?;
    if journal.state.is_history_terminal() {
      return Ok(Some(journal.summary()));
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    Ok(Some(self.rollback_download(task_root, task_id)?))
  }

  /// 应用已就绪的资源计划；必要时转入修复并最终同步语音包登记。
  /// @since Beta v0.13.0
  pub(crate) fn apply(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    plan: PersistedPlan,
    registration_pool: sqlx::SqlitePool,
  ) -> Result<PackageTaskSummary, String> {
    if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      || plan.inventory.is_empty()
    {
      return Err("当前只能应用包含完整目标清单的资源计划".to_string());
    }
    if self.verify.is_running(&installation.id)? {
      return Err("该游戏安装正在校验完整性，请等待完成或取消后再应用更新".to_string());
    }
    let reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?
        .with_defender_cleanup(&task_root, plan.target);
    if plan.target == PackagePlanTarget::Main {
      defender::require_registry(&task_root, &plan.plan_id)?;
    }
    let canceled = reservation.canceled_flag();
    if is_game_running() {
      return Err("游戏仍在运行，无法应用资源更新".to_string());
    }
    let mut journal_value = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?;
    if journal_value.ensure_update_commit_progress(&plan) {
      journal_value.touch();
      journal::persist(&task_root, &journal_value)?;
    }
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
    let registration_game_root = game_root.clone();
    let summary = journal_value.summary();
    let paused = Arc::new(AtomicBool::new(false));
    let paused_slot = Arc::new(Mutex::new(Arc::clone(&paused)));
    let shared_journal = Arc::new(AsyncMutex::new(journal_value));
    let task = ActiveTask {
      installation_id: plan.installation_id.clone(),
      canceled: Arc::clone(&canceled),
      paused: paused_slot,
      manual_pause_requested: Arc::new(AtomicBool::new(false)),
      journal: Arc::clone(&shared_journal),
    };
    {
      let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      active.by_task.insert(plan.plan_id.clone(), task);
    }
    let worker_journal = Arc::clone(&shared_journal);
    tauri::async_runtime::spawn(async move {
      let _reservation = reservation;
      let worker_app_handle = app_handle.clone();
      let canceled_flag = Arc::clone(&canceled);
      let snapshot = Arc::clone(&worker_journal);
      let apply_heartbeat_stop = spawn_apply_heartbeat(
        worker_app_handle.clone(),
        Arc::clone(&snapshot),
        Arc::clone(&canceled_flag),
      );
      let mut completed = false;
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
            completed = true;
          }
          Ok(Ok(committer::ApplyOutcome::RepairNeeded)) => {}
          Ok(Ok(committer::ApplyOutcome::PrepareNeeded)) => {
            apply_heartbeat_stop.store(true, Ordering::Release);
            if let Err(error) = apply_main_after_download(
              worker_app_handle.clone(),
              task_root.clone(),
              game_root.clone(),
              plan.clone(),
              Arc::clone(&snapshot),
              Arc::clone(&canceled_flag),
              installation.clone(),
              Arc::clone(&paused),
              default_concurrency(),
              None,
            )
            .await
            {
              log::warn!("[game-package] 重新准备资源任务失败：{error}");
            }
            return;
          }
          Ok(Err(error)) => {
            log::warn!("[game-package] 应用资源任务失败：{error}");
            return;
          }
          Err(error) => {
            log::error!("[game-package] 应用资源任务异常退出：{error}");
            return;
          }
        }
      }
      if !completed {
        if let Err(error) = continue_repair(
          worker_app_handle.clone(),
          task_root.clone(),
          game_root,
          installation,
          plan.clone(),
          Arc::clone(&snapshot),
          canceled_flag,
        )
        .await
        {
          log::warn!("[game-package] 修复资源任务失败：{error}");
          return;
        }
      }
      let should_finalize_audio = plan.target == PackagePlanTarget::Audio
        && snapshot.lock().await.state == PackageTaskState::RegistrationPending;
      if should_finalize_audio
        && let Err(error) = finalize_audio_registration(
          &worker_app_handle,
          &task_root,
          &registration_pool,
          &plan,
          &registration_game_root,
          &snapshot,
        )
        .await
      {
        log::warn!("[game-package] 同步语音包安装记录失败：{error}");
      }
      apply_heartbeat_stop.store(true, Ordering::Release);
    });
    Ok(summary)
  }

  /// 恢复或回滚资源提交。
  /// @since Beta v0.13.0
  pub(crate) async fn rollback_apply(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    game_root: PathBuf,
    plan: PersistedPlan,
    repair_plan: Option<PersistedPlan>,
    retry: bool,
    recovery_progress: Option<Channel<PackageRecoveryProgress>>,
  ) -> Result<PackageTaskSummary, String> {
    let active = Arc::clone(&self.active);
    tauri::async_runtime::spawn_blocking(move || {
      let _reservation = TaskReservation::acquire(active, &plan.installation_id, &plan.plan_id)?
        .with_defender_cleanup(&task_root, plan.target);
      if is_game_running() {
        return Err("游戏仍在运行，无法恢复资源提交".to_string());
      }
      let mut journal_value = journal::load(&journal::journal_path(&task_root, &plan.plan_id))?;
      let progress_task_id = plan.plan_id.clone();
      committer::rollback_apply(
        &plan,
        repair_plan.as_ref(),
        &game_root,
        &task_root,
        &mut journal_value,
        retry,
        |journal| {
          emit_state(&app_handle, &journal.summary());
        },
        |completed, total, current_file| {
          let Some(channel) = &recovery_progress else {
            return;
          };
          let total_steps = if retry { 4 } else { 1 };
          let message = if completed == 0 {
            "正在核对未完成的资源提交".to_string()
          } else {
            format!("正在恢复资源 {completed}/{total}：{current_file}")
          };
          let _ = channel.send(PackageRecoveryProgress {
            task_id: progress_task_id.clone(),
            step: 1,
            total_steps,
            scanned_objects: completed,
            total_objects: total,
            confirmed_bytes: 0,
            message,
          });
        },
      )?;
      Ok(journal_value.summary())
    })
    .await
    .map_err(|error| format!("资源提交恢复线程异常退出：{error}"))?
  }

  /// 启动游戏完整性校验。
  pub(crate) fn start_verify(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    installation: GameInstallation,
    branches: super::hoyoplay::GameBranches,
  ) -> Result<PackageVerifySummary, String> {
    if self.verify.is_running(&installation.id)? {
      return self
        .verify
        .status(&task_root, &installation.id)?
        .ok_or_else(|| "完整性校验运行状态不可用".to_string());
    }
    let reservation = match TaskReservation::acquire(
      Arc::clone(&self.active),
      &installation.id,
      &format!("verify:{}", installation.id),
    ) {
      Ok(reservation) => reservation,
      Err(error) => {
        if self.verify.is_running(&installation.id)? {
          return self
            .verify
            .status(&task_root, &installation.id)?
            .ok_or_else(|| "完整性校验运行状态不可用".to_string());
        }
        return Err(error);
      }
    };
    verify::start_verify(&self.verify, app_handle, task_root, installation, branches, reservation)
  }

  /// 查询指定安装的完整性校验状态。
  pub(crate) fn verify_status(
    &self,
    task_root: &Path,
    installation_id: &str,
  ) -> Result<Option<PackageVerifySummary>, String> {
    self.verify.status(task_root, installation_id)
  }

  /// 取消指定安装的完整性校验。
  pub(crate) fn cancel_verify(&self, installation_id: &str) -> Result<(), String> {
    self.verify.cancel(installation_id)
  }

  /// 清除指定安装的完整性校验状态。
  pub(crate) fn clear_verify(&self, task_root: &Path, installation_id: &str) -> Result<(), String> {
    self.verify.clear(task_root, installation_id)
  }

  /// 为游戏启动预留安装互斥。
  pub(crate) fn reserve_installation(
    &self,
    installation_id: &str,
  ) -> Result<TaskReservation, String> {
    self.reserve_installation_operation(installation_id, "game-launch")
  }

  /// 为一次性安装操作预留互斥。
  pub(crate) fn reserve_installation_operation(
    &self,
    installation_id: &str,
    operation: &str,
  ) -> Result<TaskReservation, String> {
    TaskReservation::acquire(Arc::clone(&self.active), installation_id, operation)
  }

  /// 启动请求失败后，在安装空闲时接管未启动或终态更新的排除清理。
  /// @since Beta v0.13.0
  pub(crate) fn cleanup_unstarted_update_exclusions(
    &self,
    task_root: &Path,
    plan_id: &str,
  ) -> Result<(), String> {
    let plan = load_persisted_plan(task_root, plan_id)?;
    if plan.target != PackagePlanTarget::Main {
      return Ok(());
    }
    let _reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, plan_id)?
        .with_defender_cleanup(task_root, plan.target);
    Ok(())
  }

  /// 预留游戏资源缓存清理互斥。
  pub(crate) fn reserve_cache_clear(&self) -> Result<CacheClearReservation, String> {
    let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    if active.cache_clear_active {
      return Err("游戏资源缓存已经在清理".to_string());
    }
    if !active.by_task.is_empty() || !active.by_installation.is_empty() {
      return Err("还有资源任务正在运行，请等待完成后再清理缓存".to_string());
    }
    active.cache_clear_active = true;
    Ok(CacheClearReservation { active: Arc::clone(&self.active) })
  }

  /// 列出指定安装的资源任务安全投影。
  ///
  /// @since Beta v0.13.0
  pub(crate) async fn list(
    &self,
    task_root: &Path,
    installation_id: Option<&str>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let journals = journal::scan_records(task_root)?
      .into_iter()
      .filter_map(|record| match record {
        journal::TaskDirectoryRecord::Journal(journal) => Some(journal),
        _ => None,
      })
      .filter(|journal| installation_id.is_none_or(|id| id == journal.installation_id))
      .collect();
    self.list_from_journals(journals, installation_id).await
  }

  /// 列出任务记录，包含 journal、plan-only 与无效记录。
  pub(crate) async fn record_list(
    &self,
    task_root: &Path,
  ) -> Result<Vec<PackageTaskRecord>, String> {
    let disk_records = journal::scan_records(task_root)?;
    let journals = disk_records
      .iter()
      .filter_map(|record| match record {
        journal::TaskDirectoryRecord::Journal(journal) => Some(journal.clone()),
        _ => None,
      })
      .collect::<Vec<_>>();
    let mut summaries = self
      .list_from_journals(journals, None)
      .await?
      .into_iter()
      .map(|summary| (summary.task_id.clone(), summary))
      .collect::<HashMap<_, _>>();
    let mut records = Vec::with_capacity(disk_records.len());
    for record in disk_records {
      match record {
        journal::TaskDirectoryRecord::Journal(journal) => {
          if let Some(summary) = summaries.remove(&journal.task_id) {
            records.push(PackageTaskRecord {
              task_id: summary.task_id.clone(),
              kind: PackageTaskRecordKind::Task,
              updated_at: summary.updated_at.clone(),
              task: Some(summary),
              plan_bytes: 0,
              issue_message: None,
            });
          } else {
            records.push(PackageTaskRecord {
              task_id: journal.task_id,
              kind: PackageTaskRecordKind::Invalid,
              task: None,
              updated_at: journal.updated_at,
              plan_bytes: 0,
              issue_message: Some("无法生成任务安全投影".to_string()),
            });
          }
        }
        journal::TaskDirectoryRecord::PlanOnly { task_id, updated_at, plan_bytes } => {
          records.push(PackageTaskRecord {
            task_id,
            kind: PackageTaskRecordKind::PlanOnly,
            task: None,
            updated_at,
            plan_bytes,
            issue_message: None,
          });
        }
        journal::TaskDirectoryRecord::Invalid { task_id, updated_at, issue_message } => {
          records.push(PackageTaskRecord {
            task_id,
            kind: PackageTaskRecordKind::Invalid,
            task: None,
            updated_at,
            plan_bytes: 0,
            issue_message: Some(issue_message),
          });
        }
      }
    }
    records.extend(summaries.into_values().map(|summary| PackageTaskRecord {
      task_id: summary.task_id.clone(),
      kind: PackageTaskRecordKind::Task,
      updated_at: summary.updated_at.clone(),
      task: Some(summary),
      plan_bytes: 0,
      issue_message: None,
    }));
    records.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(records)
  }

  /// 新计划落盘并被页面接管后，清理同安装、同目标且未被其他生命周期引用的旧计划。
  pub(crate) fn cleanup_superseded_plans(
    &self,
    task_root: &Path,
    current_plan_id: &str,
  ) -> Result<PackageTaskCleanupSummary, String> {
    let Some(current) = plan_lifecycle::load_metadata(task_root, current_plan_id)? else {
      return Ok(empty_task_cleanup_summary());
    };
    with_active_task_ids(&self.active, |active_ids| {
      let mut protected_ids = persistent_plan_references(task_root)?;
      protected_ids.extend(active_ids.iter().cloned());
      protected_ids.insert(current_plan_id.to_string());
      let mut removable_ids = Vec::new();
      for record in journal::scan_records(task_root)? {
        let journal::TaskDirectoryRecord::PlanOnly { task_id, .. } = record else {
          continue;
        };
        if protected_ids.contains(&task_id) {
          continue;
        }
        let Some(candidate) = plan_lifecycle::load_metadata(task_root, &task_id)? else {
          continue;
        };
        if candidate.installation_id == current.installation_id
          && candidate.target == current.target
        {
          removable_ids.push(task_id);
        }
      }
      cleanup_plan_only_records(task_root, active_ids, removable_ids)
    })
  }

  /// 应用启动后，页面内存引用已失效；只保留草稿、换服与正式任务仍引用的计划。
  pub(crate) fn cleanup_expired_plans(
    &self,
    task_root: &Path,
  ) -> Result<PackageTaskCleanupSummary, String> {
    with_active_task_ids(&self.active, |active_ids| {
      let mut protected_ids = persistent_plan_references(task_root)?;
      protected_ids.extend(active_ids.iter().cloned());
      let removable_ids = journal::scan_records(task_root)?
        .into_iter()
        .filter_map(|record| match record {
          journal::TaskDirectoryRecord::PlanOnly { task_id, .. }
            if !protected_ids.contains(&task_id) =>
          {
            Some(task_id)
          }
          _ => None,
        })
        .collect::<Vec<_>>();
      cleanup_plan_only_records(task_root, active_ids, removable_ids)
    })
  }

  /// 预留任务记录变更互斥。
  pub(crate) fn reserve_task_record_operation(
    &self,
    task_id: &str,
  ) -> Result<TaskRecordOperation, String> {
    TaskRecordOperation::acquire(Arc::clone(&self.active), task_id)
  }

  /// 删除指定任务记录及其 sidecar。
  pub(crate) fn remove_task(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskCleanupSummary, String> {
    let task_id =
      Uuid::parse_str(task_id).map_err(|_| "任务 ID 无效：必须是 UUID".to_string())?.to_string();
    let _record_operation = self.reserve_task_record_operation(&task_id)?;
    let mut active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
    let active_ids = active_task_ids(&active);
    if active_ids.contains(&task_id) {
      return Err("任务仍在运行，无法删除任务记录".to_string());
    }
    active.retired_task_ids.insert(task_id.clone());
    let result = (|| {
      let journals = journal::scan_records(task_root)?
        .into_iter()
        .filter_map(|record| match record {
          journal::TaskDirectoryRecord::Journal(journal) => Some(journal),
          _ => None,
        })
        .collect::<Vec<_>>();
      let plan_only = !journals.iter().any(|journal| journal.task_id == task_id);
      let removable = journals.iter().find(|journal| journal.task_id == task_id);
      let mut summary = journal::cleanup_task_record(task_root, &active_ids, &task_id)?;
      // 记录删除后该计划在游戏目录中的事务目录不再有所有者：只要任务已终结，就一并回收，
      // 避免边下边组装留下的成品长期占用游戏盘。
      if summary.removed_task_ids.iter().any(|id| id == &task_id)
        && let Some(journal) = removable
        && journal.state.is_history_terminal()
        && let Some(game_root) = journal.game_root.as_deref()
      {
        match committer::discard_transaction_directory(&task_id, Path::new(game_root)) {
          Ok(bytes) if bytes > 0 => {
            summary.removed_bytes = summary.removed_bytes.saturating_add(bytes);
            log::info!("[game-package][{task_id}] 删除任务记录时回收游戏目录事务 {bytes} 字节");
          }
          Ok(_) => {}
          Err(error) => {
            log::warn!("[game-package][{task_id}] 清理游戏目录事务失败：{error}");
          }
        }
      }
      let retained = journals
        .iter()
        .filter(|journal| !summary.removed_task_ids.contains(&journal.task_id))
        .cloned()
        .collect::<Vec<_>>();
      cleanup_finished_task_sidecars(task_root, &journals, &retained);
      if plan_only && summary.removed_count > 0 {
        cleanup_plan_only_sidecars(task_root, &task_id);
      }
      Ok(summary)
    })();
    if result
      .as_ref()
      .map_or(true, |summary: &PackageTaskCleanupSummary| summary.removed_count == 0)
    {
      active.retired_task_ids.remove(&task_id);
    }
    result
  }

  /// 回收不再被任何任务记录或运行中任务引用的游戏目录事务目录。
  ///
  /// 正式更新与配音包变更边下边组装，成品落在 `<游戏根>/.teyvatguide-update/<planId>`；
  /// 任务记录被删除、计划被清理后这些目录不再有所有者，需要启动时兜底回收。
  ///
  /// @since Beta v0.12.3
  ///
  /// # 参数
  /// - `task_root`: 任务根目录。
  /// - `game_roots`: 已知游戏安装根目录。
  ///
  /// # 返回
  /// - `Ok(PackageTaskCleanupSummary)`: 回收的目录数与字节数。
  /// - `Err(String)`: 读取任务记录失败的错误描述。
  pub(crate) fn cleanup_orphan_transactions(
    &self,
    task_root: &Path,
    game_roots: &[PathBuf],
  ) -> Result<PackageTaskCleanupSummary, String> {
    with_active_task_ids(&self.active, |active_ids| {
      let mut summary = empty_task_cleanup_summary();
      if game_roots.is_empty() {
        return Ok(summary);
      }
      let mut protected = persistent_plan_references(task_root)?;
      protected.extend(active_ids.iter().cloned());
      for record in journal::scan_records(task_root)? {
        match record {
          journal::TaskDirectoryRecord::Journal(journal) => {
            protected.insert(journal.task_id);
          }
          journal::TaskDirectoryRecord::PlanOnly { task_id, .. }
          | journal::TaskDirectoryRecord::Invalid { task_id, .. } => {
            protected.insert(task_id);
          }
        }
      }
      for game_root in game_roots {
        let entries = match fs::read_dir(committer::transaction_root(game_root)) {
          Ok(entries) => entries,
          Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
          Err(error) => {
            log::warn!("[game-package] 读取游戏目录事务失败：{error}");
            continue;
          }
        };
        for entry in entries {
          let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
              log::warn!("[game-package] 读取游戏目录事务项失败：{error}");
              continue;
            }
          };
          let task_id = entry.file_name().to_string_lossy().into_owned();
          if Uuid::parse_str(&task_id).is_err() || protected.contains(&task_id) {
            continue;
          }
          match committer::discard_transaction_directory(&task_id, game_root) {
            Ok(bytes) if bytes > 0 => {
              summary.removed_count += 1;
              summary.removed_bytes = summary.removed_bytes.saturating_add(bytes);
              summary.removed_task_ids.push(task_id.clone());
              log::info!("[game-package][{task_id}] 启动清理回收游戏目录事务 {bytes} 字节");
            }
            Ok(_) => {}
            Err(error) => {
              log::warn!("[game-package][{task_id}] 清理游戏目录事务失败：{error}");
            }
          }
        }
      }
      Ok(summary)
    })
  }

  /// 把磁盘 journal 与活动任务合并为按更新时间倒序的安全投影。
  async fn list_from_journals(
    &self,
    journals: Vec<TaskJournal>,
    installation_id: Option<&str>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let live_ids = {
      let active = self.active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
      let mut ids = active.by_task.keys().cloned().collect::<HashSet<_>>();
      ids.extend(active.by_installation.values().map(|reservation| reservation.task_id.clone()));
      ids
    };
    let mut summaries = HashMap::new();
    for mut journal in journals {
      let interrupted = journal.state.is_active() && !live_ids.contains(&journal.task_id);
      let _elapsed_frozen = interrupted && journal.freeze_elapsed_at_updated_at();
      let abandoned_download = interrupted
        && matches!(journal.state, PackageTaskState::Queued | PackageTaskState::Downloading);
      if abandoned_download {
        journal.state = PackageTaskState::Failed;
        journal.error_message = Some("资源任务已中断，请恢复或放弃".to_string());
        journal.current_file = None;
      }
      // `list` 只生成恢复投影，不再依据可能过期的 active 快照写回 journal。
      // worker 或显式恢复命令是生命周期状态的唯一持久化写入者。
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

  /// 按最长保留时长清理已结束任务。
  pub(crate) fn cleanup_tasks(
    &self,
    task_root: &Path,
    max_age: Option<ChronoDuration>,
  ) -> Result<PackageTaskCleanupSummary, String> {
    with_active_task_ids(&self.active, |active_ids| {
      let journals = journal::scan_records(task_root)?
        .into_iter()
        .filter_map(|record| match record {
          journal::TaskDirectoryRecord::Journal(journal) => Some(journal),
          _ => None,
        })
        .collect::<Vec<_>>();
      let (summary, retained) = journal::cleanup_terminal_tasks_from_journals(
        task_root,
        active_ids,
        max_age,
        journals.clone(),
      )?;
      cleanup_finished_task_sidecars(task_root, &journals, &retained);
      Ok(summary)
    })
  }

  /// 放弃仍在下载中的任务并还原相关中间状态。
  /// @since Beta v0.13.0
  pub(crate) fn rollback_download(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    let path = journal::journal_path(task_root, task_id);
    let identity = journal::load(&path)?;
    let _reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &identity.installation_id, task_id)
        .map_err(|_| "任务仍在运行，请先请求取消并等待安全边界".to_string())?
        .with_defender_cleanup(task_root, identity.target);
    let mut journal = journal::load(&path)?;
    if journal.state == PackageTaskState::Completed {
      return Err("资源任务已经完成".to_string());
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    restore_prep_staged_audio_deletions(task_root, &mut journal)?;
    // 正式更新与配音包变更会边下边组装，组装成品直接写入游戏目录事务目录；
    // 放弃任务时必须整目录回收，避免残留占用游戏盘。
    if let Some(game_root) = journal.game_root.as_deref()
      && let Err(error) =
        committer::discard_transaction_directory(&journal.plan_id, Path::new(game_root))
    {
      log::warn!("[game-package] 放弃任务时清理游戏目录事务失败：{error}");
    }
    cleanup_task_partials(&task_root.join("cache/chunks"), task_id)?;
    cleanup_task_partials(&task_root.join("cache/sdks"), task_id)?;
    journal.state = PackageTaskState::Abandoned;
    journal.error_message = None;
    journal.current_file = None;
    journal.touch();
    journal::persist(task_root, &journal)?;
    Ok(journal.summary())
  }
}

/// 任务记录删除后清理已结束、且不再被未完成任务使用的 sidecar。
fn cleanup_finished_task_sidecars(
  task_root: &Path,
  before: &[TaskJournal],
  retained: &[TaskJournal],
) {
  let retained_ids =
    retained.iter().map(|journal| journal.task_id.as_str()).collect::<HashSet<_>>();
  for journal in before.iter().filter(|journal| !retained_ids.contains(journal.task_id.as_str())) {
    if journal.target == PackagePlanTarget::Switch
      && let Err(error) =
        switch::remove_finished_switch_dir(task_root, &journal.installation_id, &journal.plan_id)
    {
      log::warn!("[game-package][{}] 清理换服计划目录失败：{error}", journal.plan_id);
    }
    if let Err(error) = defender::cleanup_install_exclusions(task_root, &journal.plan_id) {
      log::warn!("[game-package][{}] 清理 Defender 排除登记失败：{error}", journal.plan_id);
    }
  }
  if let Err(error) = installer::sweep_terminal_drafts(task_root) {
    log::warn!("[game-package] 清理已结束安装草稿失败：{error}");
  }
}

/// 收集安装器与换服仍持久引用的计划 ID。
fn persistent_plan_references(task_root: &Path) -> Result<HashSet<String>, String> {
  let mut references = installer::referenced_plan_ids(task_root)?;
  references.extend(switch::referenced_plan_ids(task_root)?);
  Ok(references)
}

/// 逐个清理未被引用的 plan-only 记录及其 sidecar。
fn cleanup_plan_only_records(
  task_root: &Path,
  active_ids: &HashSet<String>,
  task_ids: Vec<String>,
) -> Result<PackageTaskCleanupSummary, String> {
  let mut summary = empty_task_cleanup_summary();
  for task_id in task_ids {
    let removed = journal::cleanup_task_record(task_root, active_ids, &task_id)?;
    if removed.removed_count == 0 {
      continue;
    }
    summary.removed_count += removed.removed_count;
    summary.removed_bytes = summary.removed_bytes.saturating_add(removed.removed_bytes);
    summary.removed_task_ids.extend(removed.removed_task_ids);
    cleanup_plan_only_sidecars(task_root, &task_id);
  }
  Ok(summary)
}

/// 清理未启动换服计划副本与 Defender 排除登记。
fn cleanup_plan_only_sidecars(task_root: &Path, task_id: &str) {
  if let Err(error) = switch::remove_unstarted_plan_reference(task_root, task_id) {
    log::warn!("[game-package][{task_id}] 清理未启动换服计划副本失败：{error}");
  }
  if let Err(error) = defender::cleanup_install_exclusions(task_root, task_id) {
    log::warn!("[game-package][{task_id}] 清理未启动计划的 Defender 排除失败：{error}");
  }
}

/// 构造空的任务清理摘要。
fn empty_task_cleanup_summary() -> PackageTaskCleanupSummary {
  PackageTaskCleanupSummary { removed_count: 0, removed_bytes: 0, removed_task_ids: Vec::new() }
}

/// 取消/回滚资源任务时，还原资源准备阶段前移删除移入备份目录的配音文件。
fn restore_prep_staged_audio_deletions(
  task_root: &Path,
  journal: &mut TaskJournal,
) -> Result<(), String> {
  if journal.target != PackagePlanTarget::Audio || journal.delete_completed_bytes == 0 {
    return Ok(());
  }
  if is_game_running() {
    return Err("检测到游戏进程，请先退出游戏再还原已删除的配音文件".to_string());
  }
  let Some(game_root) = journal.game_root.as_deref() else {
    return Err("配音任务缺少游戏根目录，无法还原已删除文件".to_string());
  };
  let plan = load_persisted_plan(task_root, &journal.plan_id)?;
  let game_root = Path::new(game_root);
  let backup_root = committer::prepare_audio_backup_root(game_root, &plan.plan_id)?;
  for deleted in &plan.delete_files {
    if resolve_optional_manifest_file(game_root, &deleted.name)?.is_some() {
      continue;
    }
    let Some(backup) = resolve_optional_manifest_file(&backup_root, &deleted.name)? else {
      continue;
    };
    let target = prepare_manifest_output_file(game_root, &deleted.name)?;
    fs::rename(&backup, &target)
      .map_err(|error| format!("还原已删除的配音文件失败：{}：{error}", deleted.name))?;
  }
  journal.delete_completed_bytes = 0;
  journal.touch();
  journal::persist(task_root, journal)?;
  Ok(())
}
struct UpdateSpaceReservation {
  cache_root: PathBuf,
  game_root: PathBuf,
  cache_remaining: u64,
  incoming_remaining: u64,
}

static UPDATE_SPACE_RESERVATIONS: LazyLock<Mutex<HashMap<String, UpdateSpaceReservation>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

struct UpdateSpaceGuard(String);

impl Drop for UpdateSpaceGuard {
  fn drop(&mut self) {
    if let Ok(mut values) = UPDATE_SPACE_RESERVATIONS.lock() {
      values.remove(&self.0);
    }
  }
}

/// 同卷主任务共享尚未完成的写入预算。完成对象后释放预留；部分写入暂按保守上界保留。
fn reserve_update_space(task_id: &str, candidate: UpdateSpaceReservation) -> Result<(), String> {
  let mut values =
    UPDATE_SPACE_RESERVATIONS.lock().map_err(|_| "更新空间预算锁已损坏".to_string())?;
  check_update_space(&values, task_id, &candidate)?;
  values.insert(task_id.to_string(), candidate);
  Ok(())
}

fn check_update_space(
  values: &HashMap<String, UpdateSpaceReservation>,
  task_id: &str,
  candidate: &UpdateSpaceReservation,
) -> Result<(), String> {
  for root in [&candidate.cache_root, &candidate.game_root] {
    let required = values
      .iter()
      .filter(|(id, _)| id.as_str() != task_id)
      .map(|(_, value)| value)
      .chain(std::iter::once(candidate))
      .try_fold(SAFETY_MARGIN_BYTES, |sum, value| {
        let cache = if same_volume(root, &value.cache_root) { value.cache_remaining } else { 0 };
        let incoming =
          if same_volume(root, &value.game_root) { value.incoming_remaining } else { 0 };
        sum
          .checked_add(cache)
          .and_then(|sum| sum.checked_add(incoming))
          .ok_or_else(|| "更新空间预算溢出".to_string())
      })?;
    let available =
      fs2::available_space(root).map_err(|error| format!("读取更新磁盘空间失败：{error}"))?;
    if available < required {
      return Err(format!(
        "更新磁盘空间不足：包含并发任务至少还需 {required} 字节，可用 {available} 字节；释放空间后恢复任务"
      ));
    }
  }
  Ok(())
}

fn release_update_space(task_id: &str, cache_bytes: u64, incoming_bytes: u64) {
  if let Ok(mut values) = UPDATE_SPACE_RESERVATIONS.lock()
    && let Some(value) = values.get_mut(task_id)
  {
    value.cache_remaining = value.cache_remaining.saturating_sub(cache_bytes);
    value.incoming_remaining = value.incoming_remaining.saturating_sub(incoming_bytes);
  }
}

/// 激活预算修改由流水线的共享互斥锁串行化，避免并发回退丢失追加预留。
fn grow_update_space(task_id: &str, additional: u64) -> Result<(), String> {
  let mut values =
    UPDATE_SPACE_RESERVATIONS.lock().map_err(|_| "更新空间预算锁已损坏".to_string())?;
  let candidate = {
    let value = values.get(task_id).ok_or_else(|| "更新任务缺少空间预留".to_string())?;
    UpdateSpaceReservation {
      cache_root: value.cache_root.clone(),
      game_root: value.game_root.clone(),
      cache_remaining: value
        .cache_remaining
        .checked_add(additional)
        .ok_or_else(|| "更新空间预算溢出".to_string())?,
      incoming_remaining: value.incoming_remaining,
    }
  };
  check_update_space(&values, task_id, &candidate)?;
  values.insert(task_id.to_string(), candidate);
  Ok(())
}

/// 首选对象始终保留；只有持久化激活的备用对象才参与缓存扫描和统计。
fn active_update_downloads(
  plan: &PersistedPlan,
  fallback_assets: &[usize],
) -> Result<Vec<PlanDownload>, String> {
  let mut downloads = plan.downloads.clone();
  let mut keys = downloads.iter().map(|item| item.cache_key.clone()).collect::<HashSet<_>>();
  if fallback_assets.is_empty() {
    return Ok(downloads);
  }
  if plan.target != PackagePlanTarget::Main {
    return Err("非正式更新任务不能激活备用资源".to_string());
  }
  let fallback =
    plan.fallback.as_ref().ok_or_else(|| "旧资源计划不支持单文件回退，请重新评估".to_string())?;
  let catalog =
    fallback.downloads.iter().map(|item| (item.id.as_str(), item)).collect::<HashMap<_, _>>();
  let mut seen_assets = HashSet::new();
  for index in fallback_assets {
    if !seen_assets.insert(*index) {
      return Err("资源回退记录包含重复索引".to_string());
    }
    let asset = fallback.assets.get(*index).ok_or_else(|| "资源回退索引越界".to_string())?;
    if plan.assets.get(*index).is_none_or(|primary| primary.name != asset.name) {
      return Err("备用资源与原计划不匹配".to_string());
    }
    for chunk in &asset.chunks {
      let item =
        catalog.get(chunk.id.as_str()).ok_or_else(|| "备用资源缺少下载对象".to_string())?;
      if keys.insert(item.cache_key.clone()) {
        downloads.push((*item).clone());
      }
    }
  }
  Ok(downloads)
}

fn update_download_totals(
  journal: &mut TaskJournal,
  downloads: &[PlanDownload],
) -> Result<(), String> {
  journal.total_bytes = downloads.iter().try_fold(0_u64, |sum, item| {
    sum.checked_add(item.compressed_size).ok_or_else(|| "资源下载预算溢出".to_string())
  })?;
  journal.total_count = downloads.len();
  journal.planned_steps = downloads.len();
  Ok(())
}

/// 按计划策略映射每个配音资源所需的下载对象索引。
fn audio_asset_download_dependencies(plan: &PersistedPlan) -> Result<Vec<Vec<usize>>, String> {
  let mut downloads = HashMap::with_capacity(plan.downloads.len());
  for (index, download) in plan.downloads.iter().enumerate() {
    if downloads.insert(download.id.as_str(), index).is_some() {
      return Err(format!("配音包下载对象重复：{}", download.id));
    }
  }
  plan
    .assets
    .iter()
    .map(|asset| {
      let mut dependencies = Vec::new();
      let mut seen = HashSet::new();
      match plan.strategy {
        PackagePlanStrategy::ManifestDiff => {
          for chunk in &asset.chunks {
            if chunk.reuse.is_some() || !seen.insert(chunk.id.as_str()) {
              continue;
            }
            dependencies.push(
              *downloads
                .get(chunk.id.as_str())
                .ok_or_else(|| format!("配音资源缺少下载对象：{}", chunk.id))?,
            );
          }
        }
        PackagePlanStrategy::Patch => {
          let patch = asset
            .patch
            .as_ref()
            .ok_or_else(|| format!("配音资源缺少 patch 元数据：{}", asset.name))?;
          dependencies.push(
            *downloads
              .get(patch.id.as_str())
              .ok_or_else(|| format!("配音资源缺少 patch 下载对象：{}", patch.id))?,
          );
        }
        PackagePlanStrategy::Full => {
          return Err("配音包流水线不支持全量安装计划".to_string());
        }
      }
      Ok(dependencies)
    })
    .collect()
}

/// 为指定配音资源生成待下载对象列表；缓存命中或已可用时跳过。
/// @since Beta v0.13.0
fn prepare_audio_asset_job(
  plan: &PersistedPlan,
  asset_index: usize,
  dependencies: &[Vec<usize>],
  available_downloads: &HashSet<usize>,
) -> AudioAssetJob {
  let pending = dependencies
    .get(asset_index)
    .into_iter()
    .flatten()
    .copied()
    .filter_map(|index| {
      if available_downloads.contains(&index) {
        return None;
      }
      let download = plan.downloads.get(index)?.clone();
      Some((index, download))
    })
    .collect();
  AudioAssetJob { asset_index, pending }
}

#[allow(clippy::too_many_arguments)]
/// 占用组装槽并在后台完成单个配音资源组装与证据落盘。
/// @since Beta v0.13.0
async fn assemble_audio_asset(
  events: TaskEventDispatcher,
  task_root: PathBuf,
  game_root: PathBuf,
  output_root: PathBuf,
  plan: Arc<PersistedPlan>,
  asset_index: usize,
  fallback: bool,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  assembly_slots: Arc<Semaphore>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
  overlay: Arc<AudioLiveAssemblyOverlay>,
) -> Result<assembler::AssetAssemblyOutcome, String> {
  let permit = match assembly_slots.acquire_owned().await {
    Ok(permit) => permit,
    Err(error) => return Err(format!("获取配音组装并发槽位失败：{error}")),
  };
  let (summary, write_progress) = {
    let mut value = journal.lock().await;
    let write_progress = overlay.begin_attempt(asset_index, plan.assets[asset_index].size);
    value.active_assembly_count = value.active_assembly_count.saturating_add(1);
    value.assembly_current_file = Some(plan.assets[asset_index].name.clone());
    value.current_file = value.assembly_current_file.clone();
    value.touch();
    (overlay.overlay(&value), write_progress)
  };
  events.publish_progress(summary);
  let attempt_telemetry = telemetry.with_write_progress(write_progress);
  let worker = if plan.target == PackagePlanTarget::Main {
    spawn_main_update_assembly_worker(
      Arc::clone(&plan),
      asset_index,
      fallback,
      game_root,
      task_root.clone(),
      output_root,
      Arc::clone(&canceled),
      Arc::clone(&attempt_telemetry),
    )
  } else {
    let worker_plan = Arc::clone(&plan);
    let worker_task_root = task_root.clone();
    let worker_output_root = output_root;
    let worker_canceled = Arc::clone(&canceled);
    let worker_telemetry = Arc::clone(&attempt_telemetry);
    spawn_assembly_worker(&plan.plan_id, move || {
      assembler::assemble_plan_asset_to_root(
        &worker_plan,
        asset_index,
        &game_root,
        &worker_task_root,
        &worker_output_root,
        &worker_canceled,
        Some(&worker_telemetry),
      )?;
      evidence::capture_and_persist_asset_evidence(
        &worker_task_root,
        &worker_plan,
        asset_index,
        &worker_output_root,
      )?;
      Ok::<_, String>(assembler::AssetAssemblyOutcome::Assembled)
    })
  };
  let result = worker
    .await
    .map_err(|error| format!("资源组装 worker 异常退出：{error}"))
    .and_then(|result| result);
  drop(permit);
  let summary = {
    let mut value = journal.lock().await;
    value.active_assembly_count = value.active_assembly_count.saturating_sub(1);
    if !matches!(result, Ok(assembler::AssetAssemblyOutcome::Assembled)) {
      overlay.clear_asset(asset_index);
    }
    if matches!(result, Ok(assembler::AssetAssemblyOutcome::AlreadyTarget)) {
      if !value.already_target_assets.contains(&asset_index) {
        value.already_target_assets.push(asset_index);
        value.already_target_assets.sort_unstable();
      }
      value.requires_full_verification = true;
      value.touch();
      journal::persist(&task_root, &value)?;
    }
    value.touch();
    overlay.overlay(&value)
  };
  events.publish_progress(summary);
  result
}

#[allow(clippy::too_many_arguments)]
/// 下载并组装单个配音资源，返回该资源任务的完成结果。
/// @since Beta v0.13.0
async fn run_audio_asset_job(
  job: AudioAssetJob,
  stage: PipelineStagePermit,
  events: TaskEventDispatcher,
  task_root: PathBuf,
  cache_root: PathBuf,
  game_root: PathBuf,
  output_root: PathBuf,
  plan: Arc<PersistedPlan>,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  limiter: Arc<RateLimiter>,
  download_client: reqwest::Client,
  download_focus: Arc<Semaphore>,
  download_slots: Arc<Semaphore>,
  download_guards: Arc<AsyncMutex<HashMap<String, Arc<AsyncMutex<()>>>>>,
  assembly_slots: Arc<Semaphore>,
  download_telemetry: Option<Arc<DownloadTelemetry>>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
  overlay: Arc<AudioLiveAssemblyOverlay>,
  completed_cache_keys: Arc<Mutex<HashSet<String>>>,
  available_downloads: Arc<Mutex<HashSet<usize>>>,
  labels: Arc<HashMap<String, String>>,
  download_started_at: Instant,
) -> AudioAssetJobCompletion {
  let AudioAssetJob { asset_index, pending } = job;
  let needs_download = !pending.is_empty();
  let result = async {
    if needs_download {
      let _focus = Arc::clone(&download_focus)
        .acquire_owned()
        .await
        .map_err(|error| format!("获取配音下载焦点失败：{error}"))?;
      let downloads = stream::iter(pending.into_iter().map(|(download_index, download)| {
        let root = cache_root.clone();
        let task_id = plan.plan_id.clone();
        let canceled = Arc::clone(&canceled);
        let paused = Arc::clone(&paused);
        let limiter = Arc::clone(&limiter);
        let client = download_client.clone();
        let slots = Arc::clone(&download_slots);
        let guards = Arc::clone(&download_guards);
        let labels = Arc::clone(&labels);
        let telemetry = download_telemetry.clone();
        async move {
          let download_guard = {
            let mut values = guards.lock().await;
            Arc::clone(
              values
                .entry(download.cache_key.clone())
                .or_insert_with(|| Arc::new(AsyncMutex::new(()))),
            )
          };
          let _download_guard = download_guard.lock().await;
          if cached_chunk_matches_async(&root, &download).await {
            return Ok((download_index, None));
          }
          let permit = slots
            .acquire_owned()
            .await
            .map_err(|error| format!("获取配音下载并发槽位失败：{error}"))?;
          let current_file =
            labels.get(&download.cache_key).cloned().unwrap_or_else(|| download.id.clone());
          let control = DownloadControl::new(
            &task_id,
            &canceled,
            &paused,
            &limiter,
            DownloadDurability::Strict,
          );
          let control = match telemetry {
            Some(telemetry) => control.with_telemetry(telemetry),
            None => control,
          };
          let result = download_object(&client, &root, &download, control).await;
          drop(permit);
          result.map(|downloaded| (download_index, Some((downloaded, current_file))))
        }
      }))
      .buffer_unordered(download_slots.available_permits().max(AUDIO_DOWNLOAD_FOCUS));
      futures_util::pin_mut!(downloads);
      while let Some(download_result) = downloads.next().await {
        match download_result {
          Ok((download_index, Some((downloaded, current_file)))) => {
            available_downloads.lock().unwrap().insert(download_index);
            let summary = {
              let mut value = journal.lock().await;
              if completed_cache_keys.lock().unwrap().insert(downloaded.cache_key.clone()) {
                release_update_space(&plan.plan_id, downloaded.bytes, 0);
                value.owned_cache_files.push(downloaded.cache_key);
                value.committed_step = value.owned_cache_files.len();
                value.downloaded_bytes = value.downloaded_bytes.saturating_add(downloaded.bytes);
              }
              value.download_current_file = Some(current_file.clone());
              value.current_file = value.assembly_current_file.clone().or(Some(current_file));
              let elapsed = download_started_at.elapsed().as_secs_f64().max(0.001);
              value.bytes_per_second = (value.downloaded_bytes as f64 / elapsed) as u64;
              let remaining = value.total_bytes.saturating_sub(value.downloaded_bytes);
              value.eta_seconds =
                (value.bytes_per_second > 0).then_some(remaining / value.bytes_per_second);
              value.touch();
              if let Err(error) = journal::persist(&task_root, &value) {
                return Err(error);
              }
              overlay.overlay(&value)
            };
            events.publish_progress(summary);
          }
          Ok((download_index, None)) => {
            available_downloads.lock().unwrap().insert(download_index);
            let download = &plan.downloads[download_index];
            let mut value = journal.lock().await;
            if completed_cache_keys.lock().unwrap().insert(download.cache_key.clone()) {
              value.owned_cache_files.push(download.cache_key.clone());
              value.committed_step = value.owned_cache_files.len();
              value.downloaded_bytes =
                value.downloaded_bytes.saturating_add(download.compressed_size);
              release_update_space(&plan.plan_id, download.compressed_size, 0);
              value.touch();
              journal::persist(&task_root, &value)?;
            }
          }
          Err(error) => return Err(error),
        }
      }
    }
    // 下载名额在进入组装前释放，唤醒调度器预取下一资源。
    stage.mark_ready();
    let resumed_fallback = {
      let value = journal.lock().await;
      value.fallback_assets.contains(&asset_index)
        || value.target_reprepare_assets.contains(&asset_index)
    };
    let outcome = if resumed_fallback {
      assembler::AssetAssemblyOutcome::FallbackRequired(
        assembler::AssetFallbackReason::SourceMismatch,
      )
    } else {
      assemble_audio_asset(
        events.clone(),
        task_root.clone(),
        game_root.clone(),
        output_root.clone(),
        Arc::clone(&plan),
        asset_index,
        false,
        Arc::clone(&journal),
        Arc::clone(&canceled),
        Arc::clone(&assembly_slots),
        Arc::clone(&telemetry),
        Arc::clone(&overlay),
      )
      .await?
    };
    if let assembler::AssetAssemblyOutcome::FallbackRequired(reason) = outcome {
      stage.mark_downloading();
      let fallback_plan = fallback_asset_plan(&plan, asset_index)?;
      {
        let activation_guard = {
          let mut guards = download_guards.lock().await;
          Arc::clone(
            guards
              .entry("fallback-activation".to_string())
              .or_insert_with(|| Arc::new(AsyncMutex::new(()))),
          )
        };
        let _activation_guard = activation_guard.lock().await;
        let activated_before = journal.lock().await.fallback_assets.clone();
        if !activated_before.contains(&asset_index) {
          let before = active_update_downloads(&plan, &activated_before)?;
          let mut activated = activated_before;
          activated.push(asset_index);
          let active = active_update_downloads(&plan, &activated)?;
          let old_keys = before.iter().map(|item| item.cache_key.as_str()).collect::<HashSet<_>>();
          let mut additional = 0_u64;
          let mut cached_new = Vec::new();
          for item in active.iter().filter(|item| !old_keys.contains(item.cache_key.as_str())) {
            if cached_chunk_matches_async(&cache_root, item).await {
              cached_new.push(item);
            } else {
              additional = additional
                .checked_add(item.compressed_size)
                .ok_or_else(|| "备用下载预算溢出".to_string())?;
            }
          }
          grow_update_space(&plan.plan_id, additional)?;
          let mut value = journal.lock().await;
          value.fallback_assets = activated;
          value.target_reprepare_assets.retain(|index| *index != asset_index);
          value.already_target_assets.retain(|index| *index != asset_index);
          value.requires_full_verification = true;
          update_download_totals(&mut value, &active)?;
          value.fallback_download_bytes = value
            .total_bytes
            .saturating_sub(plan.downloads.iter().map(|item| item.compressed_size).sum::<u64>());
          for item in cached_new {
            if completed_cache_keys.lock().unwrap().insert(item.cache_key.clone()) {
              value.owned_cache_files.push(item.cache_key.clone());
              value.downloaded_bytes = value.downloaded_bytes.saturating_add(item.compressed_size);
            }
          }
          value.committed_step = value.owned_cache_files.len();
          value.touch();
          // 空间预留与激活串行化；持久化成功前不允许下载备用对象。
          journal::persist(&task_root, &value)?;
        }
        let mut value = journal.lock().await;
        value.download_current_file = Some(format!("回退下载：{}", plan.assets[asset_index].name));
        events.publish_progress(overlay.overlay(&value));
      }
      log::info!("[game-update] 文件回退：{} reason={reason:?}", plan.assets[asset_index].name);
      let _focus = download_focus
        .acquire_owned()
        .await
        .map_err(|error| format!("获取回退下载槽失败：{error}"))?;
      for download in &fallback_plan.downloads {
        if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
          return Err("资源回退已停止".to_string());
        }
        let guard = {
          let mut guards = download_guards.lock().await;
          Arc::clone(
            guards
              .entry(download.cache_key.clone())
              .or_insert_with(|| Arc::new(AsyncMutex::new(()))),
          )
        };
        let _guard = guard.lock().await;
        if !cached_chunk_matches_async(&cache_root, download).await {
          let _permit = Arc::clone(&download_slots)
            .acquire_owned()
            .await
            .map_err(|error| format!("获取回退下载并发槽失败：{error}"))?;
          let control = DownloadControl::new(
            &plan.plan_id,
            &canceled,
            &paused,
            &limiter,
            DownloadDurability::Strict,
          );
          let control = match &download_telemetry {
            Some(telemetry) => control.with_telemetry(Arc::clone(telemetry)),
            None => control,
          };
          download_object(&download_client, &cache_root, download, control).await?;
        }
        let mut value = journal.lock().await;
        if completed_cache_keys.lock().unwrap().insert(download.cache_key.clone()) {
          value.owned_cache_files.push(download.cache_key.clone());
          value.committed_step = value.owned_cache_files.len();
          value.downloaded_bytes = value.downloaded_bytes.saturating_add(download.compressed_size);
          release_update_space(&plan.plan_id, download.compressed_size, 0);
        }
        value.touch();
        journal::persist(&task_root, &value)?;
        events.publish_progress(overlay.overlay(&value));
      }
      drop(_focus);
      stage.mark_ready();
      match assemble_audio_asset(
        events,
        task_root,
        game_root,
        output_root,
        plan,
        asset_index,
        true,
        journal,
        canceled,
        assembly_slots,
        telemetry,
        overlay,
      )
      .await?
      {
        assembler::AssetAssemblyOutcome::Assembled => {}
        assembler::AssetAssemblyOutcome::AlreadyTarget => {
          return Err("完整回退组装不能跳过目标文件".to_string());
        }
        assembler::AssetAssemblyOutcome::FallbackRequired(_) => {
          return Err("完整文件回退仍依赖旧文件，请重新评估计划".to_string());
        }
      }
    }
    Ok(())
  }
  .await;
  AudioAssetJobCompletion { asset_index, result }
}

/// 按磁盘现状重建配音删除进度：游戏目录已缺失的条目视为完成，仍存在的继续删除。
fn discover_audio_delete_progress(
  plan_id: &str,
  delete_files: &[PlanDelete],
  game_root: &Path,
) -> Result<(Vec<PlanDelete>, u64), String> {
  let backup_root = committer::prepare_audio_backup_root(game_root, plan_id)?;
  let mut pending = Vec::new();
  let mut completed_bytes = 0_u64;
  for deleted in delete_files {
    if resolve_optional_manifest_file(game_root, &deleted.name)?.is_some() {
      if resolve_optional_manifest_file(&backup_root, &deleted.name)?.is_some() {
        return Err(format!("待删除配音资源同时存在于游戏目录与备份目录：{}", deleted.name));
      }
      pending.push(deleted.clone());
    } else {
      completed_bytes = completed_bytes.saturating_add(deleted.size);
    }
  }
  Ok((pending, completed_bytes))
}

/// 把准备阶段暂停原因与实时字段作为同一份日志快照更新。
/// @since Beta v0.13.0
fn mark_prepare_paused(value: &mut TaskJournal, message: &str) {
  value.state = PackageTaskState::Paused;
  value.error_message = Some(message.to_string());
  value.auto_retry_message = None;
  value.active_assembly_count = 0;
  value.current_file = None;
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.bytes_per_second = 0;
  value.eta_seconds = None;
  value.assembly_bytes_per_second = 0;
  value.assembly_eta_seconds = None;
  value.touch();
}

/// 在配音新运行或恢复前等待旧组装退出，超时保留可恢复暂停与输出目录。
/// @since Beta v0.13.0
async fn drain_audio_workers_before_start(
  task_root: &Path,
  journal: &mut TaskJournal,
  timeout: Duration,
) -> Result<(), String> {
  if journal.target != PackagePlanTarget::Audio
    || drain_assembly_workers(&journal.plan_id, timeout).await
  {
    return Ok(());
  }
  mark_prepare_paused(journal, AUDIO_WORKER_DRAIN_MESSAGE);
  journal::persist(task_root, journal)
    .map_err(|error| format!("{AUDIO_WORKER_DRAIN_MESSAGE} 持久化暂停状态失败：{error}"))?;
  Err(AUDIO_WORKER_DRAIN_MESSAGE.to_string())
}

/// 把资源准备任务保持为可恢复暂停，并向前端发布原因。
/// @since Beta v0.13.0
async fn persist_prepare_paused_message(
  app_handle: &AppHandle,
  task_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  message: &str,
) {
  let mut value = journal.lock().await;
  mark_prepare_paused(&mut value, message);
  if let Err(error) = journal::persist(task_root, &value) {
    log::error!("[game-package][{}] 持久化暂停状态失败：{error}", value.plan_id);
  }
  let _ = journal::forget_progress(task_root, &value.task_id);
  let summary = value.summary();
  drop(value);
  emit_state(app_handle, &summary);
  emit_progress(app_handle, &summary);
}

#[allow(clippy::too_many_arguments)]
/// 监督正式更新准备流水线，停滞时安全退出旧 worker 并自动重试一次。
/// @since Beta v0.13.0
async fn run_main_streaming_prepare_supervisor(
  app_handle: AppHandle,
  task_root: PathBuf,
  cache_root: PathBuf,
  game_root: PathBuf,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused_slot: Arc<Mutex<Arc<AtomicBool>>>,
  manual_pause_requested: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  mut retry_budget_exhausted: bool,
) {
  loop {
    let paused = match paused_slot.lock() {
      Ok(value) => value.clone(),
      Err(_) => {
        log::error!("[game-main-update][{}] 暂停令牌锁已损坏", plan.plan_id);
        break;
      }
    };
    if !drain_assembly_workers(&plan.plan_id, INSTALL_ABORT_DRAIN_TIMEOUT).await {
      log::error!("[game-main-update][{}] 上一次正式更新组装 worker 未在超时内结束", plan.plan_id);
      persist_prepare_paused_message(
        &app_handle,
        &task_root,
        &journal,
        MAIN_UPDATE_WORKER_DRAIN_MESSAGE,
      )
      .await;
      break;
    }

    let stall_pause_requested = Arc::new(AtomicBool::new(false));
    let (abort_handle, abort_registration) = futures_util::future::AbortHandle::new_pair();
    let watchdog_context = PreparePipelineWatchdogContext {
      download_telemetry: DownloadTelemetry::new(),
      assembly_telemetry: assembler::AssemblyTelemetry::new(),
      stall_pause_requested: Arc::clone(&stall_pause_requested),
      retry_budget_exhausted,
      notify_on_stall: retry_budget_exhausted,
      labels: StallWatchdogLabels::MAIN_UPDATE,
      abort_handle,
    };
    let pipeline = futures_util::future::Abortable::new(
      run_streaming_prepare_task(
        app_handle.clone(),
        task_root.clone(),
        cache_root.clone(),
        game_root.clone(),
        plan.clone(),
        download_client.clone(),
        Arc::clone(&journal),
        Arc::clone(&canceled),
        paused,
        concurrency,
        max_bytes_per_second,
        false,
        Some(watchdog_context),
      ),
      abort_registration,
    );
    let _ = pipeline.await;

    if !stall_pause_requested.load(Ordering::Acquire)
      || canceled.load(Ordering::Acquire)
      || manual_pause_requested.load(Ordering::Acquire)
      || retry_budget_exhausted
    {
      break;
    }
    if !drain_assembly_workers(&plan.plan_id, INSTALL_ABORT_DRAIN_TIMEOUT).await {
      log::error!(
        "[game-main-update][{}] 停滞中止后的组装 worker 未在超时内结束，取消自动重试",
        plan.plan_id
      );
      persist_prepare_paused_message(
        &app_handle,
        &task_root,
        &journal,
        MAIN_UPDATE_WORKER_DRAIN_MESSAGE,
      )
      .await;
      break;
    }

    let next_paused = Arc::new(AtomicBool::new(false));
    let pause_slot_updated = match paused_slot.lock() {
      Ok(mut value) => {
        *value = Arc::clone(&next_paused);
        true
      }
      Err(_) => false,
    };
    if !pause_slot_updated {
      log::error!("[game-main-update][{}] 自动恢复时暂停令牌锁已损坏", plan.plan_id);
      break;
    }

    let retry_summary = {
      let mut value = journal.lock().await;
      if value.plan_id != plan.plan_id
        || value.installation_id != plan.installation_id
        || value.target != PackagePlanTarget::Main
        || value.state != PackageTaskState::Paused
        || value.install_auto_stall_retry_count >= INSTALL_AUTO_STALL_RETRY_LIMIT
        || canceled.load(Ordering::Acquire)
        || manual_pause_requested.load(Ordering::Acquire)
      {
        None
      } else {
        value.install_auto_stall_retry_count =
          value.install_auto_stall_retry_count.saturating_add(1);
        value.resume_elapsed();
        value.state = PackageTaskState::Queued;
        value.error_message = None;
        value.auto_retry_message = Some(MAIN_UPDATE_AUTO_STALL_RETRY_MESSAGE.to_string());
        value.current_file = Some(MAIN_UPDATE_AUTO_STALL_RETRY_MESSAGE.to_string());
        value.download_current_file = None;
        value.assembly_current_file = None;
        value.active_assembly_count = 0;
        value.bytes_per_second = 0;
        value.eta_seconds = None;
        value.assembly_bytes_per_second = 0;
        value.assembly_eta_seconds = None;
        value.touch();
        match journal::persist(&task_root, &value) {
          Ok(()) => Some(value.summary()),
          Err(error) => {
            log::error!("[game-main-update][{}] 持久化自动重试状态失败：{error}", plan.plan_id);
            None
          }
        }
      }
    };
    let Some(summary) = retry_summary else {
      break;
    };
    if next_paused.load(Ordering::Acquire)
      || canceled.load(Ordering::Acquire)
      || manual_pause_requested.load(Ordering::Acquire)
    {
      break;
    }
    log::warn!("[game-main-update][{}] 首次停滞已安全退出，开始唯一一次自动重试", plan.plan_id);
    emit_state(&app_handle, &summary);
    emit_progress(&app_handle, &summary);
    retry_budget_exhausted = true;
  }
}

/// 并发删除单个待移除配音资源：把文件移入备份目录并累计删除进度。
#[allow(clippy::too_many_arguments)]
/// 把单个待删除配音文件移入备份目录并累计删除进度。
/// @since Beta v0.13.0
async fn delete_audio_resource(
  events: &TaskEventDispatcher,
  task_root: &Path,
  game_root: &Path,
  plan: &Arc<PersistedPlan>,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  overlay: &AudioLiveAssemblyOverlay,
  deleted: &PlanDelete,
) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) {
    return Err("资源删除已取消".to_string());
  }
  if paused.load(Ordering::Acquire) {
    return Err("资源删除已暂停".to_string());
  }
  let backup_root = committer::prepare_audio_backup_root(game_root, &plan.plan_id)?;
  let target = resolve_optional_manifest_file(game_root, &deleted.name)?;
  let backup = prepare_manifest_output_file(&backup_root, &deleted.name)?;
  if let Some(target) = target {
    if resolve_optional_manifest_file(&backup_root, &deleted.name)?.is_some() {
      return Err(format!("待删除配音资源同时存在于游戏目录与备份目录：{}", deleted.name));
    }
    fs::rename(&target, &backup)
      .map_err(|error| format!("移除待删除配音资源失败：{}：{error}", deleted.name))?;
  }
  // 目标已缺失（备份中也没有）视为删除目标已达成，仍按完整大小累计进度。
  let mut value = journal.lock().await;
  value.delete_completed_bytes =
    value.delete_completed_bytes.saturating_add(deleted.size).min(value.delete_total_bytes);
  value.current_file = Some(deleted.name.clone());
  // 删除属于资源准备阶段，不写入提交行状态，避免“提交”进度条显示删除进度。
  value.touch();
  if let Err(error) = journal::persist(task_root, &value) {
    return Err(error);
  }
  let summary = overlay.overlay(&value);
  drop(value);
  events.publish_state(summary);
  Ok(())
}
#[allow(clippy::too_many_arguments)]
/// 执行配音/更新边下边组装准备流水线，包含删除 staging 与证据恢复。
/// @since Beta v0.13.0
async fn run_streaming_prepare_task(
  app_handle: AppHandle,
  task_root: PathBuf,
  cache_root: PathBuf,
  game_root: PathBuf,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  stage_audio_deletes: bool,
  watchdog_context: Option<PreparePipelineWatchdogContext>,
) {
  let download_telemetry =
    watchdog_context.as_ref().map(|context| Arc::clone(&context.download_telemetry));
  let assembly_telemetry =
    watchdog_context.as_ref().map_or_else(assembler::AssemblyTelemetry::new, |context| {
      Arc::clone(&context.assembly_telemetry)
    });
  let output_root = match committer::prepare_apply_assembly(&plan, &game_root) {
    Ok(path) => path,
    Err(error) => {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
  };
  let dependencies = match audio_asset_download_dependencies(&plan) {
    Ok(dependencies) => dependencies,
    Err(error) => {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
  };
  let completed_assets = match tauri::async_runtime::spawn_blocking({
    let task_root = task_root.clone();
    let plan = plan.clone();
    let output_root = output_root.clone();
    let game_root = game_root.clone();
    let canceled = Arc::clone(&canceled);
    move || {
      let mut completed = evidence::trusted_asset_indices(&task_root, &plan, &output_root)?;
      let kept = evidence::trusted_target_asset_indices(&task_root, &plan, &game_root, &canceled)?;
      completed.extend(kept.iter().copied());
      Ok::<_, String>((completed, kept))
    }
  })
  .await
  {
    Ok(Ok((mut completed, mut kept))) => {
      let mut value = journal.lock().await;
      // 已激活回退是持久化的选择，不能被旧 sidecar 重新降为 KeepTarget。
      for index in value.fallback_assets.iter().chain(&value.target_reprepare_assets) {
        if kept.remove(index) {
          completed.remove(index);
        }
      }
      let activated = value.fallback_assets.iter().copied().collect::<HashSet<_>>();
      let invalid = value
        .already_target_assets
        .iter()
        .filter(|index| !kept.contains(index) && !activated.contains(index))
        .copied()
        .collect::<Vec<_>>();
      value.target_reprepare_assets.extend(invalid);
      value.target_reprepare_assets.sort_unstable();
      value.target_reprepare_assets.dedup();
      for index in &value.target_reprepare_assets {
        completed.remove(index);
      }
      value.already_target_assets = kept.into_iter().collect();
      value.already_target_assets.sort_unstable();
      value.requires_full_verification |= !value.already_target_assets.is_empty();
      completed
    }
    Ok(Err(error)) => {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
    Err(error) => {
      persist_audio_pipeline_error(
        &task_root,
        &app_handle,
        &journal,
        &paused,
        &canceled,
        format!("资源证据核对 worker 异常退出：{error}"),
      )
      .await;
      return;
    }
  };
  let remaining_incoming_bytes = plan
    .assets
    .iter()
    .enumerate()
    .filter(|(index, _)| !completed_assets.contains(index))
    .fold(0_u64, |total, (_, asset)| total.saturating_add(asset.size));
  let _space_guard = if plan.fallback.is_some() {
    let cache_remaining = {
      let value = journal.lock().await;
      value.total_bytes.saturating_sub(value.downloaded_bytes)
    };
    if let Err(error) = reserve_update_space(
      &plan.plan_id,
      UpdateSpaceReservation {
        cache_root: cache_root.clone(),
        game_root: game_root.clone(),
        cache_remaining,
        incoming_remaining: remaining_incoming_bytes,
      },
    ) {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
    Some(UpdateSpaceGuard(plan.plan_id.clone()))
  } else {
    None
  };
  let required = remaining_incoming_bytes.saturating_add(SAFETY_MARGIN_BYTES);
  let available = match fs2::available_space(&game_root) {
    Ok(available) => available,
    Err(error) => {
      persist_audio_pipeline_error(
        &task_root,
        &app_handle,
        &journal,
        &paused,
        &canceled,
        format!("读取游戏磁盘剩余空间失败：{error}"),
      )
      .await;
      return;
    }
  };
  if available < required {
    persist_audio_pipeline_error(
      &task_root,
      &app_handle,
      &journal,
      &paused,
      &canceled,
      format!("游戏磁盘空间不足：至少需要 {required} 字节，可用 {available} 字节"),
    )
    .await;
    return;
  }
  let (pending_deletes, delete_completed_bytes) = if stage_audio_deletes {
    match tauri::async_runtime::spawn_blocking({
      let plan = plan.clone();
      let game_root = game_root.clone();
      move || discover_audio_delete_progress(&plan.plan_id, &plan.delete_files, &game_root)
    })
    .await
    {
      Ok(Ok(progress)) => progress,
      Ok(Err(error)) => {
        persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
          .await;
        return;
      }
      Err(error) => {
        persist_audio_pipeline_error(
          &task_root,
          &app_handle,
          &journal,
          &paused,
          &canceled,
          format!("配音删除进度核对 worker 异常退出：{error}"),
        )
        .await;
        return;
      }
    }
  } else {
    (Vec::new(), 0)
  };
  let plan = Arc::new(plan);
  let events = match TaskEventDispatcher::for_audio(app_handle.clone(), &plan.plan_id) {
    Ok(events) => events,
    Err(error) => {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
  };
  let limiter = Arc::new(RateLimiter::new(max_bytes_per_second));
  let labels = Arc::new(build_download_labels(&plan));
  let mut completed_assets = completed_assets;
  let mut scheduled_assets = completed_assets.clone();
  let completed_cache_keys = {
    let value = journal.lock().await;
    value.owned_cache_files.iter().cloned().collect::<HashSet<_>>()
  };
  let available_downloads = plan
    .downloads
    .iter()
    .enumerate()
    .filter_map(|(index, download)| {
      completed_cache_keys.contains(&download.cache_key).then_some(index)
    })
    .collect::<HashSet<_>>();
  let completed_cache_keys = Arc::new(Mutex::new(completed_cache_keys));
  let available_downloads = Arc::new(Mutex::new(available_downloads));
  let download_started_at = Instant::now();
  {
    let completed_bytes = completed_assets
      .iter()
      .filter_map(|index| plan.assets.get(*index))
      .fold(0_u64, |total, asset| total.saturating_add(asset.size));
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Downloading;
    value.game_root = Some(game_root.display().to_string());
    value.update_assembly_progress(
      completed_assets.len(),
      plan.assets.len(),
      completed_bytes,
      plan.assets.iter().fold(0_u64, |total, asset| total.saturating_add(asset.size)),
      None,
    );
    value.delete_total_bytes =
      plan.delete_files.iter().fold(0_u64, |total, file| total.saturating_add(file.size));
    value.delete_completed_bytes = delete_completed_bytes.min(value.delete_total_bytes);
    value.active_assembly_count = 0;
    value.download_current_file = None;
    value.current_file = None;
    value.error_message = None;
    value.auto_retry_message = None;
    value.touch();
    if let Err(error) = journal::persist(&task_root, &value) {
      persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
        emit_state(&app_handle, &summary);
      });
      return;
    }
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
  }
  let assembly_overlay = Arc::new(AudioLiveAssemblyOverlay::new());
  let _assembly_progress_monitor = start_assembly_write_progress_monitor(
    events.clone(),
    Arc::clone(&journal),
    Arc::clone(&assembly_telemetry),
    Arc::clone(&assembly_overlay),
    Arc::clone(&canceled),
    Arc::clone(&paused),
  );
  if let Some(context) = watchdog_context {
    spawn_prepare_stall_watchdog(
      app_handle.clone(),
      task_root.clone(),
      plan.plan_id.clone(),
      Arc::clone(&journal),
      Arc::clone(&paused),
      Arc::clone(&canceled),
      context,
    );
  }
  let download_focus = Arc::new(Semaphore::new(AUDIO_DOWNLOAD_FOCUS));
  let download_slots = Arc::new(Semaphore::new(install_download_concurrency(concurrency)));
  let assembly_slots = Arc::new(Semaphore::new(install_assembly_concurrency(concurrency)));
  let download_guards = Arc::new(AsyncMutex::new(HashMap::<String, Arc<AsyncMutex<()>>>::new()));
  // 子任务必须独立调度：公平 journal 锁的队列头不能依赖正在等待同一锁的父任务继续 poll。
  let mut jobs = JoinSet::new();
  let mut pipeline_error = None;
  // 删除只移动游戏目录中待移除的语音文件（移入备份），与下载（缓存）、组装
  // （incoming）路径互不冲突；与下载/组装并发执行，避免串行拖长准备阶段。
  let deletion_blocked = is_game_running();
  let mut pending_deletes = pending_deletes.into_iter();
  let mut delete_jobs = JoinSet::new();
  let max_assembly = install_assembly_concurrency(concurrency);
  let max_in_flight = audio_pipeline_window(concurrency);
  let scheduler = PipelineScheduler::new(
    max_assembly,
    AUDIO_DOWNLOAD_FOCUS.saturating_add(AUDIO_DOWNLOAD_PREFETCH),
  );

  loop {
    if pipeline_error.is_none()
      && !paused.load(Ordering::Acquire)
      && !canceled.load(Ordering::Acquire)
    {
      while jobs.len() < max_in_flight {
        let next = {
          let available = available_downloads.lock().unwrap();
          let candidates =
            (0..plan.assets.len()).filter(|index| !scheduled_assets.contains(index)).map(|index| {
              let needs_download = dependencies[index].iter().any(|item| !available.contains(item));
              (index, needs_download)
            });
          scheduler.try_reserve_next(candidates).map(|(index, stage)| {
            (prepare_audio_asset_job(&plan, index, &dependencies, &available), stage)
          })
        };
        let Some((job, stage)) = next else {
          break;
        };
        let asset_index = job.asset_index;
        scheduled_assets.insert(asset_index);
        spawn_pipeline_job(
          &mut jobs,
          &plan.plan_id,
          run_audio_asset_job(
            job,
            stage,
            events.clone(),
            task_root.clone(),
            cache_root.clone(),
            game_root.clone(),
            output_root.clone(),
            Arc::clone(&plan),
            Arc::clone(&journal),
            Arc::clone(&canceled),
            Arc::clone(&paused),
            Arc::clone(&limiter),
            download_client.clone(),
            Arc::clone(&download_focus),
            Arc::clone(&download_slots),
            Arc::clone(&download_guards),
            Arc::clone(&assembly_slots),
            download_telemetry.clone(),
            Arc::clone(&assembly_telemetry),
            Arc::clone(&assembly_overlay),
            Arc::clone(&completed_cache_keys),
            Arc::clone(&available_downloads),
            Arc::clone(&labels),
            download_started_at,
          ),
        );
      }
      while delete_jobs.len() < concurrency.max(1) {
        let Some(deleted) = pending_deletes.next() else {
          break;
        };
        let events = events.clone();
        let task_root = task_root.clone();
        let game_root = game_root.clone();
        let worker_plan = Arc::clone(&plan);
        let journal = Arc::clone(&journal);
        let canceled = Arc::clone(&canceled);
        let paused = Arc::clone(&paused);
        let overlay = Arc::clone(&assembly_overlay);
        spawn_pipeline_job(&mut delete_jobs, &plan.plan_id, async move {
          if deletion_blocked {
            return Err("检测到游戏进程，暂时不能删除配音文件，请退出游戏后恢复任务".to_string());
          }
          delete_audio_resource(
            &events,
            &task_root,
            &game_root,
            &worker_plan,
            &journal,
            &canceled,
            &paused,
            &overlay,
            &deleted,
          )
          .await
        });
      }
    }
    if jobs.is_empty() && delete_jobs.is_empty() {
      break;
    }
    tokio::select! {
      completion = jobs.join_next(), if !jobs.is_empty() => {
        let Some(completion) = completion else {
          continue;
        };
        let completion = match completion {
          Ok(completion) => completion,
          Err(error) => {
            pipeline_error.get_or_insert_with(|| format!("资源准备子任务异常退出：{error}"));
            continue;
          }
        };
        match completion.result {
          Ok(()) => {
            completed_assets.insert(completion.asset_index);
            if let Some(asset) = plan.assets.get(completion.asset_index) {
              release_update_space(&plan.plan_id, 0, asset.size);
            }
            let completed_bytes = completed_assets
              .iter()
              .filter_map(|index| plan.assets.get(*index))
              .fold(0_u64, |total, asset| total.saturating_add(asset.size));
            let mut cursor = 0_usize;
            while completed_assets.contains(&cursor) {
              cursor = cursor.saturating_add(1);
            }
            let summary = {
              let mut value = journal.lock().await;
              assembly_overlay.clear_asset(completion.asset_index);
              value.completed_asset_cursor = cursor.min(plan.assets.len());
              value.assembly_completed_bytes_total = completed_bytes;
              let assembly_total_bytes = value.assembly_total_bytes;
              value.update_assembly_progress(
                completed_assets.len(),
                plan.assets.len(),
                completed_bytes,
                assembly_total_bytes,
                Some(plan.assets[completion.asset_index].name.clone()),
              );
              value.touch();
              if let Err(error) = journal::persist(&task_root, &value) {
                pipeline_error = Some(error);
              }
              assembly_overlay.overlay(&value)
            };
            events.publish_progress(summary);
          }
          Err(error) => {
            pipeline_error.get_or_insert(error);
          }
        }
      }
      deletion = delete_jobs.join_next(), if !delete_jobs.is_empty() => {
        let Some(result) = deletion else {
          continue;
        };
        let result = result.unwrap_or_else(|error| Err(format!("资源删除子任务异常退出：{error}")));
        if let Err(error) = result {
          pipeline_error.get_or_insert(error);
        }
      }
      () = scheduler.changed() => {}
    }
  }

  flush_cache_validation_index(&cache_root);
  let mut value = journal.lock().await;
  value.active_assembly_count = 0;
  value.bytes_per_second = 0;
  value.eta_seconds = None;
  value.assembly_bytes_per_second = 0;
  value.assembly_eta_seconds = None;
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.current_file = None;
  if paused.load(Ordering::Acquire) {
    value.state = PackageTaskState::Paused;
    value.error_message = None;
  } else if canceled.load(Ordering::Acquire) {
    value.state = PackageTaskState::Canceled;
    value.error_message = None;
  } else if let Some(error) = pipeline_error {
    value.state = PackageTaskState::Failed;
    value.error_message = Some(error);
  } else if completed_assets.len() == plan.assets.len() {
    value.state = PackageTaskState::ReadyToApply;
    // 已有目标可以完成准备而不再需要缓存；不能把未下载对象伪报为已下载。
    value.committed_step = value.owned_cache_files.len();
    value.assembly_completed_count = value.assembly_total_count;
    value.assembly_completed_bytes = value.assembly_total_bytes;
    value.error_message = None;
  } else {
    value.state = PackageTaskState::Failed;
    value.error_message = Some("资源流水线结束后仍有下载或组装对象未完成".to_string());
  }
  value.touch();
  if let Err(error) = journal::persist(&task_root, &value) {
    persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
      emit_state(&app_handle, &summary);
    });
    return;
  }
  discard_plan_transaction_on_cancel(&value);
  let summary = value.summary();
  drop(value);
  events.publish_state(summary);
}

/// 把准备流水线错误写入任务日志，并按暂停/取消/失败发布终态。
async fn persist_audio_pipeline_error(
  task_root: &Path,
  app_handle: &AppHandle,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  paused: &AtomicBool,
  canceled: &AtomicBool,
  error: String,
) {
  let mut value = journal.lock().await;
  value.state = if paused.load(Ordering::Acquire) {
    PackageTaskState::Paused
  } else if canceled.load(Ordering::Acquire) {
    PackageTaskState::Canceled
  } else {
    PackageTaskState::Failed
  };
  value.error_message =
    (!matches!(value.state, PackageTaskState::Paused | PackageTaskState::Canceled))
      .then_some(error);
  value.active_assembly_count = 0;
  value.current_file = None;
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.bytes_per_second = 0;
  value.eta_seconds = None;
  value.assembly_bytes_per_second = 0;
  value.assembly_eta_seconds = None;
  value.touch();
  discard_plan_transaction_on_cancel(&value);
  let persisted = journal::persist(task_root, &value).is_ok();
  let summary = value.summary();
  drop(value);
  if persisted {
    emit_progress(app_handle, &summary);
    emit_state(app_handle, &summary);
  }
}

/// 正式更新下载与组装完成后，沿用当前任务预留直接进入可逆提交。
async fn apply_main_after_download(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  installation: GameInstallation,
  paused: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
) -> Result<(), String> {
  let heartbeat_stop =
    spawn_apply_heartbeat(app_handle.clone(), Arc::clone(&journal), Arc::clone(&canceled));
  // 持续外部写入时暂停，避免无限哈希/下载循环。
  let mut reprepare_attempted = false;
  loop {
    if journal.lock().await.state == PackageTaskState::Paused && !reprepare_attempted {
      if let Err(error) = reprepare_main_targets(
        &app_handle,
        &task_root,
        &game_root,
        &plan,
        &journal,
        &canceled,
        &paused,
        concurrency,
        max_bytes_per_second,
      )
      .await
      {
        heartbeat_stop.store(true, Ordering::Release);
        return Err(error);
      }
      reprepare_attempted = true;
    }
    let apply_plan = plan.clone();
    let apply_game_root = game_root.clone();
    let apply_task_root = task_root.clone();
    let apply_canceled = Arc::clone(&canceled);
    let apply_journal = Arc::clone(&journal);
    let apply_handle = app_handle.clone();
    let worker_result = tauri::async_runtime::spawn_blocking(move || {
      let mut journal_value = apply_journal.blocking_lock().clone();
      let emit = |value: &TaskJournal| {
        *apply_journal.blocking_lock() = value.clone();
        let summary = value.summary();
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
    let result = match worker_result {
      Ok(result) => result,
      Err(error) => {
        heartbeat_stop.store(true, Ordering::Release);
        return Err(format!("自动应用资源任务异常退出：{error}"));
      }
    };
    match result {
      Ok(committer::ApplyOutcome::Completed) => {
        heartbeat_stop.store(true, Ordering::Release);
        return Ok(());
      }
      Ok(committer::ApplyOutcome::RepairNeeded) => {
        let result =
          continue_repair(app_handle, task_root, game_root, installation, plan, journal, canceled)
            .await;
        heartbeat_stop.store(true, Ordering::Release);
        return result;
      }
      Ok(committer::ApplyOutcome::PrepareNeeded) => {
        if reprepare_attempted {
          heartbeat_stop.store(true, Ordering::Release);
          return Err("已有目标文件持续变化，任务已暂停，请关闭其他启动器后继续".to_string());
        }
        if let Err(error) = reprepare_main_targets(
          &app_handle,
          &task_root,
          &game_root,
          &plan,
          &journal,
          &canceled,
          &paused,
          concurrency,
          max_bytes_per_second,
        )
        .await
        {
          heartbeat_stop.store(true, Ordering::Release);
          return Err(error);
        }
        reprepare_attempted = true;
      }
      Err(error) => {
        heartbeat_stop.store(true, Ordering::Release);
        return Err(error);
      }
    }
  }
}

/// KeepTarget 在提交边界前失效时，仍通过原流水线激活回退及预留空间。
#[allow(clippy::too_many_arguments)]
async fn reprepare_main_targets(
  app_handle: &AppHandle,
  task_root: &Path,
  game_root: &Path,
  plan: &PersistedPlan,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
) -> Result<(), String> {
  if plan.target != PackagePlanTarget::Main || plan.fallback.is_none() {
    return Err("当前计划不支持重新准备已有目标文件".to_string());
  }
  if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
    return Err("重新准备资源已停止".to_string());
  }
  if !drain_assembly_workers(&plan.plan_id, INSTALL_ABORT_DRAIN_TIMEOUT).await {
    return Err(MAIN_UPDATE_WORKER_DRAIN_MESSAGE.to_string());
  }
  let cache_root = prepare_cache_root(task_root)?;
  let client = create_http_client()?;
  run_streaming_prepare_task(
    app_handle.clone(),
    task_root.to_path_buf(),
    cache_root,
    game_root.to_path_buf(),
    plan.clone(),
    client,
    Arc::clone(journal),
    Arc::clone(canceled),
    Arc::clone(paused),
    concurrency,
    max_bytes_per_second,
    false,
    None,
  )
  .await;
  let value = journal.lock().await;
  if value.state != PackageTaskState::ReadyToApply {
    return Err(value.error_message.clone().unwrap_or_else(|| "资源重新准备未完成".to_string()));
  }
  Ok(())
}

/// 配音包下载完成后自动退出游戏并提交、登记配音变更。
async fn apply_audio_after_download(
  app_handle: AppHandle,
  task_root: PathBuf,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  context: AudioApplyContext,
) -> Result<(), String> {
  if plan.target != PackagePlanTarget::Audio
    || journal.lock().await.state != PackageTaskState::ReadyToApply
  {
    return Ok(());
  }
  {
    let mut journal_value = journal.lock().await;
    journal_value.commit_current_step = Some("正在验证配音包提交计划".to_string());
    journal_value.current_file = journal_value.commit_current_step.clone();
    journal_value.touch();
    let summary = journal_value.summary();
    emit_state(&app_handle, &summary);
    emit_progress(&app_handle, &summary);
  }
  let installation =
    inspect_executable(&context.installation.executable_path, &context.machine_uid)?;
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let branches = get_game_branches(&client, scheme).await?;
  let plan = hydrate_and_validate_apply_plan(&installation, &branches, plan).await?;
  persist_validated_plan(&task_root, &plan)?;
  {
    let mut journal_value = journal.lock().await;
    journal_value.commit_current_step = Some("正在退出游戏并准备提交配音文件".to_string());
    journal_value.current_file = journal_value.commit_current_step.clone();
    journal_value.touch();
    let summary = journal_value.summary();
    emit_state(&app_handle, &summary);
    emit_progress(&app_handle, &summary);
  }
  let stop_result = tauri::async_runtime::spawn_blocking(stop_game)
    .await
    .map_err(|error| format!("退出游戏任务异常：{error}"))?;
  if let Err(error) = stop_result {
    let message = format!("自动退出游戏失败：{error}");
    let mut journal_value = journal.lock().await;
    journal_value.error_message = Some(message.clone());
    journal_value.current_file = None;
    journal_value.commit_current_step = Some("等待重试提交配音文件".to_string());
    journal_value.touch();
    journal::persist(&task_root, &journal_value)?;
    let summary = journal_value.summary();
    emit_state(&app_handle, &summary);
    emit_progress(&app_handle, &summary);
    return Err(message);
  }
  let game_root = PathBuf::from(&installation.root_path);
  let registration_game_root = game_root.clone();
  let apply_plan = plan.clone();
  let apply_task_root = task_root.clone();
  let apply_journal = Arc::clone(&journal);
  let apply_handle = app_handle.clone();
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = apply_journal.blocking_lock().clone();
    let emit = |journal: &TaskJournal| {
      *apply_journal.blocking_lock() = journal.clone();
      let summary = journal.summary();
      emit_state(&apply_handle, &summary);
      emit_progress(&apply_handle, &summary);
    };
    committer::execute_apply(
      &apply_plan,
      &game_root,
      &apply_task_root,
      &mut journal_value,
      &canceled,
      emit,
    )
  })
  .await
  .map_err(|error| format!("应用配音包任务异常退出：{error}"))??;
  if matches!(
    result,
    committer::ApplyOutcome::RepairNeeded | committer::ApplyOutcome::PrepareNeeded
  ) {
    return Err("配音包提交后仍需修复，请执行安全恢复".to_string());
  }
  if journal.lock().await.state != PackageTaskState::RegistrationPending {
    return Ok(());
  }
  finalize_audio_registration(
    &app_handle,
    &task_root,
    &context.registration_pool,
    &plan,
    &registration_game_root,
    &journal,
  )
  .await
  .map(|_| ())
}

#[allow(clippy::too_many_arguments)]
/// 监督全新安装流水线，处理停滞自动重试与 Defender 清理。
/// @since Beta v0.13.0
async fn run_install_streaming_supervisor(
  app_handle: AppHandle,
  task_root: PathBuf,
  shared_cache_root: PathBuf,
  spool_root: PathBuf,
  plan: PersistedPlan,
  download_client: reqwest::Client,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused_slot: Arc<Mutex<Arc<AtomicBool>>>,
  manual_pause_requested: Arc<AtomicBool>,
  concurrency: usize,
  max_bytes_per_second: Option<u64>,
  context: InstallContext,
  mut retry_budget_exhausted: bool,
) {
  let events = match TaskEventDispatcher::for_install(app_handle.clone(), &plan.plan_id) {
    Ok(events) => events,
    Err(error) => {
      log::error!("[game-install][{}] 创建安装事件派发线程失败：{error}", plan.plan_id);
      let mut value = journal.lock().await;
      value.state = PackageTaskState::Failed;
      value.error_message = Some(format!("创建安装事件派发线程失败：{error}"));
      value.touch();
      let _ = journal::persist(&task_root, &value);
      let summary = value.summary();
      drop(value);
      emit_state(&app_handle, &summary);
      emit_progress(&app_handle, &summary);
      return;
    }
  };
  loop {
    let paused = match paused_slot.lock() {
      Ok(value) => value.clone(),
      Err(_) => {
        log::error!("[game-install][{}] 安装暂停令牌锁已损坏", plan.plan_id);
        break;
      }
    };
    if !drain_assembly_workers(&plan.plan_id, INSTALL_ABORT_DRAIN_TIMEOUT).await {
      log::error!(
        "[game-install][{}] 上一次中止流水线的组装 worker 未在超时内结束，任务保持暂停状态",
        plan.plan_id
      );
      let mut value = journal.lock().await;
      if value.state == PackageTaskState::Queued {
        value.state = PackageTaskState::Paused;
        value.error_message =
          Some("组装 worker 未在超时内退出，任务保持暂停；请确认磁盘健康后再次恢复".to_string());
        value.auto_retry_message = None;
        value.current_file = None;
        value.download_current_file = None;
        value.assembly_current_file = None;
        value.bytes_per_second = 0;
        value.eta_seconds = None;
        value.touch();
        let _ = journal::persist(&task_root, &value);
        let _ = journal::forget_progress(&task_root, &value.task_id);
        let summary = value.summary();
        drop(value);
        events.publish_state(summary);
      }
      break;
    }
    let stall_pause_requested = Arc::new(AtomicBool::new(false));
    let (abort_handle, abort_registration) = futures_util::future::AbortHandle::new_pair();
    let pipeline = futures_util::future::Abortable::new(
      run_install_streaming_task(
        app_handle.clone(),
        events.clone(),
        task_root.clone(),
        shared_cache_root.clone(),
        spool_root.clone(),
        plan.clone(),
        download_client.clone(),
        Arc::clone(&journal),
        Arc::clone(&canceled),
        paused,
        concurrency,
        max_bytes_per_second,
        context.clone(),
        Arc::clone(&stall_pause_requested),
        retry_budget_exhausted,
        abort_handle.clone(),
      ),
      abort_registration,
    );
    let _ = pipeline.await;

    if !stall_pause_requested.load(Ordering::Acquire)
      || canceled.load(Ordering::Acquire)
      || manual_pause_requested.load(Ordering::Acquire)
      || retry_budget_exhausted
    {
      break;
    }

    let next_paused = Arc::new(AtomicBool::new(false));
    let pause_slot_updated = match paused_slot.lock() {
      Ok(mut value) => {
        *value = Arc::clone(&next_paused);
        true
      }
      Err(_) => {
        log::error!("[game-install][{}] 自动恢复时暂停令牌锁已损坏", plan.plan_id);
        false
      }
    };
    if !pause_slot_updated {
      break;
    }

    let retry_summary = {
      let mut value = journal.lock().await;
      if value.plan_id != plan.plan_id
        || value.installation_id != plan.installation_id
        || value.target != PackagePlanTarget::Install
        || value.state != PackageTaskState::Paused
        || value.install_auto_stall_retry_count >= INSTALL_AUTO_STALL_RETRY_LIMIT
        || canceled.load(Ordering::Acquire)
        || manual_pause_requested.load(Ordering::Acquire)
      {
        None
      } else {
        value.install_auto_stall_retry_count =
          value.install_auto_stall_retry_count.saturating_add(1);
        value.resume_elapsed();
        value.state = PackageTaskState::Queued;
        value.error_message = None;
        value.auto_retry_message = Some(INSTALL_AUTO_STALL_RETRY_MESSAGE.to_string());
        value.current_file = Some(INSTALL_AUTO_STALL_RETRY_MESSAGE.to_string());
        value.download_current_file = None;
        value.assembly_current_file = None;
        value.active_assembly_count = 0;
        value.bytes_per_second = 0;
        value.eta_seconds = None;
        value.assembly_bytes_per_second = 0;
        value.assembly_eta_seconds = None;
        value.touch();
        match journal::persist(&task_root, &value) {
          Ok(()) => Some(value.summary()),
          Err(error) => {
            log::error!("[game-install][{}] 持久化自动重试状态失败：{error}", plan.plan_id);
            None
          }
        }
      }
    };
    let Some(summary) = retry_summary else {
      break;
    };
    if next_paused.load(Ordering::Acquire)
      || canceled.load(Ordering::Acquire)
      || manual_pause_requested.load(Ordering::Acquire)
    {
      break;
    }
    log::warn!("[game-install][{}] 首次停滞任务已完全退出，开始唯一一次自动重试", plan.plan_id);
    events.publish_state(summary);
    retry_budget_exhausted = true;
  }

  // 安装流水线结束后，若任务已进入终态，将临时加入 Defender 白名单的目录移出。
  let cleanup_task_root = task_root.clone();
  let cleanup_plan_id = plan.plan_id.clone();
  let terminal = {
    let value = journal.lock().await;
    value.state.is_history_terminal()
  };
  if terminal {
    tauri::async_runtime::spawn_blocking(move || {
      if let Err(error) =
        super::defender::cleanup_install_exclusions(&cleanup_task_root, &cleanup_plan_id)
      {
        log::warn!("[game-install][{cleanup_plan_id}] 移出 Defender 排除失败：{error}");
      }
    });
  }
}

#[allow(clippy::too_many_arguments)]
/// 执行全新安装下载、组装与发布的主流水线。
/// @since Beta v0.13.0
async fn run_install_streaming_task(
  app_handle: AppHandle,
  events: TaskEventDispatcher,
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
  stall_pause_requested: Arc<AtomicBool>,
  notify_on_stall: bool,
  abort_handle: AbortHandle,
) {
  let pipeline_started_at = Instant::now();
  let plan = Arc::new(plan);
  let download_labels = Arc::new(build_download_labels(&plan));
  let staging_root = match installer::prepare_install_assembly(&plan, &task_root) {
    Ok(path) => path,
    Err(error) => {
      let mut value = journal.lock().await;
      persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
        events.publish_state(summary);
      });
      return;
    }
  };
  let limiter = Arc::new(RateLimiter::new(max_bytes_per_second));
  let index_started_at = Instant::now();
  let download_index = match assembler::FullInstallDownloadIndex::from_plan(&plan) {
    Ok(index) => Arc::new(index),
    Err(error) => {
      persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
      return;
    }
  };
  let metrics = Arc::new(InstallPipelineMetrics::new(
    &plan,
    concurrency,
    pipeline_started_at,
    duration_micros(index_started_at.elapsed()),
    Arc::clone(&stall_pause_requested),
  ));
  let recovery_started_at = Instant::now();
  {
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Assembling;
    value.auto_retry_message = None;
    value.commit_current_step = Some("正在恢复资源安装状态".to_string());
    value.current_file = value.commit_current_step.clone();
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.touch();
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
  }
  let discovery_plan = Arc::clone(&plan);
  let discovery_task_root = task_root.clone();
  let discovery_staging_root = staging_root.clone();
  let discovery_canceled = Arc::clone(&canceled);
  let completed_assets = match tauri::async_runtime::spawn_blocking(move || {
    assembler::discover_completed_install_assets(
      &discovery_plan,
      &discovery_task_root,
      &discovery_staging_root,
      &discovery_canceled,
    )
  })
  .await
  {
    Ok(Ok(completed)) => completed,
    Ok(Err(error)) => {
      persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
      return;
    }
    Err(error) => {
      persist_install_stream_error(
        &task_root,
        &events,
        &journal,
        format!("恢复资源状态 worker 异常退出：{error}"),
        false,
        false,
      )
      .await;
      return;
    }
  };
  metrics.record_recovery_validation(completed_assets.len(), recovery_started_at.elapsed());
  let tracker_plan = Arc::clone(&plan);
  let tracker_spool_root = spool_root.clone();
  let tracker_shared_cache_root = shared_cache_root.clone();
  let spool_tracker = match tauri::async_runtime::spawn_blocking(move || {
    InstallSpoolTracker::from_disk(
      &tracker_plan,
      &tracker_spool_root,
      &tracker_shared_cache_root,
      completed_assets,
    )
  })
  .await
  {
    Ok(tracker) => Arc::new(Mutex::new(tracker)),
    Err(error) => {
      persist_install_stream_error(
        &task_root,
        &events,
        &journal,
        format!("恢复资源状态 worker 异常退出：{error}"),
        false,
        false,
      )
      .await;
      return;
    }
  };
  let start_cursor = {
    let (snapshot, persist_value) = {
      let mut value = journal.lock().await;
      let (snapshot, committed_step) = {
        let tracker = spool_tracker.lock().unwrap();
        (tracker.completion_snapshot(&plan), tracker.committed_step())
      };
      apply_install_completion_snapshot(&mut value, snapshot, &metrics);
      value.committed_step = committed_step.min(value.total_count);
      value.commit_current_step = None;
      value.current_file = None;
      value.touch();
      (snapshot, value.clone())
    };
    if let Err(error) =
      persist_install_checkpoint_async(task_root.clone(), persist_value, Arc::clone(&metrics)).await
    {
      persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
      return;
    }
    let released = release_spool_unneeded_async(
      &spool_tracker,
      &plan,
      &spool_root,
      &shared_cache_root,
      context.preserve_chunks,
    )
    .await;
    let spool = install_tracker_spool_bytes(&spool_tracker);
    if let Err(error) =
      commit_install_download_progress(&events, &task_root, &journal, &metrics, |value| {
        value.released_bytes = value.released_bytes.saturating_add(released);
        value.spool_bytes = spool;
        metrics.observe_spool(value.spool_bytes);
      })
      .await
    {
      persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
      return;
    }
    snapshot.contiguous_cursor
  };
  metrics.set_eta_remaining_bytes(spool_tracker.lock().unwrap().remaining_download_bytes(&plan));
  let _download_progress_monitor = start_install_download_progress_monitor(
    events.clone(),
    Arc::clone(&journal),
    Arc::clone(&metrics),
  );
  spawn_install_stall_watchdog(
    app_handle.clone(),
    events.clone(),
    task_root.clone(),
    plan.plan_id.clone(),
    Arc::clone(&journal),
    Arc::clone(&paused),
    Arc::clone(&canceled),
    Arc::clone(&metrics),
    notify_on_stall,
    abort_handle,
  );
  if concurrency > 1 {
    if let Err(error) = run_install_bounded_asset_pipeline(
      &events,
      &task_root,
      &shared_cache_root,
      &spool_root,
      &plan,
      &download_index,
      &metrics,
      &download_client,
      Arc::clone(&download_labels),
      &journal,
      &canceled,
      &paused,
      concurrency,
      &limiter,
      &staging_root,
      &spool_tracker,
      context.preserve_chunks,
    )
    .await
    {
      let paused_flag = paused.load(Ordering::Acquire);
      let canceled_flag = canceled.load(Ordering::Acquire);
      if canceled_flag {
        let _ = installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
      }
      persist_install_stream_error(
        &task_root,
        &events,
        &journal,
        error,
        paused_flag,
        canceled_flag,
      )
      .await;
      return;
    }
  } else {
    'assets: for asset_index in start_cursor..plan.assets.len() {
      if spool_tracker.lock().unwrap().asset_completed(asset_index) {
        continue;
      }
      let mut assembly_repairs = 0_usize;
      loop {
        if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
          break 'assets;
        }
        metrics.record_queue_refill();
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
              &events,
              &journal,
              format!("资源 chunk 缺少下载计划：{}", chunk.id),
              false,
              false,
            )
            .await;
            return;
          };
          if !cached_chunk_matches_async(&shared_cache_root, download).await
            && !cached_chunk_matches_async(&spool_root, download).await
          {
            pending.push(download.clone());
          }
        }
        if let Err(error) = check_install_stream_space_with_spool(
          &plan,
          asset_index,
          &pending,
          install_tracker_spool_bytes(&spool_tracker),
        ) {
          persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
          return;
        }
        {
          let mut value = journal.lock().await;
          value.state = PackageTaskState::Downloading;
          value.download_current_file = Some(asset.name.clone());
          value.assembly_current_file = None;
          value.touch();
          if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
            persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
              events.publish_state(summary);
            });
            return;
          }
          let summary = value.summary();
          drop(value);
          events.publish_state(summary);
        }
        let tasks = stream::iter(pending.into_iter().map(|download| {
          let root = spool_root.clone();
          let task_id = plan.plan_id.clone();
          let canceled = Arc::clone(&canceled);
          let paused = Arc::clone(&paused);
          let limiter = Arc::clone(&limiter);
          let metrics = Arc::clone(&metrics);
          let client = download_client.clone();
          let tracker = Arc::clone(&spool_tracker);
          async move {
            await_install_download_worker(tauri::async_runtime::spawn(async move {
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
                .with_telemetry(metrics.download_telemetry()),
              )
              .await;
              metrics.finish_download(started_at);
              result.map(|downloaded| {
                let completed_count = tracker.lock().unwrap().mark_downloaded(
                  &download.id,
                  &download.cache_key,
                  downloaded.bytes,
                );
                (downloaded, completed_count)
              })
            }))
            .await
          }
        }))
        .buffer_unordered(concurrency);
        futures_util::pin_mut!(tasks);
        while let Some(result) = tasks.next().await {
          match result {
            Ok((downloaded, completed_count)) => {
              metrics.record_unique_download(downloaded.bytes);
              let spool = install_tracker_spool_bytes(&spool_tracker);
              if let Err(error) =
                commit_install_download_progress(&events, &task_root, &journal, &metrics, |value| {
                  value.downloaded_bytes = value.downloaded_bytes.saturating_add(downloaded.bytes);
                  value.committed_step =
                    value.committed_step.max(completed_count).min(value.total_count);
                  value.spool_bytes = spool;
                  metrics.observe_spool(value.spool_bytes);
                })
                .await
              {
                persist_install_stream_error(&task_root, &events, &journal, error, false, false)
                  .await;
                return;
              }
            }
            Err(error) => {
              let paused_flag = paused.load(Ordering::Acquire);
              let canceled_flag = canceled.load(Ordering::Acquire);
              if canceled_flag {
                let _ =
                  installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
              }
              persist_install_stream_error(
                &task_root,
                &events,
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
          value.assembly_current_file = Some(asset.name.clone());
          value.touch();
          if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
            persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
              events.publish_state(summary);
            });
            return;
          }
          let summary = value.summary();
          drop(value);
          events.publish_progress(summary);
        }
        let assemble_plan = Arc::clone(&plan);
        let assemble_download_index = Arc::clone(&download_index);
        let assemble_staging = staging_root.clone();
        let assemble_shared = shared_cache_root.clone();
        let assemble_spool = spool_root.clone();
        let assemble_canceled = Arc::clone(&canceled);
        let assemble_telemetry = metrics.assembly_telemetry();
        let assembly_started_at = metrics.begin_assembly();
        emit_active_assembly_count(&events, &journal, &metrics).await;
        let assembly_worker = spawn_install_assembly_worker(
          &plan.plan_id,
          assemble_plan,
          assemble_download_index,
          asset_index,
          assemble_staging,
          assemble_shared,
          assemble_spool,
          assemble_canceled,
          assemble_telemetry,
        );
        let assembly_worker_result = assembly_worker.await;
        let _assembly_elapsed = metrics.finish_assembly(assembly_started_at);
        emit_active_assembly_count(&events, &journal, &metrics).await;
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
          if !paused_flag
            && !canceled_flag
            && assembly_repairs < MAX_INSTALL_ASSEMBLY_CACHE_REPAIR_ATTEMPTS
          {
            if let Some(chunk_id) = assembler::cache_integrity_chunk_id(&error) {
              if let Some(download) = download_index.get(&plan, chunk_id).cloned() {
                assembly_repairs = assembly_repairs.saturating_add(1);
                log::warn!(
                  "[game-install] 组装缓存复验失败，作废并重下：chunk={} asset={} attempt={}",
                  download.id,
                  plan.assets[asset_index].name,
                  assembly_repairs,
                );
                invalidate_install_chunk_caches(
                  &shared_cache_root,
                  &spool_root,
                  &download,
                  &spool_tracker,
                );
                continue;
              }
            }
          }
          if canceled_flag {
            let _ =
              installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
          }
          persist_install_stream_error(
            &task_root,
            &events,
            &journal,
            error,
            paused_flag,
            canceled_flag,
          )
          .await;
          return;
        }
        {
          let mut value = journal.lock().await;
          value.spool_bytes = install_tracker_spool_bytes(&spool_tracker);
          {
            let mut tracker_value = spool_tracker.lock().unwrap();
            tracker_value.mark_asset_completed(&plan, asset_index);
            let snapshot = tracker_value.completion_snapshot(&plan);
            apply_install_completion_snapshot(&mut value, snapshot, &metrics);
            value.committed_step = tracker_value.committed_step();
          }
          value.download_current_file = None;
          value.assembly_current_file = None;
          value.touch();
          if let Err(error) = persist_install_checkpoint(&task_root, &value, &metrics) {
            persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
              events.publish_state(summary);
            });
            return;
          }
        }
        // spool 释放做无超时的磁盘 I/O；不能在持有 journal 锁时等待它，
        // 否则一旦磁盘卡住，进度无法持久化且看门狗会因拿不到锁而失明。
        let released = release_spool_unneeded_async(
          &spool_tracker,
          &plan,
          &spool_root,
          &shared_cache_root,
          context.preserve_chunks,
        )
        .await;
        {
          let mut value = journal.lock().await;
          value.released_bytes = value.released_bytes.saturating_add(released);
          value.spool_bytes = install_tracker_spool_bytes(&spool_tracker);
          metrics.observe_spool(value.spool_bytes);
          value.touch();
          if let Err(error) = persist_install_progress(&task_root, &value, &metrics) {
            persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
              events.publish_state(summary);
            });
            return;
          }
          let summary = value.summary();
          drop(value);
          events.publish_progress(summary);
        }
        break;
      }
    }
  }
  if paused.load(Ordering::Acquire) {
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Paused;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.bytes_per_second = 0;
    value.eta_seconds = None;
    value.touch();
    let _ = journal::persist(&task_root, &value);
    let _ = journal::forget_progress(&task_root, &value.task_id);
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
    return;
  }
  if canceled.load(Ordering::Acquire) {
    let _ = installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
    let mut value = journal.lock().await;
    value.state = PackageTaskState::Canceled;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.bytes_per_second = 0;
    value.eta_seconds = None;
    value.touch();
    let _ = journal::persist(&task_root, &value);
    let _ = journal::forget_progress(&task_root, &value.task_id);
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
    return;
  }
  if let Err(error) = run_install_prepublish_repair(
    &events,
    &task_root,
    &shared_cache_root,
    &spool_root,
    &plan,
    &download_index,
    &metrics,
    &download_client,
    Arc::clone(&download_labels),
    &journal,
    &canceled,
    &paused,
    concurrency,
    &limiter,
    &staging_root,
    &spool_tracker,
    context.preserve_chunks,
  )
  .await
  {
    let paused_flag = paused.load(Ordering::Acquire);
    let canceled_flag = canceled.load(Ordering::Acquire);
    if canceled_flag {
      let _ = installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
    }
    persist_install_stream_error(&task_root, &events, &journal, error, paused_flag, canceled_flag)
      .await;
    return;
  }
  if let Some(sdk) = plan.install_overlay.as_ref().and_then(|overlay| overlay.sdk.as_ref()) {
    let Some(download) = plan.downloads.iter().find(|download| download.cache_key == sdk.cache_key)
    else {
      persist_install_stream_error(
        &task_root,
        &events,
        &journal,
        format!("安装计划缺少渠道 SDK 下载项：{}", sdk.cache_key),
        false,
        false,
      )
      .await;
      return;
    };
    if !cached_chunk_matches_async(&shared_cache_root, download).await
      && !cached_chunk_matches_async(&spool_root, download).await
    {
      if let Err(error) = check_install_stream_space_with_spool(
        &plan,
        plan.assets.len(),
        std::slice::from_ref(download),
        install_tracker_spool_bytes(&spool_tracker),
      ) {
        persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
        return;
      }
      {
        let mut value = journal.lock().await;
        value.download_current_file = download_labels
          .get(&download.cache_key)
          .cloned()
          .or_else(|| Some(sdk.pkg_version_file_name.clone()));
        value.touch();
        if let Err(error) = journal::persist(&task_root, &value) {
          persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
            events.publish_state(summary);
          });
          return;
        }
        let summary = value.summary();
        drop(value);
        events.publish_progress(summary);
      }
      let sdk_download_started_at = metrics.begin_download();
      let sdk_download_result = download_object(
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
        .with_telemetry(metrics.download_telemetry()),
      )
      .await;
      metrics.finish_download(sdk_download_started_at);
      let downloaded = match sdk_download_result {
        Ok(downloaded) => downloaded,
        Err(error) => {
          let paused_flag = paused.load(Ordering::Acquire);
          let canceled_flag = canceled.load(Ordering::Acquire);
          if canceled_flag {
            let _ =
              installer::cancel_draft(&task_root, &context.draft_id, false, &mut |_, _, _| {});
          }
          persist_install_stream_error(
            &task_root,
            &events,
            &journal,
            error,
            paused_flag,
            canceled_flag,
          )
          .await;
          return;
        }
      };
      metrics.record_unique_download(downloaded.bytes);
      let completed_count = spool_tracker.lock().unwrap().mark_downloaded(
        &download.id,
        &download.cache_key,
        downloaded.bytes,
      );
      let spool = install_tracker_spool_bytes(&spool_tracker);
      if let Err(error) =
        commit_install_download_progress(&events, &task_root, &journal, &metrics, |value| {
          value.downloaded_bytes =
            value.downloaded_bytes.saturating_add(download.compressed_size).min(value.total_bytes);
          value.committed_step = value.committed_step.max(completed_count).min(value.total_count);
          value.download_current_file = None;
          value.spool_bytes = spool;
          metrics.observe_spool(value.spool_bytes);
        })
        .await
      {
        persist_install_stream_error(&task_root, &events, &journal, error, false, false).await;
        return;
      }
    }
  }
  {
    let mut value = journal.lock().await;
    value.state = PackageTaskState::ReadyToApply;
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.current_file = None;
    value.bytes_per_second = 0;
    value.eta_seconds = None;
    value.spool_bytes = spool_bytes(&spool_root);
    value.touch();
    if let Err(error) = persist_install_checkpoint(&task_root, &value, &metrics) {
      persist_terminal_journal(&task_root, &mut value, error, false, |summary| {
        events.publish_state(summary);
      });
      return;
    }
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
  }
  run_install_task(events, task_root, plan, journal, canceled, context, Some(metrics)).await;
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

const MAX_INSTALL_ASSET_REPAIR_ATTEMPTS: usize = 2;
const MAX_INSTALL_TASK_REPAIR_ATTEMPTS: usize = 3;
const MAX_INSTALL_ASSEMBLY_CACHE_REPAIR_ATTEMPTS: usize = 2;

/// 为安装资源自动修复预留一次重试额度，超出上限时返回错误。
fn reserve_install_repair_attempt(
  journal: &mut TaskJournal,
  asset_index: usize,
  path: &str,
  validation_message: &str,
) -> Result<usize, String> {
  let previous_attempts =
    journal.install_asset_repair_attempts.get(&asset_index).copied().unwrap_or_default();
  if previous_attempts >= MAX_INSTALL_ASSET_REPAIR_ATTEMPTS
    || journal.install_repair_attempts >= MAX_INSTALL_TASK_REPAIR_ATTEMPTS
  {
    return Err(format!("资源自动修复已达到重试上限：{path}（{validation_message}）"));
  }
  let attempt_number = previous_attempts.saturating_add(1);
  journal.install_asset_repair_attempts.insert(asset_index, attempt_number);
  journal.install_repair_attempts = journal.install_repair_attempts.saturating_add(1);
  Ok(attempt_number)
}

#[allow(clippy::too_many_arguments)]
/// 发布前反复校验并修复失败的安装资源，直到全部通过或重试额度耗尽。
/// @since Beta v0.13.0
async fn run_install_prepublish_repair(
  events: &TaskEventDispatcher,
  task_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  plan: &Arc<PersistedPlan>,
  download_index: &Arc<assembler::FullInstallDownloadIndex>,
  metrics: &Arc<InstallPipelineMetrics>,
  download_client: &reqwest::Client,
  download_labels: Arc<HashMap<String, String>>,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  concurrency: usize,
  limiter: &Arc<RateLimiter>,
  staging_root: &Path,
  spool_tracker: &Arc<Mutex<InstallSpoolTracker>>,
  preserve_chunks: bool,
) -> Result<(), String> {
  loop {
    let validation_plan = Arc::clone(plan);
    let validation_task_root = task_root.to_path_buf();
    let validation_staging_root = staging_root.to_path_buf();
    let validation_canceled = Arc::clone(canceled);
    let validation = tauri::async_runtime::spawn_blocking(move || {
      assembler::validate_full_install_assets_for_repair(
        &validation_plan,
        &validation_task_root,
        &validation_staging_root,
        &validation_canceled,
      )
    })
    .await
    .map_err(|error| format!("发布前资源校验 worker 异常退出：{error}"))?;
    let failure = match validation {
      Ok(()) => return Ok(()),
      Err(failure) if failure.repairable() => failure,
      Err(failure) => return Err(failure.message),
    };
    {
      let mut value = journal.lock().await;
      reserve_install_repair_attempt(
        &mut value,
        failure.asset_index,
        &failure.path,
        &failure.message,
      )?;
    }

    super::evidence::invalidate_asset_evidence(task_root, plan, failure.asset_index)?;
    let job = prepare_install_asset_job(
      plan,
      download_index,
      failure.asset_index,
      shared_cache_root,
      spool_root,
      &HashSet::new(),
      metrics,
    )?;
    metrics.set_eta_remaining_bytes(
      job
        .pending
        .iter()
        .fold(0_u64, |total, download| total.saturating_add(download.compressed_size)),
    );
    check_install_stream_space_with_spool(
      plan,
      failure.asset_index,
      &job.pending,
      install_tracker_spool_bytes(spool_tracker),
    )?;
    {
      let mut value = journal.lock().await;
      let snapshot = {
        let mut tracker = spool_tracker.lock().unwrap();
        tracker.invalidate_asset(plan, failure.asset_index);
        tracker.completion_snapshot(plan)
      };
      apply_install_completion_snapshot(&mut value, snapshot, metrics);
      value.state = PackageTaskState::Downloading;
      value.download_current_file = Some(failure.path.clone());
      value.assembly_current_file = None;
      value.current_file = value.download_current_file.clone();
      value.touch();
      persist_install_checkpoint(task_root, &value, metrics)?;
      let summary = value.summary();
      drop(value);
      events.publish_state(summary);
    }
    let network_concurrency = install_download_concurrency(concurrency);
    let completion = run_install_asset_job(
      job,
      events.clone(),
      task_root.to_path_buf(),
      shared_cache_root.to_path_buf(),
      spool_root.to_path_buf(),
      Arc::clone(plan),
      Arc::clone(download_index),
      Arc::clone(metrics),
      download_client.clone(),
      Arc::clone(&download_labels),
      Arc::clone(journal),
      Arc::clone(canceled),
      Arc::clone(paused),
      Arc::clone(limiter),
      Arc::new(Semaphore::new(network_concurrency)),
      Arc::new(AsyncMutex::new(HashMap::new())),
      Arc::new(Semaphore::new(1)),
      staging_root.to_path_buf(),
      network_concurrency,
      Arc::clone(spool_tracker),
    )
    .await;
    completion.result?;

    {
      let mut value = journal.lock().await;
      let snapshot = {
        let mut tracker = spool_tracker.lock().unwrap();
        tracker.mark_asset_completed(plan, failure.asset_index);
        let snapshot = tracker.completion_snapshot(plan);
        value.committed_step = tracker.committed_step().min(value.total_count);
        snapshot
      };
      apply_install_completion_snapshot(&mut value, snapshot, metrics);
      value.download_current_file = None;
      value.assembly_current_file = Some(failure.path.clone());
      value.current_file = value.assembly_current_file.clone();
      value.touch();
      persist_install_checkpoint(task_root, &value, metrics)?;
    }
    // spool 释放做无超时的磁盘 I/O；不能在持有 journal 锁时等待它（见看门狗兜底说明）。
    let released = release_spool_unneeded_async(
      spool_tracker,
      plan,
      spool_root,
      shared_cache_root,
      preserve_chunks,
    )
    .await;
    {
      let mut value = journal.lock().await;
      value.released_bytes = value.released_bytes.saturating_add(released);
      value.spool_bytes = install_tracker_spool_bytes(spool_tracker);
      value.touch();
      persist_install_progress(task_root, &value, metrics)?;
      let summary = value.summary();
      drop(value);
      events.publish_progress(summary);
    }
  }
}

/// 以 spool 预算约束调度安装资源下载与组装。
/// @since Beta v0.13.0
async fn run_install_bounded_asset_pipeline(
  events: &TaskEventDispatcher,
  task_root: &Path,
  shared_cache_root: &Path,
  spool_root: &Path,
  plan: &Arc<PersistedPlan>,
  download_index: &Arc<assembler::FullInstallDownloadIndex>,
  metrics: &Arc<InstallPipelineMetrics>,
  download_client: &reqwest::Client,
  download_labels: Arc<HashMap<String, String>>,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  concurrency: usize,
  limiter: &Arc<RateLimiter>,
  staging_root: &Path,
  spool_tracker: &Arc<Mutex<InstallSpoolTracker>>,
  preserve_chunks: bool,
) -> Result<(), String> {
  // 下载并发与流水线并发一致（与 CPU 核心数对齐）；组装与下载同一套默认并发。
  let network_concurrency = install_download_concurrency(concurrency);
  let download_slots = Arc::new(Semaphore::new(network_concurrency));
  let assembly_slots = Arc::new(Semaphore::new(install_assembly_concurrency(concurrency)));
  let mut asset_cursor = {
    let mut value = journal.lock().await;
    let snapshot = spool_tracker.lock().unwrap().completion_snapshot(plan);
    apply_install_completion_snapshot(&mut value, snapshot, metrics);
    value.download_current_file = None;
    value.assembly_current_file = None;
    value.touch();
    persist_install_checkpoint(task_root, &value, metrics)?;
    let summary = value.summary();
    drop(value);
    events.publish_progress(summary);
    snapshot.contiguous_cursor
  };
  let cache_complete = journal.lock().await.committed_step >= plan.downloads.len();
  let spool_budget = install_spool_window(&plan.assets, concurrency, cache_complete);
  let max_in_flight = concurrency.max(1).saturating_mul(2);
  let mut next_asset_index = asset_cursor;
  let mut reserved_spool_bytes = 0_u64;
  let scheduled_downloads = Arc::new(Mutex::new(HashSet::<String>::new()));
  let download_guards = Arc::new(AsyncMutex::new(HashMap::<String, Arc<AsyncMutex<()>>>::new()));
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
      if spool_tracker.lock().unwrap().asset_completed(next_asset_index) {
        next_asset_index = next_asset_index.saturating_add(1);
        continue;
      }
      let current_spool = install_tracker_spool_bytes(spool_tracker);
      let scheduled_plan = Arc::clone(plan);
      let scheduled_index = Arc::clone(download_index);
      let scheduled_shared = shared_cache_root.to_path_buf();
      let scheduled_spool = spool_root.to_path_buf();
      let scheduled_set = Arc::clone(&scheduled_downloads);
      let scheduled_metrics = Arc::clone(metrics);
      let schedule_result = tauri::async_runtime::spawn_blocking(move || {
        let scheduled = scheduled_set.lock().unwrap();
        let job = prepare_install_asset_job(
          &scheduled_plan,
          &scheduled_index,
          next_asset_index,
          &scheduled_shared,
          &scheduled_spool,
          &scheduled,
          &scheduled_metrics,
        )?;
        let space = check_install_stream_space_with_spool(
          &scheduled_plan,
          asset_cursor,
          &job.pending,
          current_spool,
        );
        Ok::<_, String>((job, space))
      })
      .await;
      let (job, space) = match schedule_result {
        Ok(Ok(result)) => result,
        Ok(Err(error)) => {
          first_error.get_or_insert(error);
          break;
        }
        Err(error) => {
          first_error.get_or_insert(error.to_string());
          break;
        }
      };
      let projected_spool =
        current_spool.saturating_add(reserved_spool_bytes).saturating_add(job.reserved_bytes);
      if projected_spool > spool_budget && !jobs.is_empty() {
        break;
      }
      if let Err(error) = space {
        first_error.get_or_insert(error);
        break;
      }
      for download_id in &job.scheduled_download_ids {
        scheduled_downloads.lock().unwrap().insert(download_id.clone());
      }
      reserved_spool_bytes = reserved_spool_bytes.saturating_add(job.reserved_bytes);
      next_asset_index = next_asset_index.saturating_add(1);
      scheduled_count = scheduled_count.saturating_add(1);
      jobs.push(run_install_asset_job(
        job,
        events.clone(),
        task_root.to_path_buf(),
        shared_cache_root.to_path_buf(),
        spool_root.to_path_buf(),
        Arc::clone(plan),
        Arc::clone(download_index),
        Arc::clone(metrics),
        download_client.clone(),
        Arc::clone(&download_labels),
        Arc::clone(journal),
        Arc::clone(canceled),
        Arc::clone(paused),
        Arc::clone(limiter),
        Arc::clone(&download_slots),
        Arc::clone(&download_guards),
        Arc::clone(&assembly_slots),
        staging_root.to_path_buf(),
        network_concurrency,
        Arc::clone(spool_tracker),
      ));
    }
    if scheduled_count > 0 {
      metrics.record_queue_refill();
      let mut value = journal.lock().await;
      value.state = PackageTaskState::Downloading;
      value.download_current_file = None;
      value.touch();
      if let Err(error) = persist_install_progress(task_root, &value, metrics) {
        first_error.get_or_insert(error);
      }
      let summary = value.summary();
      drop(value);
      events.publish_state(summary);
    }

    let Some(completion) = jobs.next().await else {
      break;
    };
    reserved_spool_bytes = reserved_spool_bytes.saturating_sub(completion.reserved_bytes);
    match completion.result {
      Ok(()) => {
        let mut checkpoint_failed = false;
        {
          let mut value = journal.lock().await;
          let snapshot = {
            let mut tracker = spool_tracker.lock().unwrap();
            tracker.mark_asset_completed(plan, completion.asset_index);
            let snapshot = tracker.completion_snapshot(plan);
            value.committed_step = tracker.committed_step().min(value.total_count);
            snapshot
          };
          apply_install_completion_snapshot(&mut value, snapshot, metrics);
          asset_cursor = snapshot.contiguous_cursor;
          value.assembly_current_file = (value.assembly_completed_count
            < value.assembly_total_count)
            .then(|| plan.assets[completion.asset_index].name.clone());
          value.spool_bytes = install_tracker_spool_bytes(spool_tracker);
          metrics.observe_spool(value.spool_bytes);
          value.touch();
          if let Err(error) = persist_install_checkpoint(task_root, &value, metrics) {
            first_error.get_or_insert(error);
            checkpoint_failed = true;
          }
          let summary = value.summary();
          drop(value);
          events.publish_progress(summary);
        }
        if !checkpoint_failed {
          // spool 释放做无超时的磁盘 I/O；不能在持有 journal 锁时等待它，
          // 否则磁盘卡住会让流水线与看门狗一起冻结。
          let released = release_spool_unneeded_async(
            spool_tracker,
            plan,
            spool_root,
            shared_cache_root,
            preserve_chunks,
          )
          .await;
          let mut value = journal.lock().await;
          value.released_bytes = value.released_bytes.saturating_add(released);
          value.spool_bytes = install_tracker_spool_bytes(spool_tracker);
          metrics.observe_spool(value.spool_bytes);
          value.touch();
          if let Err(error) = persist_install_progress(task_root, &value, metrics) {
            first_error.get_or_insert(error);
          }
          let summary = value.summary();
          drop(value);
          events.publish_progress(summary);
        }
      }
      Err(error) => {
        first_error.get_or_insert(error);
      }
    }
  }
  if let Some(error) = first_error { Err(error) } else { Ok(()) }
}

/// 为指定安装资源生成待下载分片与 spool 空间预留。
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

/// 单个下载对象的统一执行体：按下载 id 去重，命中共享缓存或 spool 时跳过，
/// 否则占用下载槽下载到任务私有 spool 并记账。
#[allow(clippy::too_many_arguments)]
/// @since Beta v0.13.0
async fn download_install_chunk(
  download: PlanDownload,
  client: reqwest::Client,
  root: PathBuf,
  shared_root: PathBuf,
  task_id: String,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  limiter: Arc<RateLimiter>,
  metrics: Arc<InstallPipelineMetrics>,
  slots: Arc<Semaphore>,
  guards: Arc<AsyncMutex<HashMap<String, Arc<AsyncMutex<()>>>>>,
  tracker: Arc<Mutex<InstallSpoolTracker>>,
  labels: Arc<HashMap<String, String>>,
) -> Result<Option<(u64, usize, String)>, String> {
  await_install_download_worker(tauri::async_runtime::spawn(async move {
    let download_guard = {
      let mut values = guards.lock().await;
      Arc::clone(values.entry(download.id.clone()).or_insert_with(|| Arc::new(AsyncMutex::new(()))))
    };
    let _download_guard = download_guard.lock().await;
    let permit =
      slots.acquire_owned().await.map_err(|error| format!("获取下载并发槽位失败：{error}"))?;
    let started_at = metrics.begin_download();
    let cache_hit = {
      let shared_root = shared_root.clone();
      let root = root.clone();
      let download = download.clone();
      tauri::async_runtime::spawn_blocking(move || {
        cached_chunk_matches(&shared_root, &download) || cached_chunk_matches(&root, &download)
      })
      .await
      .unwrap_or(false)
    };
    if cache_hit {
      metrics.download_telemetry().record_cache_hit();
      metrics.finish_download(started_at);
      drop(permit);
      return Ok(None);
    }
    let result = download_object(
      &client,
      &root,
      &download,
      DownloadControl::new(&task_id, &canceled, &paused, &limiter, DownloadDurability::Recoverable)
        .with_telemetry(metrics.download_telemetry())
        .skip_initial_cache_check(),
    )
    .await;
    metrics.finish_download(started_at);
    drop(permit);
    result.map(|downloaded| {
      let completed_count = tracker.lock().unwrap().mark_downloaded(
        &download.id,
        &download.cache_key,
        downloaded.bytes,
      );
      let label = labels.get(&download.cache_key).cloned().unwrap_or_else(|| download.id.clone());
      Some((downloaded.bytes, completed_count, label))
    })
  }))
  .await
}

/// 汇总一批下载结果：递增下载字节、提交进度并记账，任一失败即返回首个错误。
/// @since Beta v0.13.0
async fn apply_install_download_results(
  events: &TaskEventDispatcher,
  task_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  metrics: &Arc<InstallPipelineMetrics>,
  spool_tracker: &Arc<Mutex<InstallSpoolTracker>>,
  downloads: impl Stream<Item = Result<Option<(u64, usize, String)>, String>>,
) -> Result<(), String> {
  futures_util::pin_mut!(downloads);
  let mut first_download_error = None;
  while let Some(download_result) = downloads.next().await {
    match download_result {
      Ok(Some((downloaded_bytes, completed_count, label))) => {
        metrics.record_unique_download(downloaded_bytes);
        let spool = install_tracker_spool_bytes(spool_tracker);
        if let Err(error) =
          commit_install_download_progress(events, task_root, journal, metrics, |value| {
            value.downloaded_bytes =
              value.downloaded_bytes.saturating_add(downloaded_bytes).min(value.total_bytes);
            value.committed_step = value.committed_step.max(completed_count).min(value.total_count);
            value.download_current_file =
              (value.downloaded_bytes < value.total_bytes).then_some(label);
            value.spool_bytes = spool;
            metrics.observe_spool(value.spool_bytes);
          })
          .await
        {
          first_download_error.get_or_insert(error);
        }
      }
      Ok(None) => {}
      Err(error) => {
        first_download_error.get_or_insert(error);
      }
    }
  }
  if let Some(error) = first_download_error {
    return Err(error);
  }
  Ok(())
}

/// 复验并收集指定安装资源仍缺失的下载分片。
fn collect_missing_install_downloads(
  plan: &PersistedPlan,
  download_index: &assembler::FullInstallDownloadIndex,
  asset_index: usize,
  shared_cache_root: &Path,
  spool_root: &Path,
) -> Vec<PlanDownload> {
  let mut missing = Vec::new();
  let mut seen = HashSet::new();
  let Some(asset) = plan.assets.get(asset_index) else {
    return missing;
  };
  for chunk in &asset.chunks {
    if chunk.reuse.is_some() || !seen.insert(chunk.id.as_str()) {
      continue;
    }
    let Some(download) = download_index.get(plan, chunk.id.as_str()) else {
      continue;
    };
    if !cached_chunk_matches(shared_cache_root, download)
      && !cached_chunk_matches(spool_root, download)
    {
      missing.push(download.clone());
    }
  }
  missing
}

/// 作废共享缓存与 spool 中的损坏分片，并刷新缓存校验索引。
fn invalidate_install_chunk_caches(
  shared_cache_root: &Path,
  spool_root: &Path,
  download: &PlanDownload,
  spool_tracker: &Arc<Mutex<InstallSpoolTracker>>,
) {
  invalidate_cached_download(shared_cache_root, download);
  invalidate_cached_download(spool_root, download);
  flush_cache_validation_index(shared_cache_root);
  flush_cache_validation_index(spool_root);
  if let Ok(mut tracker) = spool_tracker.lock() {
    tracker.forget_download(&download.id, &download.cache_key);
  }
}

#[allow(clippy::too_many_arguments)]
/// 执行单个安装资源的下载与组装，支持缓存复验失败后的自动重下。
/// @since Beta v0.13.0
async fn run_install_asset_job(
  job: InstallAssetJob,
  events: TaskEventDispatcher,
  task_root: PathBuf,
  shared_cache_root: PathBuf,
  spool_root: PathBuf,
  plan: Arc<PersistedPlan>,
  download_index: Arc<assembler::FullInstallDownloadIndex>,
  metrics: Arc<InstallPipelineMetrics>,
  download_client: reqwest::Client,
  download_labels: Arc<HashMap<String, String>>,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
  limiter: Arc<RateLimiter>,
  download_slots: Arc<Semaphore>,
  download_guards: Arc<AsyncMutex<HashMap<String, Arc<AsyncMutex<()>>>>>,
  assembly_slots: Arc<Semaphore>,
  staging_root: PathBuf,
  network_concurrency: usize,
  spool_tracker: Arc<Mutex<InstallSpoolTracker>>,
) -> InstallAssetJobCompletion {
  let InstallAssetJob { asset_index, mut pending, reserved_bytes, .. } = job;
  let result = async {
    let mut assembly_repairs = 0_usize;
    loop {
      if !pending.is_empty() {
        let downloads = stream::iter(pending.drain(..).map(|download| {
          download_install_chunk(
            download.clone(),
            download_client.clone(),
            spool_root.clone(),
            shared_cache_root.clone(),
            plan.plan_id.clone(),
            Arc::clone(&canceled),
            Arc::clone(&paused),
            Arc::clone(&limiter),
            Arc::clone(&metrics),
            Arc::clone(&download_slots),
            Arc::clone(&download_guards),
            Arc::clone(&spool_tracker),
            Arc::clone(&download_labels),
          )
        }))
        .buffer_unordered(network_concurrency);
        apply_install_download_results(
          &events,
          &task_root,
          &journal,
          &metrics,
          &spool_tracker,
          downloads,
        )
        .await?;
      }

      // 组装前最后复验：计划期判为“已缓存”的分片若在组装前丢失（例如并发释放或缓存被清），
      // 在这里补下载一次，避免单个分片缺失就让整个安装失败。
      let missing = {
        let plan = Arc::clone(&plan);
        let download_index = Arc::clone(&download_index);
        let shared = shared_cache_root.clone();
        let spool = spool_root.clone();
        tauri::async_runtime::spawn_blocking(move || {
          collect_missing_install_downloads(&plan, &download_index, asset_index, &shared, &spool)
        })
        .await
        .map_err(|error| format!("核对组装缓存 worker 异常退出：{error}"))?
      };
      if !missing.is_empty() {
        let repair_downloads = stream::iter(missing.into_iter().map(|download| {
          download_install_chunk(
            download.clone(),
            download_client.clone(),
            spool_root.clone(),
            shared_cache_root.clone(),
            plan.plan_id.clone(),
            Arc::clone(&canceled),
            Arc::clone(&paused),
            Arc::clone(&limiter),
            Arc::clone(&metrics),
            Arc::clone(&download_slots),
            Arc::clone(&download_guards),
            Arc::clone(&spool_tracker),
            Arc::clone(&download_labels),
          )
        }))
        .buffer_unordered(network_concurrency);
        apply_install_download_results(
          &events,
          &task_root,
          &journal,
          &metrics,
          &spool_tracker,
          repair_downloads,
        )
        .await?;
      }

      {
        let mut value = journal.lock().await;
        value.assembly_current_file = Some(plan.assets[asset_index].name.clone());
        value.touch();
        let summary = value.summary();
        drop(value);
        events.publish_progress(summary);
      }
      let assembly_permit = Arc::clone(&assembly_slots)
        .acquire_owned()
        .await
        .map_err(|error| format!("获取组装并发槽位失败：{error}"))?;
      let assemble_plan = Arc::clone(&plan);
      let assemble_download_index = Arc::clone(&download_index);
      let assemble_staging = staging_root.clone();
      let assemble_shared = shared_cache_root.clone();
      let assemble_spool = spool_root.clone();
      let assemble_canceled = Arc::clone(&canceled);
      let assemble_telemetry = metrics.assembly_telemetry();
      let assembly_started_at = metrics.begin_assembly();
      emit_active_assembly_count(&events, &journal, &metrics).await;
      let worker = spawn_install_assembly_worker(
        &plan.plan_id,
        assemble_plan,
        assemble_download_index,
        asset_index,
        assemble_staging,
        assemble_shared,
        assemble_spool,
        assemble_canceled,
        assemble_telemetry,
      );
      let worker_result = worker.await;
      let _assembly_elapsed = metrics.finish_assembly(assembly_started_at);
      drop(assembly_permit);
      emit_active_assembly_count(&events, &journal, &metrics).await;
      let assembly_result = match worker_result {
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
      match assembly_result {
        Ok(()) => return Ok(()),
        Err(error) => {
          if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
            return Err(error);
          }
          let Some(chunk_id) = assembler::cache_integrity_chunk_id(&error) else {
            return Err(error);
          };
          if assembly_repairs >= MAX_INSTALL_ASSEMBLY_CACHE_REPAIR_ATTEMPTS {
            return Err(error);
          }
          let Some(download) = download_index.get(&plan, chunk_id).cloned() else {
            return Err(error);
          };
          assembly_repairs = assembly_repairs.saturating_add(1);
          log::warn!(
            "[game-install] 组装缓存复验失败，作废并重下：chunk={} asset={} attempt={}",
            download.id,
            plan.assets[asset_index].name,
            assembly_repairs,
          );
          let shared = shared_cache_root.clone();
          let spool = spool_root.clone();
          let invalidated = download.clone();
          let tracker = Arc::clone(&spool_tracker);
          tauri::async_runtime::spawn_blocking(move || {
            invalidate_install_chunk_caches(&shared, &spool, &invalidated, &tracker);
          })
          .await
          .map_err(|error| format!("作废组装缓存 worker 异常退出：{error}"))?;
          pending.push(download);
        }
      }
    }
  }
  .await;
  InstallAssetJobCompletion { asset_index, reserved_bytes, result }
}

#[allow(dead_code)]
/// 按批次串行下载并组装安装资源的备用流水线。
/// @since Beta v0.13.0
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
      value.download_current_file = plan.assets.get(asset_cursor).map(|asset| asset.name.clone());
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
        let assemble_plan_id = plan.plan_id.clone();
        let assemble_download_index = Arc::clone(download_index);
        let assemble_staging = staging_root.to_path_buf();
        let assemble_shared = shared_cache_root.to_path_buf();
        let assemble_spool = spool_root.to_path_buf();
        let assemble_canceled = Arc::clone(canceled);
        async move {
          spawn_assembly_worker(&assemble_plan_id, move || {
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
    value.assembly_current_file = Some(plan.assets[completed - 1].name.clone());
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

/// 把安装流水线错误写入任务日志，并按暂停/取消/失败发布终态。
/// @since Beta v0.13.0
async fn persist_install_stream_error(
  task_root: &Path,
  events: &TaskEventDispatcher,
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
  if !paused_requested && !canceled_requested {
    value.error_message = Some(error);
  } else if canceled_requested {
    value.error_message = None;
  }
  value.download_current_file = None;
  value.assembly_current_file = None;
  value.current_file = None;
  value.bytes_per_second = 0;
  value.eta_seconds = None;
  value.touch();
  let _ = journal::persist(task_root, &value);
  let _ = journal::forget_progress(task_root, &value.task_id);
  let summary = value.summary();
  drop(value);
  events.publish_state(summary);
}

/// 释放已完成安装资源不再需要的 spool 分片。
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

/// 统计前 N 个资源已消费或已缓存可用的下载对象数量。
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

/// 继续执行已有的资源修复清单。
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

/// 合并执行资源修复计划，包含下载缺失分片与提交修复。
async fn run_repair(
  app_handle: AppHandle,
  task_root: PathBuf,
  game_root: PathBuf,
  mut installation: GameInstallation,
  plan: PersistedPlan,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  files: Vec<super::planner::PlanFile>,
) -> Result<(), String> {
  {
    let mut value = journal.lock().await;
    if let Err(error) = committer::restore_repair_publication(&plan.plan_id, &game_root, &mut value)
    {
      value.state = PackageTaskState::RecoveryRequired;
      value.error_message = Some(error.clone());
      value.touch();
      journal::persist(&task_root, &value)?;
      return Err(error);
    }
    value.touch();
    journal::persist(&task_root, &value)?;
    installation.version = plan.source_tag.clone();
  }
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
  let _space_guard = if plan.fallback.is_some() {
    let download_remaining = pending.iter().try_fold(0_u64, |sum, item| {
      sum.checked_add(item.compressed_size).ok_or_else(|| "修复下载预算溢出".to_string())
    })?;
    let incoming_remaining = repair_plan.assets.iter().try_fold(0_u64, |sum, item| {
      sum.checked_add(item.size).ok_or_else(|| "修复组装预算溢出".to_string())
    })?;
    // 修复先在任务卷 staging 组装，再复制到游戏卷 repair-incoming。
    let cache_remaining = download_remaining
      .checked_add(incoming_remaining)
      .ok_or_else(|| "修复暂存预算溢出".to_string())?;
    reserve_update_space(
      &plan.plan_id,
      UpdateSpaceReservation {
        cache_root: cache_root.clone(),
        game_root: game_root.clone(),
        cache_remaining,
        incoming_remaining,
      },
    )?;
    Some(UpdateSpaceGuard(plan.plan_id.clone()))
  } else {
    None
  };
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
      let downloaded = result?;
      release_update_space(&plan.plan_id, downloaded.bytes, 0);
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

/// 执行换服下载、准备与提交流水线。
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
      persist_terminal_journal(&task_root, &mut journal_value, error, canceled_flag, |summary| {
        emit_state(&app_handle, &summary);
      });
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
      persist_terminal_journal(&task_root, &mut journal_value, error, false, |summary| {
        emit_state(&app_handle, &summary);
      });
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
          persist_terminal_journal(&task_root, &mut journal_value, error, false, |summary| {
            emit_state(&app_handle, &summary);
          });
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

/// 完成语音包安装记录同步，并把任务推进到已完成状态。
async fn finalize_audio_registration(
  app_handle: &AppHandle,
  task_root: &Path,
  pool: &sqlx::SqlitePool,
  plan: &PersistedPlan,
  game_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
) -> Result<PackageTaskSummary, String> {
  let selection =
    plan.audio_selection.as_ref().ok_or_else(|| "语音包计划缺少语言选择".to_string())?;
  if journal.lock().await.state != PackageTaskState::RegistrationPending {
    return Err("语音包任务当前不在安装记录同步阶段".to_string());
  }
  let actual = match normalize_audio_languages(inspect_audio_languages(game_root)) {
    Ok(actual) => actual,
    Err(_) => {
      let error = "应用完成后未识别到有效语音包".to_string();
      persist_audio_registration_error(app_handle, task_root, journal, &error).await;
      return Err(error);
    }
  };
  if actual != selection.target_audio_languages {
    let error = "应用完成后的语音包标记与计划目标不一致".to_string();
    persist_audio_registration_error(app_handle, task_root, journal, &error).await;
    return Err(error);
  }
  let is_chosen =
    sqlx::query_scalar::<_, bool>("SELECT isChosen FROM GameInstallation WHERE id = ?")
      .bind(&plan.installation_id)
      .fetch_optional(pool)
      .await
      .map_err(|error| format!("读取主启动状态失败：{error}"))?
      .unwrap_or(false);
  if is_chosen {
    if let Err(error) = super::launch::sync_voice_language(game_root, &actual) {
      persist_audio_registration_error(app_handle, task_root, journal, &error).await;
      return Err(error);
    }
  }
  let audio_languages = serde_json::to_string(&selection.target_audio_languages)
    .map_err(|error| format!("序列化语音包安装记录失败：{error}"))?;
  let updated_at = Utc::now().to_rfc3339();
  let result =
    sqlx::query("UPDATE GameInstallation SET audioLanguages = ?, lastSeen = ? WHERE id = ?")
      .bind(audio_languages)
      .bind(updated_at)
      .bind(&plan.installation_id)
      .execute(pool)
      .await;
  match result {
    Ok(result) if result.rows_affected() == 1 => {}
    Ok(_) => {
      let error = "同步语音包安装记录失败：未找到对应安装".to_string();
      persist_audio_registration_error(app_handle, task_root, journal, &error).await;
      return Err(error);
    }
    Err(error) => {
      let error = format!("同步语音包安装记录失败：{error}");
      persist_audio_registration_error(app_handle, task_root, journal, &error).await;
      return Err(error);
    }
  }
  let mut journal_value = journal.lock().await;
  if journal_value.state != PackageTaskState::RegistrationPending {
    return Err("语音包任务当前不在安装记录同步阶段".to_string());
  }
  journal_value.state = PackageTaskState::Completed;
  journal_value.error_message = None;
  journal_value.current_file = None;
  journal_value.touch();
  journal::persist(task_root, &journal_value)?;
  let summary = journal_value.summary();
  emit_state(app_handle, &summary);
  emit_progress(app_handle, &summary);
  Ok(summary)
}

/// 记录语音包安装同步失败，任务保持等待重试状态。
async fn persist_audio_registration_error(
  app_handle: &AppHandle,
  task_root: &Path,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  error: &str,
) {
  let mut journal_value = journal.lock().await;
  journal_value.state = PackageTaskState::RegistrationPending;
  journal_value.error_message = Some(error.to_string());
  journal_value.current_file = Some("等待同步语音包安装记录".to_string());
  journal_value.touch();
  let _ = journal::persist(task_root, &journal_value);
  emit_state(app_handle, &journal_value.summary());
}

/// 重试只涉及 SQLite 投影的语音包任务最终同步。
pub(crate) async fn retry_audio_registration(
  app_handle: &AppHandle,
  task_root: &Path,
  pool: &sqlx::SqlitePool,
  plan: &PersistedPlan,
  game_root: &Path,
) -> Result<PackageTaskSummary, String> {
  if plan.target != PackagePlanTarget::Audio {
    return Err("当前任务不是语音包管理任务".to_string());
  }
  let journal =
    Arc::new(AsyncMutex::new(journal::load(&journal::journal_path(task_root, &plan.plan_id))?));
  finalize_audio_registration(app_handle, task_root, pool, plan, game_root, &journal).await
}

/// 执行纯下载型资源任务；预下载在缓存完成后终止，其他目标推进到待提交状态。
/// @since Beta v0.13.0
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
  let events = match TaskEventDispatcher::for_install(app_handle.clone(), &plan.plan_id) {
    Ok(events) => events,
    Err(error) => {
      log::error!("[game-package][install][{}] 创建安装事件派发线程失败：{error}", plan.plan_id);
      let mut journal_value = journal.lock().await;
      journal_value.state = PackageTaskState::Failed;
      journal_value.error_message = Some(format!("创建安装事件派发线程失败：{error}"));
      journal_value.touch();
      let _ = journal::persist(task_root, &journal_value);
      let summary = journal_value.summary();
      drop(journal_value);
      emit_state(&app_handle, &summary);
      emit_progress(&app_handle, &summary);
      return;
    }
  };
  {
    let mut journal_value = journal.lock().await;
    if paused.load(Ordering::Acquire) {
      journal_value.state = PackageTaskState::Paused;
      journal_value.error_message = None;
      journal_value.touch();
      if let Err(error) = journal::persist(task_root, &journal_value) {
        persist_terminal_journal(task_root, &mut journal_value, error, false, |summary| {
          events.publish_state(summary);
        });
        return;
      }
      let summary = journal_value.summary();
      drop(journal_value);
      events.publish_state(summary);
      return;
    }
    journal_value.state = PackageTaskState::Downloading;
    journal_value.download_current_file = None;
    journal_value.assembly_current_file = None;
    journal_value.touch();
    if let Err(error) = journal::persist(task_root, &journal_value) {
      persist_terminal_journal(task_root, &mut journal_value, error, false, |summary| {
        events.publish_state(summary);
      });
      return;
    }
    let summary = journal_value.summary();
    drop(journal_value);
    events.publish_state(summary);
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
    let current_file =
      download_labels.get(&download.cache_key).cloned().unwrap_or_else(|| download.id.clone());
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
          let summary = journal_value.summary();
          drop(journal_value);
          events.publish_progress(summary);
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
    let draft_canceled = install_context.as_ref().is_none_or(|context| {
      installer::cancel_draft(task_root, &context.draft_id, false, &mut |_, _, _| {}).is_ok()
    });
    if draft_canceled {
      journal_value.state = PackageTaskState::Canceled;
      journal_value.error_message = None;
    } else {
      journal_value.state = PackageTaskState::RecoveryRequired;
      journal_value.error_message =
        Some("取消时已进入安装提交边界，请通过恢复入口继续处理".to_string());
    }
  } else if journal_value.owned_cache_files.len() == plan.downloads.len() {
    // Pre-download is an independent cache warm-up task.  Once every chunk has
    // been validated it is complete; publication creates a separate Main plan
    // which can reuse these chunks.  It must never wait in ReadyToApply (that
    // state is reserved for tasks that still need to mutate the game tree).
    journal_value.state = if plan.target == PackagePlanTarget::PreDownload {
      PackageTaskState::Completed
    } else {
      PackageTaskState::ReadyToApply
    };
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
    persist_terminal_journal(task_root, &mut journal_value, error, false, |summary| {
      events.publish_state(summary);
    });
    return;
  }
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
  discard_plan_transaction_on_cancel(&journal_value);
  let summary = journal_value.summary();
  drop(journal_value);
  events.publish_state(summary);
  if should_install {
    if let Some(context) = install_context {
      run_install_task(
        events,
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

/// 执行下载完成后的安装提交与游戏登记。
/// @since Beta v0.13.0
async fn run_install_task(
  events: TaskEventDispatcher,
  task_root: PathBuf,
  plan: Arc<PersistedPlan>,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  context: InstallContext,
  metrics: Option<Arc<InstallPipelineMetrics>>,
) {
  let snapshot = Arc::clone(&journal);
  let events_for_blocking = events.clone();
  let task_root_for_blocking = task_root.clone();
  let plan_for_blocking = Arc::clone(&plan);
  let canceled_for_blocking = Arc::clone(&canceled);
  let machine_uid = context.machine_uid.clone();
  let result = tauri::async_runtime::spawn_blocking(move || {
    let mut journal_value = snapshot.blocking_lock().clone();
    let mut validation_timing = installer::InstallValidationTiming::default();
    let emit = |value: &TaskJournal| {
      *snapshot.blocking_lock() = value.clone();
      events_for_blocking.publish_state(value.summary());
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
            let summary = value.summary();
            drop(value);
            events.publish_state(summary);
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
      let summary = value.summary();
      drop(value);
      events.publish_state(summary);
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
    let summary = value.summary();
    drop(value);
    events.publish_state(summary);
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
  let summary = value.summary();
  drop(value);
  events.publish_state(summary);
}

/// 按磁盘缓存重建纯下载任务的完成缓存状态。
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

/// 按共享缓存与 spool 重建安装任务的缓存与下载进度。
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

/// 按共享缓存或 spool 任一命中重建下载完成状态。
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

/// 校验流式安装所需磁盘空间，按是否同卷分别计算缓存与安装需求。
fn check_install_stream_space_with_spool<'a>(
  plan: &PersistedPlan,
  asset_index: usize,
  pending: impl IntoIterator<Item = &'a PlanDownload>,
  current_spool: u64,
) -> Result<(), String> {
  let overlay = plan.install_overlay.as_ref().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let remaining_assets = plan.assets.iter().skip(asset_index).try_fold(0_u64, |total, asset| {
    total.checked_add(asset.size).ok_or_else(|| "安装空间需求溢出".to_string())
  })?;
  let pending_bytes = pending.into_iter().try_fold(0_u64, |total, download| {
    total.checked_add(download.compressed_size).ok_or_else(|| "下载空间需求溢出".to_string())
  })?;
  let sdk_bytes = if asset_index >= plan.assets.len() {
    overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size)
  } else {
    0
  };
  let spool_parent = Path::new(&overlay.spool_root).parent().unwrap_or(Path::new("."));
  let game_parent = Path::new(&overlay.game_root).parent().unwrap_or(Path::new("."));
  let same_volume = same_volume(spool_parent, game_parent);
  let cache_required =
    current_spool.saturating_add(pending_bytes).saturating_add(SAFETY_MARGIN_BYTES);
  let install_required = remaining_assets
    .saturating_add(sdk_bytes)
    .saturating_add(if same_volume { current_spool.saturating_add(pending_bytes) } else { 0 })
    .saturating_add(SAFETY_MARGIN_BYTES);
  if same_volume {
    let available = fs2::available_space(game_parent)
      .map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
    if available < install_required {
      return Err(format!(
        "安装磁盘空间不足：至少需要 {install_required} 字节，可用 {available} 字节"
      ));
    }
    return Ok(());
  }
  let spool_available = fs2::available_space(spool_parent)
    .map_err(|error| format!("读取安装任务 spool 磁盘剩余空间失败：{error}"))?;
  if spool_available < cache_required {
    return Err(format!(
      "安装任务 spool 磁盘空间不足：至少需要 {cache_required} 字节，可用 {spool_available} 字节"
    ));
  }
  let install_available = fs2::available_space(game_parent)
    .map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
  let install_only = remaining_assets.saturating_add(sdk_bytes).saturating_add(SAFETY_MARGIN_BYTES);
  if install_available < install_only {
    return Err(format!(
      "安装磁盘空间不足：至少需要 {install_only} 字节，可用 {install_available} 字节"
    ));
  }
  Ok(())
}

/// 读取当前 spool 占用后执行流式安装磁盘空间校验。
fn check_install_stream_space<'a>(
  plan: &PersistedPlan,
  asset_index: usize,
  pending: impl IntoIterator<Item = &'a PlanDownload>,
  spool_root: &Path,
) -> Result<(), String> {
  check_install_stream_space_with_spool(plan, asset_index, pending, spool_bytes(spool_root))
}

/// 统计目录内全部普通文件的字节数。
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
        .map(|sdk| sdk.pkg_version_file_name.clone())
        .or_else(|| asset_names.get(&download.id).cloned())
        .unwrap_or_else(|| download.id.clone());
      (download.cache_key.clone(), truncate_progress_label(label))
    })
    .collect()
}

/// 按字节边界截断过长的进度标签。
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

/// 取消任务时回收该计划在游戏目录中已组装的事务目录。
///
/// 正式更新与配音包变更边下边组装，组装成品落在 `<游戏根>/.teyvatguide-update/<planId>`；
/// 取消是用户明确的结束意图，这里整目录回收以免残留占用游戏盘。已下载的分片缓存不在此列，
/// 之后恢复任务只需重新组装，无需重新下载。
fn discard_plan_transaction_on_cancel(journal: &TaskJournal) {
  if journal.state != PackageTaskState::Canceled {
    return;
  }
  let Some(game_root) = journal.game_root.as_deref() else {
    return;
  };
  if let Err(error) =
    committer::discard_transaction_directory(&journal.plan_id, Path::new(game_root))
  {
    log::warn!("[game-package][{}] 取消任务时清理游戏目录事务失败：{error}", journal.plan_id);
  }
}

/// 清理指定任务残留的 `.part.<task_id>` 下载临时文件。
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

/// 写入并发布取消/失败等终态日志。
fn persist_terminal_journal(
  task_root: &Path,
  journal: &mut TaskJournal,
  error: String,
  canceled: bool,
  emit: impl FnOnce(PackageTaskSummary),
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
  emit(journal.summary());
}

/// 记录安装任务失败日志。
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

#[cfg(target_os = "windows")]
const GAME_PROCESS_NAME: &str = "YuanShen.exe";

#[cfg(target_os = "windows")]
/// 判断国服客户端进程是否正在运行。
pub(crate) fn is_game_running() -> bool {
  yuan_shen_process_ids().map(|ids| !ids.is_empty()).unwrap_or(true)
}

#[cfg(not(target_os = "windows"))]
/// 非 Windows 平台不识别国服客户端，恒返回未运行。
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
/// 枚举当前国服客户端进程 ID。
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
/// 强制结束指定 PID 的国服客户端进程。
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
  use super::*;

  /// 测试专用输出目录，删除前确认仍位于本任务创建的临时根下。
  /// @since Beta v0.13.0
  struct AudioDrainFixture(PathBuf);

  impl Drop for AudioDrainFixture {
    /// 仅清理此测试创建的目录。
    /// @since Beta v0.13.0
    fn drop(&mut self) {
      assert_eq!(self.0.parent(), Some(std::env::temp_dir().as_path()));
      assert!(
        self.0.file_name().unwrap().to_string_lossy().starts_with("teyvatguide-audio-drain-")
      );
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  /// 展开断言失败时仍释放模拟阻塞写入的 worker。
  /// @since Beta v0.13.0
  struct AudioWorkerRelease(Option<std::sync::mpsc::Sender<()>>);

  impl Drop for AudioWorkerRelease {
    /// 通知 worker 退出，避免测试失败后遗留阻塞线程。
    /// @since Beta v0.13.0
    fn drop(&mut self) {
      if let Some(sender) = self.0.take() {
        let _ = sender.send(());
      }
    }
  }

  /// 构造不依赖真实应用或安装目录的运行任务身份。
  /// @since Beta v0.13.0
  fn active_task_for_test(task_id: &str, canceled: Arc<AtomicBool>) -> ActiveTask {
    ActiveTask {
      installation_id: "install-a".to_string(),
      canceled,
      paused: Arc::new(Mutex::new(Arc::new(AtomicBool::new(true)))),
      manual_pause_requested: Arc::new(AtomicBool::new(false)),
      journal: Arc::new(AsyncMutex::new(TaskJournal::from_switch(
        task_id.to_string(),
        "install-a".to_string(),
        super::super::model::SchemeId::CnOfficial,
        super::super::model::SchemeId::CnOfficial,
        "a".repeat(64),
        0,
        0,
      ))),
    }
  }

  /// 在隔离临时目录登记没有系统拥有路径的正式更新。
  /// @since Beta v0.13.0
  fn update_defender_fixture(state: PackageTaskState) -> (AudioDrainFixture, TaskJournal) {
    let fixture = AudioDrainFixture(
      std::env::temp_dir().join(format!("teyvatguide-audio-drain-{}", Uuid::new_v4())),
    );
    let mut value = TaskJournal::from_switch(
      Uuid::new_v4().to_string(),
      "install-a".to_string(),
      super::super::model::SchemeId::CnOfficial,
      super::super::model::SchemeId::CnOfficial,
      "a".repeat(64),
      0,
      0,
    );
    value.target = PackagePlanTarget::Main;
    value.operation = "update".to_string();
    value.state = state;
    journal::persist(&fixture.0, &value).unwrap();
    let dirs = defender::InstallDefenderDirs {
      target_root: "C:\\tg-unit-game".to_string(),
      spool_root: String::new(),
      staging_root: String::new(),
      download_root: "C:\\tg-unit-cache".to_string(),
      journal_root: String::new(),
    };
    defender::persist_registry(
      &fixture.0,
      &value.plan_id,
      &dirs,
      &[],
      defender::DefenderRegistryState::Active,
    )
    .unwrap();
    (fixture, value)
  }

  /// 正式更新的排除必须保留到所有阻塞组装 worker 退出。
  /// @since Beta v0.13.0
  #[test]
  fn update_defender_cleanup_waits_for_assembly_workers() {
    let (fixture, value) = update_defender_fixture(PackageTaskState::Completed);
    let manager = GamePackageManager::new();
    let reservation =
      TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &value.task_id)
        .unwrap()
        .with_defender_cleanup(&fixture.0, PackagePlanTarget::Main);
    let (sender, receiver) = std::sync::mpsc::channel();
    let release = AudioWorkerRelease(Some(sender));
    let worker = spawn_assembly_worker(&value.task_id, move || {
      receiver.recv().unwrap();
    });
    drop(reservation);
    assert!(manager.is_task_running(&value.task_id, "install-a").unwrap());
    assert!(defender::has_registry(&fixture.0, &value.plan_id));
    assert!(
      TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &value.task_id).is_err()
    );
    drop(release);
    tauri::async_runtime::block_on(async {
      worker.await.unwrap();
      tokio::time::timeout(Duration::from_secs(2), manager.wait_for_task_idle(&value.task_id))
        .await
        .unwrap()
        .unwrap();
    });
    assert!(!defender::has_registry(&fixture.0, &value.plan_id));
  }

  /// 暂停、待应用与待恢复任务继续保留排除，并同步释放运行互斥以便继续操作。
  /// @since Beta v0.13.0
  #[test]
  fn update_defender_cleanup_preserves_recoverable_tasks() {
    for state in [
      PackageTaskState::Paused,
      PackageTaskState::ReadyToApply,
      PackageTaskState::RecoveryRequired,
      PackageTaskState::RepairRequired,
    ] {
      let (fixture, value) = update_defender_fixture(state);
      let manager = GamePackageManager::new();
      let reservation =
        TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &value.task_id)
          .unwrap()
          .with_defender_cleanup(&fixture.0, PackagePlanTarget::Main);
      drop(reservation);
      assert!(!manager.is_task_running(&value.task_id, "install-a").unwrap());
      assert!(defender::has_registry(&fixture.0, &value.plan_id));
      assert!(!update_exclusions_need_cleanup(&fixture.0, &value.task_id).unwrap());
    }
  }

  /// 终态和未启动计划允许清理，损坏日志不能被猜测为终态。
  /// @since Beta v0.13.0
  #[test]
  fn update_defender_cleanup_requires_terminal_or_missing_journal() {
    for state in [
      PackageTaskState::Completed,
      PackageTaskState::Failed,
      PackageTaskState::Canceled,
      PackageTaskState::Abandoned,
    ] {
      let (fixture, value) = update_defender_fixture(state);
      assert!(update_exclusions_need_cleanup(&fixture.0, &value.task_id).unwrap());
      let path = journal::journal_path(&fixture.0, &value.task_id);
      fs::write(&path, "invalid journal").unwrap();
      assert!(update_exclusions_need_cleanup(&fixture.0, &value.task_id).is_err());
      fs::remove_file(&path).unwrap();
      assert!(update_exclusions_need_cleanup(&fixture.0, &value.task_id).unwrap());
    }
  }

  /// 流水线已退出但组装仍阻塞时，既有互斥必须继续保护回滚、清理与恢复。
  /// @since Beta v0.13.0
  #[test]
  fn reservation_survives_until_blocking_worker_finishes() {
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let reservation = TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &task_id)
      .expect("预留安装互斥失败");
    manager
      .active
      .lock()
      .unwrap()
      .by_task
      .insert(task_id.clone(), active_task_for_test(&task_id, reservation.canceled_flag()));
    let (release_sender, release_receiver) = std::sync::mpsc::channel();
    let release = AudioWorkerRelease(Some(release_sender));
    let worker = spawn_assembly_worker(&task_id, move || {
      release_receiver.recv().expect("等待组装退出信号失败");
    });
    drop(reservation);
    assert!(manager.is_task_running(&task_id, "install-a").unwrap());
    assert!(manager.active.lock().unwrap().by_task.contains_key(&task_id));
    assert!(TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &task_id).is_err());
    assert!(manager.reserve_cache_clear().is_err());
    let unused_root =
      std::env::temp_dir().join(format!("teyvatguide-audio-drain-{}", Uuid::new_v4()));
    assert!(manager.request_or_reap_cancel(&unused_root, &task_id).unwrap().is_none());
    assert_eq!(
      manager.remove_task(&unused_root, &task_id).err().as_deref(),
      Some("任务仍在运行，无法删除任务记录"),
    );
    let runtime = tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap();
    runtime.block_on(async {
      assert!(
        tokio::time::timeout(Duration::from_millis(20), manager.wait_for_task_idle(&task_id),)
          .await
          .is_err()
      );
    });
    drop(release);
    runtime.block_on(worker).expect("组装 worker 异常退出");
    runtime.block_on(async {
      tokio::time::timeout(Duration::from_secs(2), manager.wait_for_task_idle(&task_id))
        .await
        .expect("组装结束后安装互斥未释放")
        .expect("等待安装空闲失败");
    });
    assert!(manager.active.lock().unwrap().by_task.is_empty());
    assert!(manager.reserve_cache_clear().is_ok());
  }

  /// 旧任务延迟释放不能清除使用同一 key、但取消令牌已更换的新任务。
  /// @since Beta v0.13.0
  #[test]
  fn reservation_release_preserves_replacement_identity() {
    let manager = GamePackageManager::new();
    let task_id = Uuid::new_v4().to_string();
    let reservation = TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &task_id)
      .expect("预留安装互斥失败");
    let replacement = Arc::new(AtomicBool::new(false));
    {
      let mut active = manager.active.lock().unwrap();
      active.by_installation.get_mut("install-a").unwrap().canceled = Arc::clone(&replacement);
      active
        .by_task
        .insert(task_id.clone(), active_task_for_test(&task_id, Arc::clone(&replacement)));
    }
    drop(reservation);
    assert!(manager.is_task_running(&task_id, "install-a").unwrap());
    assert!(manager.active.lock().unwrap().by_task.contains_key(&task_id));
    release_task_reservation(&manager.active, "install-a", &task_id, &replacement);
    assert!(!manager.is_task_running(&task_id, "install-a").unwrap());
    let reservation = TaskReservation::acquire(Arc::clone(&manager.active), "install-a", &task_id)
      .expect("释放旧身份后应能再次预留");
    drop(reservation);
    assert!(!manager.is_task_running(&task_id, "install-a").unwrap());
  }

  /// 配音恢复入口不能越过仍在写盘的上一轮 worker，超时须保存暂停并保留输出。
  /// @since Beta v0.13.0
  #[test]
  fn audio_recovery_waits_for_worker_and_preserves_paused_output() {
    let fixture = AudioDrainFixture(
      std::env::temp_dir().join(format!("teyvatguide-audio-drain-{}", Uuid::new_v4())),
    );
    fs::create_dir_all(&fixture.0).expect("创建配音恢复测试目录失败");
    let output = fixture.0.join("unfinished-output");
    fs::write(&output, b"keep previous output").expect("写入未完成输出失败");
    let mut value = TaskJournal::from_switch(
      Uuid::new_v4().to_string(),
      "install-a".to_string(),
      super::super::model::SchemeId::CnOfficial,
      super::super::model::SchemeId::CnOfficial,
      "a".repeat(64),
      0,
      0,
    );
    value.target = PackagePlanTarget::Audio;
    value.operation = "audio".to_string();
    value.state = PackageTaskState::Paused;
    value.assembly_total_count = 3;
    value.assembly_completed_count = 1;
    value.assembly_total_bytes = 300;
    value.assembly_completed_bytes = 100;
    value.assembly_completed_bytes_total = 100;
    value.completed_asset_cursor = 1;
    value.active_assembly_count = 1;
    value.bytes_per_second = 1024;
    value.eta_seconds = Some(2);
    value.assembly_bytes_per_second = 2048;
    value.assembly_eta_seconds = Some(3);
    value.assembly_current_file = Some("unfinished-output".to_string());

    let (release_sender, release_receiver) = std::sync::mpsc::channel();
    let release = AudioWorkerRelease(Some(release_sender));
    let worker = spawn_assembly_worker(&value.plan_id, move || {
      release_receiver.recv().expect("等待配音 worker 退出信号失败");
    });
    let runtime = tokio::runtime::Builder::new_current_thread()
      .enable_all()
      .build()
      .expect("创建配音恢复测试运行时失败");
    let result =
      runtime.block_on(drain_audio_workers_before_start(&fixture.0, &mut value, Duration::ZERO));
    assert_eq!(result, Err(AUDIO_WORKER_DRAIN_MESSAGE.to_string()));
    let persisted =
      journal::load(&fixture.0.join("tasks").join(&value.task_id).join("journal.json"))
        .expect("读取暂停日志失败");
    assert_eq!(persisted.state, PackageTaskState::Paused);
    assert_eq!(persisted.error_message.as_deref(), Some(AUDIO_WORKER_DRAIN_MESSAGE));
    assert_eq!(persisted.active_assembly_count, 0);
    assert_eq!(persisted.bytes_per_second, 0);
    assert_eq!(persisted.eta_seconds, None);
    assert_eq!(persisted.assembly_bytes_per_second, 0);
    assert_eq!(persisted.assembly_eta_seconds, None);
    assert_eq!(persisted.assembly_current_file, None);
    assert_eq!(persisted.assembly_completed_bytes, 100);
    assert_eq!(persisted.completed_asset_cursor, 1);
    assert_eq!(fs::read(&output).expect("未完成输出不应被清理"), b"keep previous output");

    drop(release);
    runtime.block_on(worker).expect("配音 worker 异常退出");
    assert!(
      runtime
        .block_on(drain_audio_workers_before_start(&fixture.0, &mut value, Duration::from_secs(2),))
        .is_ok()
    );
  }

  /// 验证任务展示使用容错扫描，同时保留有效任务与 Invalid 历史记录。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn list_uses_scan_records_without_cross_task_failure() {
    let task_root =
      std::env::temp_dir().join(format!("teyvatguide-package-list-{}", Uuid::new_v4()));
    let valid_id = Uuid::new_v4().to_string();
    let valid = TaskJournal::from_switch(
      valid_id.clone(),
      "install-a".to_string(),
      super::super::model::SchemeId::CnOfficial,
      super::super::model::SchemeId::CnOfficial,
      "a".repeat(64),
      0,
      0,
    );
    journal::persist(&task_root, &valid).expect("写入有效任务日志失败");
    fs::write(task_root.join("tasks").join(&valid_id).join("plan.json"), b"{}")
      .expect("写入有效计划占位文件失败");

    let invalid_id = Uuid::new_v4().to_string();
    let invalid_dir = task_root.join("tasks").join(&invalid_id);
    fs::create_dir_all(&invalid_dir).expect("创建无效任务目录失败");
    fs::write(invalid_dir.join("journal.json"), b"not-json").expect("写入无效日志失败");
    fs::write(invalid_dir.join("plan.json"), b"{}").expect("写入无效计划占位文件失败");

    let runtime = tokio::runtime::Builder::new_current_thread()
      .enable_all()
      .build()
      .expect("创建任务列表测试运行时失败");
    let manager = GamePackageManager::new();
    let summaries = runtime
      .block_on(manager.list(&task_root, Some("install-a")))
      .expect("有效任务不应被无效历史记录阻断");
    assert_eq!(summaries.len(), 1);
    assert_eq!(summaries[0].task_id, valid_id);

    let records = runtime.block_on(manager.record_list(&task_root)).expect("历史任务扫描不应失败");
    assert!(records.iter().any(|record| matches!(record.kind, PackageTaskRecordKind::Task)));
    assert!(records.iter().any(|record| matches!(record.kind, PackageTaskRecordKind::Invalid)));

    let _ = fs::remove_dir_all(task_root);
  }
}
