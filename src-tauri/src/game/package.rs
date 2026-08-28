//! 可恢复资源下载任务编排、安装互斥、取消与事件投影。
//! @since Beta v0.11.5

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
    PackageTaskCleanupSummary, PackageTaskOptions, PackageTaskState, PackageTaskSummary,
    PackageVerifySummary,
  },
  path_guard::{prepare_manifest_output_file, resolve_optional_manifest_file},
  planner::{
    PersistedPlan, PlanDelete, PlanDownload, cached_chunk_matches, cached_chunk_matches_async,
    default_install_concurrency, flush_cache_validation_index, hydrate_and_validate_apply_plan,
    hydrate_and_validate_repair_plan, install_spool_window, load_persisted_plan,
    persist_validated_plan, same_volume, scan_cached_downloads,
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
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
    mpsc::{SyncSender, sync_channel},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, ipc::Channel};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::{Mutex as AsyncMutex, Semaphore};
use uuid::Uuid;

const MAX_CONCURRENCY: usize = 64;
const MIN_ASSEMBLY_CONCURRENCY: usize = 4;
const MIN_RATE_LIMIT: u64 = 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
// 中止后等待上一轮组装 worker 收尾的上限。卡在磁盘 syscall 的 worker 无法被中断，
// 等待过长会让恢复安装长时间停在“正在准备”；30 秒足够健康的 worker 完成当前分块。
const INSTALL_ABORT_DRAIN_TIMEOUT: Duration = Duration::from_secs(30);
const UI_PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(150);
const UI_PROGRESS_EMIT_SLOT_TTL: Duration = Duration::from_secs(60);
const INSTALL_STALL_THRESHOLD: Duration = Duration::from_secs(45);
const INSTALL_STALL_POLL_INTERVAL: Duration = Duration::from_secs(5);
const INSTALL_STALL_CONFIRMATIONS: usize = 3;
// 看门狗写入自动暂停状态时等待流水线释放 journal 锁的上限；超时后直接从磁盘回退写入，
// 避免被“持有锁等待无超时磁盘 I/O”的流水线永久卡住。
const INSTALL_WATCHDOG_PAUSE_LOCK_TIMEOUT: Duration = Duration::from_secs(5);
const INSTALL_AUTO_STALL_RETRY_LIMIT: usize = 1;
const INSTALL_AUTO_STALL_RETRY_MESSAGE: &str = "检测到持续停滞，正在自动重试 1/1";
const INSTALL_STALL_PAUSE_MESSAGE: &str =
  "检测到下载写入或资源组装持续停滞，任务已自动暂停；可从任务记录继续。详情见运行日志。";
const INSTALL_STALL_NOTIFICATION_TITLE: &str = "游戏安装已暂停";
const INSTALL_STALL_NOTIFICATION_BODY: &str =
  "自动重试后仍检测到磁盘 I/O 持续停滞，请检查磁盘状态后手动继续。";
/// 配音包同时让 4 个资源占用下载槽；真正下多少仍由这个焦点信号量卡住。
const AUDIO_DOWNLOAD_FOCUS: usize = 4;
/// 4 路下载之外再预取 1 个资源，焦点空出后立刻接上下一包。
const AUDIO_DOWNLOAD_PREFETCH: usize = 1;

/// 安装流水线停滞看门狗：独立线程联合检查 journal 与下载/组装阶段心跳。
fn spawn_install_stall_watchdog(
  app_handle: AppHandle,
  events: InstallEventDispatcher,
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
      let download = metrics.download_telemetry.snapshot();
      let assembly = metrics.assembly_telemetry.snapshot();
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
      if confirmations >= INSTALL_STALL_CONFIRMATIONS
        && !metrics.stall_pause_requested.swap(true, Ordering::AcqRel)
      {
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

/// 纯网络等待由单对象 I/O 超时处理；看门狗只对写盘/组装停滞整单暂停。
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
    "[game-install][{plan_id}] 安装流水线停滞样本：stalled={}s journalAge={}s confirmation={}/{} activeDownloads={} activeAssemblies={} downloadHeartbeatAge={}ms downloadNetworkActive={} downloadWriteActive={} downloadNetworkOps={} downloadWriteOps={} downloadWrittenBytes={} downloadNetworkMax={}ms downloadWriteMax={}ms assemblyHeartbeatAge={}ms assemblyReadActive={} assemblyWriteActive={} assemblyHashActive={} assemblySyncActive={} assemblyReadOps={} assemblyWriteOps={} assemblyHashOps={} assemblySyncOps={} assemblyReadBytes={} assemblyWrittenBytes={} assemblyHashedBytes={} assemblyReadMax={}ms assemblyWriteMax={}ms assemblyHashMax={}ms assemblySyncMax={}ms queueRefills={}",
    stalled_for.as_secs(),
    journal_age_seconds,
    confirmations,
    INSTALL_STALL_CONFIRMATIONS,
    metrics.active_downloads.load(Ordering::Relaxed),
    metrics.active_assemblies.load(Ordering::Relaxed),
    download.last_activity_age_millis,
    download.active_network_waits,
    download.active_local_writes,
    download.network_wait_operation_count,
    download.local_write_operation_count,
    download.local_written_bytes,
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
    metrics.queue_refill_count.load(Ordering::Relaxed),
  );
}

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

fn persist_install_watchdog_pause(
  events: &InstallEventDispatcher,
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

/// 组装进度条用写出增量叠加已完成成品，不把预分配或会话写出写进 journal。
struct AudioLiveAssemblyOverlay {
  accounted_written: AtomicU64,
}

impl AudioLiveAssemblyOverlay {
  fn new() -> Self {
    Self { accounted_written: AtomicU64::new(0) }
  }

  fn display_bytes(durable_completed: u64, total: u64, written: u64, accounted: u64) -> u64 {
    durable_completed.saturating_add(written.saturating_sub(accounted)).min(total)
  }

  fn overlay(&self, journal: &TaskJournal, written: u64) -> PackageTaskSummary {
    let mut summary = journal.summary();
    summary.assembly_completed_bytes = Self::display_bytes(
      journal.assembly_completed_bytes,
      journal.assembly_total_bytes,
      written,
      self.accounted_written.load(Ordering::Relaxed),
    );
    summary
  }

  /// 只把该成品大小入账，保留其他正在写盘资源的会话增量。
  fn account_completed(&self, asset_size: u64) {
    self.accounted_written.fetch_add(asset_size, Ordering::Relaxed);
  }
}

/// 容量固定为 1 的后台事件派发器：生产者只覆盖尚未消费的旧值，永不等待事件接收端。
struct LatestEventDispatcher<T> {
  pending: Arc<Mutex<Option<T>>>,
  wake: SyncSender<()>,
}

impl<T> Clone for LatestEventDispatcher<T> {
  fn clone(&self) -> Self {
    Self { pending: Arc::clone(&self.pending), wake: self.wake.clone() }
  }
}

impl<T: Send + 'static> LatestEventDispatcher<T> {
  fn new<F>(thread_name: String, mut sink: F) -> Result<Self, String>
  where
    F: FnMut(T) + Send + 'static,
  {
    let pending = Arc::new(Mutex::new(None));
    let pending_for_worker = Arc::clone(&pending);
    let (wake, wake_receiver) = sync_channel(1);
    std::thread::Builder::new()
      .name(thread_name)
      .spawn(move || {
        let mut drain_pending = || {
          loop {
            let event = match pending_for_worker.lock() {
              Ok(mut pending) => pending.take(),
              Err(_) => return,
            };
            let Some(event) = event else {
              break;
            };
            sink(event);
          }
        };
        while wake_receiver.recv().is_ok() {
          drain_pending();
        }
        // 所有发送端已释放：最后一次排空残留事件，避免收尾时丢失状态事件
        // （例如看门狗暂停后立即中止任务，派发线程还未来得及消费）。
        drain_pending();
      })
      .map_err(|error| format!("创建配音任务事件派发线程失败：{error}"))?;
    Ok(Self { pending, wake })
  }

  fn publish_with<F>(&self, update: F)
  where
    F: FnOnce(Option<T>) -> T,
  {
    let Ok(mut pending) = self.pending.lock() else {
      return;
    };
    *pending = Some(update(pending.take()));
    drop(pending);
    let _ = self.wake.try_send(());
  }
}

struct AudioTaskEvent {
  summary: PackageTaskSummary,
  emit_state: bool,
}

#[derive(Clone)]
struct AudioEventDispatcher {
  events: LatestEventDispatcher<AudioTaskEvent>,
}

impl AudioEventDispatcher {
  fn new(app_handle: AppHandle, task_id: &str) -> Result<Self, String> {
    let thread_name = format!("tg-audio-events-{}", task_id.chars().take(8).collect::<String>());
    let events = LatestEventDispatcher::new(thread_name, move |event: AudioTaskEvent| {
      if event.emit_state {
        emit_state(&app_handle, &event.summary);
      }
      emit_progress(&app_handle, &event.summary);
    })?;
    Ok(Self { events })
  }

  fn publish_progress(&self, summary: PackageTaskSummary) {
    self.publish(summary, false);
  }

  fn publish_state(&self, summary: PackageTaskSummary) {
    self.publish(summary, true);
  }

  fn publish(&self, summary: PackageTaskSummary, emit_state: bool) {
    self.events.publish_with(|pending| newest_audio_event(pending, summary, emit_state));
  }
}

struct InstallTaskEvent {
  summary: PackageTaskSummary,
  emit_state: bool,
}

#[derive(Clone)]
struct InstallEventDispatcher {
  events: LatestEventDispatcher<InstallTaskEvent>,
}

impl InstallEventDispatcher {
  fn new(app_handle: AppHandle, task_id: &str) -> Result<Self, String> {
    let thread_name = format!("tg-install-events-{}", task_id.chars().take(8).collect::<String>());
    let events = LatestEventDispatcher::new(thread_name, move |event: InstallTaskEvent| {
      if event.emit_state {
        emit_state(&app_handle, &event.summary);
      }
      emit_progress(&app_handle, &event.summary);
    })?;
    Ok(Self { events })
  }

  fn publish_progress(&self, summary: PackageTaskSummary) {
    self.publish(summary, false);
  }

  fn publish_state(&self, summary: PackageTaskSummary) {
    self.publish(summary, true);
  }

  fn publish(&self, summary: PackageTaskSummary, emit_state: bool) {
    self.events.publish_with(|pending| newest_install_event(pending, summary, emit_state));
  }
}

/// latest-wins 槽合并：低 revision 的迟到快照不得覆盖更高 revision 的待发值，
/// 保证发送给前端的事件 revision 单调递增（前端按 revision 拒绝旧包）。
fn newest_audio_event(
  pending: Option<AudioTaskEvent>,
  summary: PackageTaskSummary,
  emit_state: bool,
) -> AudioTaskEvent {
  match pending {
    Some(pending) if pending.summary.revision > summary.revision => pending,
    Some(pending) => AudioTaskEvent { summary, emit_state: emit_state || pending.emit_state },
    None => AudioTaskEvent { summary, emit_state },
  }
}

fn newest_install_event(
  pending: Option<InstallTaskEvent>,
  summary: PackageTaskSummary,
  emit_state: bool,
) -> InstallTaskEvent {
  match pending {
    Some(pending) if pending.summary.revision > summary.revision => pending,
    Some(pending) => InstallTaskEvent { summary, emit_state: emit_state || pending.emit_state },
    None => InstallTaskEvent { summary, emit_state },
  }
}

struct AudioAssetJob {
  asset_index: usize,
  pending: Vec<(usize, PlanDownload)>,
}

struct AudioAssetJobCompletion {
  asset_index: usize,
  needs_download: bool,
  result: Result<(), String>,
}

/// 默认下载/组装并发：按 CPU 核心数，最低 4 路。
pub(crate) fn default_concurrency() -> usize {
  default_install_concurrency()
}

fn install_download_concurrency(pipeline_concurrency: usize) -> usize {
  pipeline_concurrency.clamp(1, MAX_CONCURRENCY)
}

/// 组装并发与下载默认同一套：跟随流水线 concurrency，最低 4 路，最高 64 路。
fn install_assembly_concurrency(pipeline_concurrency: usize) -> usize {
  pipeline_concurrency.clamp(MIN_ASSEMBLY_CONCURRENCY, MAX_CONCURRENCY)
}

/// 配音任务窗口：组装槽 + 4 路下载 + 1 路预取。
///
/// 下载焦点仍是 4 路；窗口放大是为了组装吃满时下一波已经在下，避免组装空档。
fn audio_pipeline_window(pipeline_concurrency: usize) -> usize {
  install_assembly_concurrency(pipeline_concurrency)
    .saturating_add(AUDIO_DOWNLOAD_FOCUS)
    .saturating_add(AUDIO_DOWNLOAD_PREFETCH)
}

#[derive(Default)]
struct ProgressEmitRegistry {
  slots: HashMap<String, Instant>,
}

static PROGRESS_EMIT_REGISTRY: LazyLock<Mutex<ProgressEmitRegistry>> =
  LazyLock::new(|| Mutex::new(ProgressEmitRegistry::default()));

fn prune_progress_emit_slots(registry: &mut ProgressEmitRegistry, now: Instant) {
  registry.slots.retain(|_, last| now.saturating_duration_since(*last) < UI_PROGRESS_EMIT_SLOT_TTL);
}

fn install_tracker_spool_bytes(tracker: &Mutex<InstallSpoolTracker>) -> u64 {
  tracker.lock().unwrap().spool_bytes()
}

/// 组装 worker 完成栅栏：看门狗中止流水线后，下一次运行会等待旧 worker 结束，
/// 避免旧 worker 在磁盘恢复后继续写 staging 与新一轮组装互相覆盖。
struct AssemblyWorkerSlot {
  active: AtomicUsize,
  finished: tokio::sync::Notify,
}

static ASSEMBLY_WORKER_SLOTS: LazyLock<Mutex<HashMap<String, Arc<AssemblyWorkerSlot>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

struct AssemblyWorkerDoneGuard {
  slot: Arc<AssemblyWorkerSlot>,
}

impl Drop for AssemblyWorkerDoneGuard {
  fn drop(&mut self) {
    if self.slot.active.fetch_sub(1, Ordering::AcqRel) == 1 {
      self.slot.finished.notify_waiters();
    }
  }
}

fn assembly_worker_slot(plan_id: &str) -> Arc<AssemblyWorkerSlot> {
  let mut slots = ASSEMBLY_WORKER_SLOTS.lock().unwrap();
  Arc::clone(slots.entry(plan_id.to_string()).or_insert_with(|| {
    Arc::new(AssemblyWorkerSlot {
      active: AtomicUsize::new(0),
      finished: tokio::sync::Notify::new(),
    })
  }))
}

#[allow(clippy::too_many_arguments)]
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
  let slot = assembly_worker_slot(plan_id);
  slot.active.fetch_add(1, Ordering::AcqRel);
  let worker_slot = Arc::clone(&slot);
  tauri::async_runtime::spawn_blocking(move || {
    let _done = AssemblyWorkerDoneGuard { slot: worker_slot };
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

/// 等待上一次中止流水线遗留的组装 worker 结束；全部结束时返回 true。
async fn drain_assembly_workers(plan_id: &str, timeout: Duration) -> bool {
  let Some(slot) = ASSEMBLY_WORKER_SLOTS.lock().unwrap().get(plan_id).cloned() else {
    return true;
  };
  let deadline = Instant::now() + timeout;
  loop {
    // 先注册等待再检查计数：worker 在“检查”与“注册”之间完成时，
    // notify_waiters 已发出，直接等待会错过唤醒而空耗整个超时（恢复安装看起来卡住）。
    let notified = slot.finished.notified();
    if slot.active.load(Ordering::Acquire) == 0 {
      ASSEMBLY_WORKER_SLOTS.lock().unwrap().remove(plan_id);
      return true;
    }
    let remaining = deadline.saturating_duration_since(Instant::now());
    if remaining.is_zero() {
      return false;
    }
    if tokio::time::timeout(remaining, notified).await.is_err() {
      // 超时仍未结束：保留 slot，避免下一次恢复跳过等待、与僵尸 worker 并发写同一批文件。
      return slot.active.load(Ordering::Acquire) == 0;
    }
  }
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

struct InstallDownloadProgressMonitor {
  stopped: Arc<AtomicBool>,
}

impl Drop for InstallDownloadProgressMonitor {
  fn drop(&mut self) {
    self.stopped.store(true, Ordering::Release);
  }
}

struct AssemblyWriteProgressMonitor {
  stopped: Arc<AtomicBool>,
}

impl Drop for AssemblyWriteProgressMonitor {
  fn drop(&mut self) {
    self.stopped.store(true, Ordering::Release);
  }
}

/// 1 秒写盘带宽采样：多路 `write_all` 增量合计，再按下载侧同一套 EMA 平滑。
struct AssemblyWriteBandwidthTracker {
  last_written_bytes: u64,
  last_sample_at: Instant,
  smoothed_bytes_per_second: f64,
}

impl AssemblyWriteBandwidthTracker {
  fn new(written_bytes: u64) -> Self {
    Self {
      last_written_bytes: written_bytes,
      last_sample_at: Instant::now(),
      smoothed_bytes_per_second: 0.0,
    }
  }

  fn sample(&mut self, written_bytes: u64, active_assemblies: usize, now: Instant) -> u64 {
    let elapsed = now.saturating_duration_since(self.last_sample_at).as_secs_f64().max(0.001);
    let delta = written_bytes.saturating_sub(self.last_written_bytes);
    self.last_written_bytes = written_bytes;
    self.last_sample_at = now;
    if active_assemblies == 0 {
      self.smoothed_bytes_per_second = 0.0;
    } else if delta > 0 {
      let sample = delta as f64 / elapsed;
      self.smoothed_bytes_per_second = if self.smoothed_bytes_per_second > 0.0 {
        self.smoothed_bytes_per_second * 0.7 + sample * 0.3
      } else {
        sample
      };
    }
    self.smoothed_bytes_per_second.max(0.0) as u64
  }
}

fn apply_assembly_write_bandwidth(journal: &mut TaskJournal, speed: u64) -> bool {
  let remaining = journal.assembly_total_bytes.saturating_sub(journal.assembly_completed_bytes);
  let eta = download_eta_seconds(remaining, speed);
  if journal.assembly_bytes_per_second == speed && journal.assembly_eta_seconds == eta {
    return false;
  }
  journal.assembly_bytes_per_second = speed;
  journal.assembly_eta_seconds = eta;
  journal.touch();
  true
}

fn start_install_download_progress_monitor(
  events: InstallEventDispatcher,
  journal: Arc<AsyncMutex<TaskJournal>>,
  metrics: Arc<InstallPipelineMetrics>,
) -> InstallDownloadProgressMonitor {
  let stopped = Arc::new(AtomicBool::new(false));
  let stopped_for_task = Arc::clone(&stopped);
  tauri::async_runtime::spawn(async move {
    let mut last_received_bytes = metrics.download_telemetry.snapshot().received_bytes;
    let mut last_sample = Instant::now();
    let mut last_in_flight_bytes = 0_u64;
    let mut smoothed_bytes_per_second = 0_f64;
    let mut assembly_tracker =
      AssemblyWriteBandwidthTracker::new(metrics.assembly_telemetry.snapshot().written_bytes);
    loop {
      tokio::time::sleep(Duration::from_secs(1)).await;
      if stopped_for_task.load(Ordering::Acquire)
        || metrics.stall_pause_requested.load(Ordering::Acquire)
      {
        break;
      }
      let snapshot = metrics.download_telemetry.snapshot();
      let received_bytes = snapshot.received_bytes;
      let elapsed = last_sample.elapsed().as_secs_f64().max(0.001);
      let received_delta = received_bytes.saturating_sub(last_received_bytes);
      last_received_bytes = received_bytes;
      last_sample = Instant::now();
      let active_downloads = metrics.active_downloads.load(Ordering::Acquire);
      if active_downloads > 0 && received_delta > 0 {
        let sample = received_delta as f64 / elapsed;
        smoothed_bytes_per_second = if smoothed_bytes_per_second > 0.0 {
          smoothed_bytes_per_second * 0.7 + sample * 0.3
        } else {
          sample
        };
      } else if active_downloads == 0 {
        smoothed_bytes_per_second = 0.0;
      } else {
        smoothed_bytes_per_second *= 0.5;
      }
      let assembly_written = metrics.assembly_telemetry.snapshot().written_bytes;
      let active_assemblies = metrics.active_assemblies.load(Ordering::Acquire);
      let sampled_assembly_speed =
        assembly_tracker.sample(assembly_written, active_assemblies, Instant::now());

      let mut value = journal.lock().await;
      if stopped_for_task.load(Ordering::Acquire)
        || metrics.stall_pause_requested.load(Ordering::Acquire)
      {
        break;
      }
      let speed = if value.state == PackageTaskState::Downloading {
        smoothed_bytes_per_second.max(0.0) as u64
      } else {
        0
      };
      let remaining = metrics
        .eta_remaining_bytes
        .load(Ordering::Acquire)
        .saturating_sub(snapshot.in_flight_bytes);
      let eta = download_eta_seconds(remaining, speed);
      let in_flight_changed = last_in_flight_bytes != snapshot.in_flight_bytes;
      last_in_flight_bytes = snapshot.in_flight_bytes;
      let speed_changed = value.bytes_per_second != speed || value.eta_seconds != eta;
      if speed_changed {
        value.bytes_per_second = speed;
        value.eta_seconds = eta;
        value.touch();
      }
      let assembly_speed =
        if matches!(value.state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
          sampled_assembly_speed
        } else {
          0
        };
      let assembly_changed = apply_assembly_write_bandwidth(&mut value, assembly_speed);
      if !speed_changed && !in_flight_changed && !assembly_changed {
        continue;
      }
      let summary = overlay_install_download_progress(&value, &metrics);
      drop(value);
      events.publish_progress(summary);
    }
  });
  InstallDownloadProgressMonitor { stopped }
}

fn start_assembly_write_progress_monitor(
  events: AudioEventDispatcher,
  journal: Arc<AsyncMutex<TaskJournal>>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
  overlay: Arc<AudioLiveAssemblyOverlay>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
) -> AssemblyWriteProgressMonitor {
  let stopped = Arc::new(AtomicBool::new(false));
  let stopped_for_task = Arc::clone(&stopped);
  tauri::async_runtime::spawn(async move {
    let mut tracker = AssemblyWriteBandwidthTracker::new(telemetry.snapshot().written_bytes);
    let mut last_display_bytes = 0_u64;
    loop {
      tokio::time::sleep(Duration::from_secs(1)).await;
      if stopped_for_task.load(Ordering::Acquire)
        || canceled.load(Ordering::Acquire)
        || paused.load(Ordering::Acquire)
      {
        break;
      }
      let written_bytes = telemetry.snapshot().written_bytes;
      let mut value = journal.lock().await;
      if stopped_for_task.load(Ordering::Acquire)
        || canceled.load(Ordering::Acquire)
        || paused.load(Ordering::Acquire)
        || !matches!(value.state, PackageTaskState::Downloading | PackageTaskState::Assembling)
      {
        break;
      }
      let speed = tracker.sample(written_bytes, value.active_assembly_count, Instant::now());
      let speed_changed = apply_assembly_write_bandwidth(&mut value, speed);
      let summary = overlay.overlay(&value, written_bytes);
      drop(value);
      if !speed_changed && summary.assembly_completed_bytes == last_display_bytes {
        continue;
      }
      last_display_bytes = summary.assembly_completed_bytes;
      events.publish_progress(summary);
    }
  });
  AssemblyWriteProgressMonitor { stopped }
}

fn download_eta_seconds(remaining_bytes: u64, bytes_per_second: u64) -> Option<u64> {
  (remaining_bytes > 0 && bytes_per_second > 0).then(|| remaining_bytes.div_ceil(bytes_per_second))
}

async fn emit_active_assembly_count(
  events: &InstallEventDispatcher,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  metrics: &InstallPipelineMetrics,
) {
  let mut value = journal.lock().await;
  value.active_assembly_count = metrics.active_assemblies.load(Ordering::Acquire);
  value.touch();
  let summary = value.summary();
  drop(value);
  events.publish_progress(summary);
}

/// 任务私有 spool 中一个已知对象的增量记账。
struct ResidentSpoolFile {
  id: String,
  bytes: u64,
}

/// 全新安装私有 spool 的增量记账。
///
/// 每个资源证据落盘后立即扣减其对象消费者；乱序完成不会再被连续游标阻塞释放。
/// `spool_bytes` 在 `from_disk` 时计入目录内全部普通文件，之后只对已知对象做加减，
/// 删除失败不会漏记，避免空间检查低估占用。
struct InstallSpoolTracker {
  counted: HashSet<String>,
  consumed: HashSet<String>,
  resident: HashMap<String, ResidentSpoolFile>,
  completed_assets: HashSet<usize>,
  /// 分片 id → 引用它的全部资源下标；释放时按“当前完成集合”实时判定，
  /// 避免“证据失效重做”的资源被当作已完成、其分片被提前释放。
  consumers: HashMap<String, Vec<usize>>,
  completed_count: usize,
  completed_bytes: u64,
  contiguous_cursor: usize,
  contiguous_bytes: u64,
  spool_bytes: u64,
}

#[derive(Clone, Copy)]
struct InstallCompletionSnapshot {
  completed_count: usize,
  completed_bytes: u64,
  contiguous_cursor: usize,
  contiguous_bytes: u64,
}

impl InstallSpoolTracker {
  /// 从磁盘现状构建：一次扫描 spool 目录与共享缓存，之后只做增量更新。
  fn from_disk(
    plan: &PersistedPlan,
    spool_root: &Path,
    shared_cache_root: &Path,
    completed_assets: HashSet<usize>,
  ) -> Self {
    let mut resident = HashMap::new();
    let mut spool_bytes = 0_u64;
    if let Ok(entries) = fs::read_dir(spool_root) {
      for entry in entries.flatten() {
        let Ok(metadata) = fs::symlink_metadata(entry.path()) else {
          continue;
        };
        if metadata.file_type().is_symlink() || !metadata.is_file() {
          continue;
        }
        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
          continue;
        };
        if name.ends_with(".part") {
          continue;
        }
        spool_bytes = spool_bytes.saturating_add(metadata.len());
        if let Some(download) = plan.downloads.iter().find(|download| download.cache_key == name) {
          resident
            .insert(name, ResidentSpoolFile { id: download.id.clone(), bytes: metadata.len() });
        }
      }
    }
    let mut consumers = HashMap::<String, Vec<usize>>::new();
    for (index, asset) in plan.assets.iter().enumerate() {
      let mut seen = HashSet::new();
      for chunk in &asset.chunks {
        if chunk.reuse.is_none() && seen.insert(chunk.id.as_str()) {
          consumers.entry(chunk.id.clone()).or_default().push(index);
        }
      }
    }
    let mut consumed = HashSet::new();
    for index in &completed_assets {
      if let Some(asset) = plan.assets.get(*index) {
        let mut seen = HashSet::new();
        for chunk in &asset.chunks {
          if chunk.reuse.is_none() && seen.insert(chunk.id.as_str()) {
            consumed.insert(chunk.id.clone());
          }
        }
      }
    }
    let mut counted = consumed.clone();
    for download in &plan.downloads {
      if resident.contains_key(&download.cache_key)
        || cached_chunk_matches(shared_cache_root, download)
      {
        counted.insert(download.id.clone());
      }
    }
    let completed_count = completed_assets.len().min(plan.assets.len());
    let completed_bytes = completed_assets.iter().fold(0_u64, |total, index| {
      total.saturating_add(plan.assets.get(*index).map_or(0, |asset| asset.size))
    });
    let mut contiguous_cursor = 0_usize;
    let mut contiguous_bytes = 0_u64;
    while contiguous_cursor < plan.assets.len() && completed_assets.contains(&contiguous_cursor) {
      contiguous_bytes = contiguous_bytes.saturating_add(plan.assets[contiguous_cursor].size);
      contiguous_cursor = contiguous_cursor.saturating_add(1);
    }
    Self {
      counted,
      consumed,
      resident,
      completed_assets,
      consumers,
      completed_count,
      completed_bytes,
      contiguous_cursor,
      contiguous_bytes,
      spool_bytes,
    }
  }

  fn spool_bytes(&self) -> u64 {
    self.spool_bytes
  }

  fn committed_step(&self) -> usize {
    self.counted.len()
  }

  fn remaining_download_bytes(&self, plan: &PersistedPlan) -> u64 {
    plan.downloads.iter().fold(0_u64, |total, download| {
      if self.counted.contains(&download.id) {
        total
      } else {
        total.saturating_add(download.compressed_size)
      }
    })
  }

  fn mark_downloaded(&mut self, id: &str, cache_key: &str, bytes: u64) -> usize {
    if let Some(existing) = self.resident.get(cache_key) {
      if existing.id == id {
        self.counted.insert(id.to_string());
        return self.committed_step();
      }
      self.spool_bytes = self.spool_bytes.saturating_sub(existing.bytes);
    }
    self.spool_bytes = self.spool_bytes.saturating_add(bytes);
    self.resident.insert(cache_key.to_string(), ResidentSpoolFile { id: id.to_string(), bytes });
    self.counted.insert(id.to_string());
    self.committed_step()
  }

  fn asset_completed(&self, index: usize) -> bool {
    self.completed_assets.contains(&index)
  }

  fn mark_asset_completed(&mut self, plan: &PersistedPlan, index: usize) -> bool {
    if !self.completed_assets.insert(index) {
      return false;
    }
    if let Some(asset) = plan.assets.get(index) {
      self.completed_count = self.completed_count.saturating_add(1).min(plan.assets.len());
      self.completed_bytes = self.completed_bytes.saturating_add(asset.size);
      let mut seen = HashSet::new();
      for chunk in &asset.chunks {
        if chunk.reuse.is_none() && seen.insert(chunk.id.as_str()) {
          self.consumed.insert(chunk.id.clone());
        }
      }
    }
    while self.contiguous_cursor < plan.assets.len()
      && self.completed_assets.contains(&self.contiguous_cursor)
    {
      self.contiguous_bytes =
        self.contiguous_bytes.saturating_add(plan.assets[self.contiguous_cursor].size);
      self.contiguous_cursor = self.contiguous_cursor.saturating_add(1);
    }
    true
  }

  fn invalidate_asset(&mut self, plan: &PersistedPlan, index: usize) -> bool {
    if !self.completed_assets.remove(&index) {
      return false;
    }
    if let Some(asset) = plan.assets.get(index) {
      self.completed_count = self.completed_count.saturating_sub(1);
      self.completed_bytes = self.completed_bytes.saturating_sub(asset.size);
      if index < self.contiguous_cursor {
        self.contiguous_cursor = index;
        self.contiguous_bytes =
          plan.assets[..index].iter().fold(0_u64, |total, asset| total.saturating_add(asset.size));
      }
    }
    true
  }

  /// 分片是否可释放：仅当引用它的所有资源都已在完成集合中。
  /// 任何资源仍处于“待组装/证据失效重做”状态都不可释放，
  /// 避免重做资产的分片被提前删除导致组装时缓存复验失败。
  fn releasable_file(&self, id: &str) -> bool {
    self
      .consumers
      .get(id)
      .is_some_and(|indices| indices.iter().all(|index| self.completed_assets.contains(index)))
  }

  fn completion_snapshot(&self, plan: &PersistedPlan) -> InstallCompletionSnapshot {
    debug_assert!(self.completed_count <= plan.assets.len());
    InstallCompletionSnapshot {
      completed_count: self.completed_count,
      completed_bytes: self.completed_bytes,
      contiguous_cursor: self.contiguous_cursor,
      contiguous_bytes: self.contiguous_bytes,
    }
  }
}

/// 释放已经没有资源消费者、且不属于 SDK 的任务私有 spool 对象。
///
/// fs 探测与删除放在 `InstallSpoolTracker` 锁外执行，避免单个文件操作卡住时
/// 让所有 tokio 工作线程排队等锁、导致整个下载流水线饿死。
/// `preserve_chunks` 为真时先把分片转入共享缓存再清理 spool。
fn release_spool_unneeded(
  tracker: &Arc<Mutex<InstallSpoolTracker>>,
  plan: &PersistedPlan,
  spool_root: &Path,
  shared_cache_root: &Path,
  preserve_chunks: bool,
) -> u64 {
  let sdk_key = plan
    .install_overlay
    .as_ref()
    .and_then(|overlay| overlay.sdk.as_ref())
    .map(|sdk| sdk.cache_key.as_str());
  let candidates = {
    let guard = tracker.lock().unwrap();
    guard
      .resident
      .iter()
      .filter(|(key, file)| {
        // 只释放“所有引用资源均已完成”的分片；未知键或仍有未完成资源一律保留，
        // 避免“证据失效重做”资产的分片被提前删除导致组装时缓存复验失败。
        guard.releasable_file(&file.id) && sdk_key != Some(key.as_str())
      })
      .map(|(key, file)| (key.clone(), file.id.clone()))
      .collect::<Vec<_>>()
  };
  let mut released = 0_u64;
  for (key, id) in candidates {
    let path = spool_root.join(&key);
    let Ok(metadata) = fs::symlink_metadata(&path) else {
      forget_released_spool_file(tracker, &key, &id);
      continue;
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
      continue;
    }
    if preserve_chunks {
      let Some(download) = plan.downloads.iter().find(|download| download.cache_key == key) else {
        if fs::remove_file(&path).is_err() {
          continue;
        }
        released = released.saturating_add(metadata.len());
        forget_released_spool_file(tracker, &key, &id);
        continue;
      };
      match super::installer::adopt_spool_chunk(
        shared_cache_root,
        spool_root,
        download,
        &plan.plan_id,
      ) {
        Ok(_) => {
          // adopt 成功或跳过（目标已存在/校验不符）后，确保 spool 残留文件被清理。
          let _ = fs::remove_file(&path);
          released = released.saturating_add(metadata.len());
          forget_released_spool_file(tracker, &key, &id);
        }
        Err(error) => {
          log::warn!(
            "[game-install][{}] 保留下载分片到共享缓存失败，将在后续批次重试：{error}",
            plan.plan_id
          );
        }
      }
      continue;
    }
    if fs::remove_file(&path).is_err() {
      continue;
    }
    released = released.saturating_add(metadata.len());
    forget_released_spool_file(tracker, &key, &id);
  }
  released
}

/// 从 spool 记账中移除一个已释放对象；仅当 resident 仍指向同一 id 时才更新。
fn forget_released_spool_file(tracker: &Arc<Mutex<InstallSpoolTracker>>, key: &str, id: &str) {
  let mut guard = tracker.lock().unwrap();
  if guard.resident.get(key).is_none_or(|file| file.id != id) {
    return;
  }
  if let Some(file) = guard.resident.remove(key) {
    guard.spool_bytes = guard.spool_bytes.saturating_sub(file.bytes);
    if !guard.consumed.contains(id) {
      guard.counted.remove(id);
    }
  }
}

/// 异步释放 spool 中不再被引用的分片：同步删除移到 blocking 线程池执行。
///
/// 调用方不得在持有 journal 锁时等待本函数：删除文件是无超时的磁盘 I/O，
/// 一旦卡住会让进度无法持久化，并使停滞看门狗（依赖 try_lock 读 journal）失明。
async fn release_spool_unneeded_async(
  tracker: &Arc<Mutex<InstallSpoolTracker>>,
  plan: &Arc<PersistedPlan>,
  spool_root: &Path,
  shared_cache_root: &Path,
  preserve_chunks: bool,
) -> u64 {
  let tracker = Arc::clone(tracker);
  let plan = Arc::clone(plan);
  let spool_root = spool_root.to_path_buf();
  let shared_cache_root = shared_cache_root.to_path_buf();
  tauri::async_runtime::spawn_blocking(move || {
    release_spool_unneeded(&tracker, &plan, &spool_root, &shared_cache_root, preserve_chunks)
  })
  .await
  .unwrap_or(0)
}

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

impl InstallPipelineMetrics {
  fn new(
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

  fn finish_assembly(&self, started_at: Instant) -> Duration {
    let elapsed = started_at.elapsed();
    self.active_assemblies.fetch_sub(1, Ordering::AcqRel);
    self.assembly_micros.fetch_add(duration_micros(elapsed), Ordering::Relaxed);
    elapsed
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
    let _ =
      self.eta_remaining_bytes.fetch_update(Ordering::AcqRel, Ordering::Acquire, |remaining| {
        Some(remaining.saturating_sub(bytes))
      });
  }

  fn set_eta_remaining_bytes(&self, bytes: u64) {
    self.eta_remaining_bytes.store(bytes, Ordering::Release);
  }
}

impl Drop for InstallPipelineMetrics {
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

fn duration_micros(duration: Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

fn persist_install_checkpoint(
  task_root: &Path,
  journal_value: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> Result<(), String> {
  if metrics.stall_pause_requested.load(Ordering::Acquire) {
    return Ok(());
  }
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
  if metrics.stall_pause_requested.load(Ordering::Acquire) {
    return Ok(());
  }
  let mut timing = journal::JournalPersistTiming::default();
  let result = journal::persist_progress_timed(task_root, journal_value, &mut timing);
  metrics.record_journal(&timing);
  result
}

fn overlay_install_download_progress(
  journal: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> PackageTaskSummary {
  let mut summary = journal.summary();
  if !matches!(journal.state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
    return summary;
  }
  let in_flight = metrics.download_telemetry.snapshot().in_flight_bytes;
  summary.downloaded_bytes =
    journal.downloaded_bytes.saturating_add(in_flight).min(journal.total_bytes);
  summary
}

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

async fn commit_install_download_progress(
  events: &InstallEventDispatcher,
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
  cache_clear_active: bool,
}

/// 在持有任务生命周期锁期间执行同步清理，阻止新的 reservation 与目录删除交错。
fn with_active_task_ids<T>(
  active: &Arc<Mutex<ActiveTasks>>,
  operation: impl FnOnce(&HashSet<String>) -> Result<T, String>,
) -> Result<T, String> {
  let active_guard = active.lock().map_err(|_| "游戏资源任务锁已损坏".to_string())?;
  let mut active_ids = active_guard.by_task.keys().cloned().collect::<HashSet<_>>();
  active_ids
    .extend(active_guard.by_installation.values().map(|reservation| reservation.task_id.clone()));
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

pub(crate) struct TaskReservation {
  active: Arc<Mutex<ActiveTasks>>,
  installation_id: String,
  task_id: String,
  canceled: Arc<AtomicBool>,
}

impl TaskReservation {
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
    })
  }

  pub(crate) fn canceled_flag(&self) -> Arc<AtomicBool> {
    Arc::clone(&self.canceled)
  }
}

impl Drop for TaskReservation {
  fn drop(&mut self) {
    let Ok(mut active) = self.active.lock() else {
      return;
    };
    if active.by_task.get(&self.task_id).is_some_and(|task| {
      task.installation_id == self.installation_id && Arc::ptr_eq(&task.canceled, &self.canceled)
    }) {
      active.by_task.remove(&self.task_id);
    }
    if active.by_installation.get(&self.installation_id).is_some_and(|reservation| {
      reservation.task_id == self.task_id && Arc::ptr_eq(&reservation.canceled, &self.canceled)
    }) {
      active.by_installation.remove(&self.installation_id);
    }
  }
}

pub(crate) struct CacheClearReservation {
  active: Arc<Mutex<ActiveTasks>>,
}

impl Drop for CacheClearReservation {
  fn drop(&mut self) {
    if let Ok(mut active) = self.active.lock() {
      active.cache_clear_active = false;
    }
  }
}

impl GamePackageManager {
  pub(crate) fn new() -> Self {
    Self {
      active: Arc::new(Mutex::new(ActiveTasks {
        by_task: HashMap::new(),
        by_installation: HashMap::new(),
        cache_clear_active: false,
      })),
      verify: Arc::new(VerifyRuntime::new()),
    }
  }

  /// 启动只写应用缓存的资源下载。游戏运行时仍允许开始；改游戏目录发生在 apply。
  pub(crate) async fn start(
    &self,
    app_handle: AppHandle,
    task_root: PathBuf,
    plan: PersistedPlan,
    options: PackageTaskOptions,
    recovering: bool,
    audio_apply: Option<AudioApplyContext>,
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
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
    let canceled = reservation.canceled_flag();
    let cache_root = prepare_cache_root(&task_root)?;
    let download_client = create_http_client()?;
    let scan_task_id = plan.plan_id.clone();
    let scan_cache_root = cache_root.clone();
    let scan_plan = Arc::clone(&plan);
    let scan_progress = recovery_progress.clone();
    let cache_scan = tauri::async_runtime::spawn_blocking(move || {
      scan_cached_downloads(
        &scan_cache_root,
        &scan_plan.downloads,
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

    let mut journal = journal::load_or_create(&task_root, &plan)?;
    journal.ensure_update_commit_progress(&plan);
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    if !recovering && journal.state.is_active() && journal.revision > 1 {
      return Err("检测到未完成的资源任务，请使用恢复操作继续".to_string());
    }
    if recovering && journal.state == PackageTaskState::ReadyToApply {
      return Err("资源任务已经完成下载".to_string());
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
        scanned_objects: plan.downloads.len(),
        total_objects: plan.downloads.len(),
        confirmed_bytes: journal.downloaded_bytes,
        message: "缓存核对完成，正在继续任务".to_string(),
      });
    }

    let summary = journal.summary();
    let paused = Arc::new(AtomicBool::new(false));
    let paused_slot = Arc::new(Mutex::new(Arc::clone(&paused)));
    let shared_journal = Arc::new(AsyncMutex::new(journal));
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
    emit_state(&app_handle, &summary);
    tauri::async_runtime::spawn(async move {
      let _reservation = reservation;
      if let Some(context) = audio_apply {
        run_audio_streaming_task(
          app_handle.clone(),
          task_root.clone(),
          cache_root,
          PathBuf::from(&context.installation.root_path),
          plan.clone(),
          download_client,
          Arc::clone(&shared_journal),
          Arc::clone(&canceled),
          Arc::clone(&paused),
          concurrency,
          options.max_bytes_per_second,
        )
        .await;
        if let Err(error) = apply_audio_after_download(
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
    if draft.preserve_chunks != preserve_chunks {
      draft.preserve_chunks = preserve_chunks;
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

  /// 暂停全新安装或配音包任务的资源下载/组装，保留草稿与已完成缓存以便后续恢复。
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
    if !matches!(journal_value.target, PackagePlanTarget::Install | PackagePlanTarget::Audio) {
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
    if !matches!(
      journal_value.state,
      PackageTaskState::Queued | PackageTaskState::Downloading | PackageTaskState::Assembling
    ) {
      paused.store(was_paused, Ordering::Release);
      return Err("当前资源任务不能暂停".to_string());
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
      TaskReservation::acquire(Arc::clone(&self.active), &plan.installation_id, &plan.plan_id)?;
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
    });
    Ok(summary)
  }

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
      let _reservation = TaskReservation::acquire(active, &plan.installation_id, &plan.plan_id)?;
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
    self.reserve_installation_operation(installation_id, "game-launch")
  }

  pub(crate) fn reserve_installation_operation(
    &self,
    installation_id: &str,
    operation: &str,
  ) -> Result<TaskReservation, String> {
    TaskReservation::acquire(Arc::clone(&self.active), installation_id, operation)
  }

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

  pub(crate) async fn list(
    &self,
    task_root: &Path,
    installation_id: Option<&str>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let journals = journal::list(task_root, installation_id)?;
    self.list_from_journals(journals, installation_id).await
  }

  /// 清理过期记录后列出磁盘上持久化的安全终态任务。
  pub(crate) fn history_list(&self, task_root: &Path) -> Result<Vec<PackageTaskSummary>, String> {
    with_active_task_ids(&self.active, |active_ids| {
      let journals = journal::list(task_root, None)
        .map_err(|error| format!("读取游戏资源任务历史失败：{error}"))?;
      let (_, retained) = journal::cleanup_terminal_tasks_from_journals(
        task_root,
        active_ids,
        Some(ChronoDuration::days(7)),
        journals.clone(),
      )
      .map_err(|error| format!("清理过期游戏资源任务历史失败：{error}"))?;
      cleanup_finished_task_sidecars(task_root, &journals, &retained);
      let mut summaries = retained
        .into_iter()
        .filter(|journal| {
          !active_ids.contains(&journal.task_id)
            && matches!(
              journal.state,
              PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
            )
        })
        .map(|journal| journal.summary())
        .collect::<Vec<_>>();
      summaries.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
      Ok(summaries)
    })
  }

  pub(crate) fn remove_task(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskCleanupSummary, String> {
    let task_id =
      Uuid::parse_str(task_id).map_err(|_| "任务 ID 无效：必须是 UUID".to_string())?.to_string();
    with_active_task_ids(&self.active, |active_ids| {
      if active_ids.contains(&task_id) {
        return Err("任务仍在运行，无法删除任务记录".to_string());
      }
      let journals = journal::list(task_root, None)?;
      let summary = journal::cleanup_terminal_task(task_root, active_ids, &task_id)?;
      let retained = journals
        .iter()
        .filter(|journal| !summary.removed_task_ids.contains(&journal.task_id))
        .cloned()
        .collect::<Vec<_>>();
      cleanup_finished_task_sidecars(task_root, &journals, &retained);
      Ok(summary)
    })
  }

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

  pub(crate) async fn cleanup_and_list(
    &self,
    task_root: &Path,
    installation_id: Option<&str>,
    max_age: Option<ChronoDuration>,
  ) -> Result<Vec<PackageTaskSummary>, String> {
    let journals = with_active_task_ids(&self.active, |active_ids| {
      let journals = journal::list(task_root, None)
        .map_err(|error| format!("自动清理过期游戏资源任务失败：{error}"))?;
      journal::cleanup_terminal_tasks_from_journals(
        task_root,
        active_ids,
        max_age,
        journals.clone(),
      )
      .map(|(_, retained)| {
        cleanup_finished_task_sidecars(task_root, &journals, &retained);
        retained
      })
      .map_err(|error| format!("自动清理过期游戏资源任务失败：{error}"))
    })?;
    let journals = journals
      .into_iter()
      .filter(|journal| installation_id.is_none_or(|id| id == journal.installation_id))
      .collect();
    self.list_from_journals(journals, installation_id).await
  }

  pub(crate) fn cleanup_tasks(
    &self,
    task_root: &Path,
    max_age: Option<ChronoDuration>,
  ) -> Result<PackageTaskCleanupSummary, String> {
    with_active_task_ids(&self.active, |active_ids| {
      let journals = journal::list(task_root, None)?;
      let summary = journal::cleanup_terminal_tasks(task_root, active_ids, max_age)?;
      let retained = journals
        .iter()
        .filter(|journal| !summary.removed_task_ids.contains(&journal.task_id))
        .cloned()
        .collect::<Vec<_>>();
      cleanup_finished_task_sidecars(task_root, &journals, &retained);
      Ok(summary)
    })
  }

  pub(crate) fn rollback_download(
    &self,
    task_root: &Path,
    task_id: &str,
  ) -> Result<PackageTaskSummary, String> {
    let path = journal::journal_path(task_root, task_id);
    let identity = journal::load(&path)?;
    let _reservation =
      TaskReservation::acquire(Arc::clone(&self.active), &identity.installation_id, task_id)
        .map_err(|_| "任务仍在运行，请先请求取消并等待安全边界".to_string())?;
    let mut journal = journal::load(&path)?;
    if journal.state == PackageTaskState::Completed {
      return Err("资源任务已经完成".to_string());
    }
    if journal.state.blocks_launch() {
      return Err("检测到未完成的资源提交，请先执行恢复".to_string());
    }
    restore_prep_staged_audio_deletions(task_root, &mut journal)?;
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

fn prepare_audio_asset_job(
  plan: &PersistedPlan,
  asset_index: usize,
  dependencies: &[Vec<usize>],
  available_downloads: &mut HashSet<usize>,
  cache_root: &Path,
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
      if cached_chunk_matches(cache_root, &download) {
        available_downloads.insert(index);
        return None;
      }
      Some((index, download))
    })
    .collect();
  AudioAssetJob { asset_index, pending }
}

fn overlay_audio_summary(
  journal: &TaskJournal,
  telemetry: &assembler::AssemblyTelemetry,
  overlay: &AudioLiveAssemblyOverlay,
) -> PackageTaskSummary {
  overlay.overlay(journal, telemetry.snapshot().written_bytes)
}

#[allow(clippy::too_many_arguments)]
async fn assemble_audio_asset(
  events: AudioEventDispatcher,
  task_root: PathBuf,
  game_root: PathBuf,
  output_root: PathBuf,
  plan: Arc<PersistedPlan>,
  asset_index: usize,
  journal: Arc<AsyncMutex<TaskJournal>>,
  canceled: Arc<AtomicBool>,
  assembly_slots: Arc<Semaphore>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
  overlay: Arc<AudioLiveAssemblyOverlay>,
) -> Result<(), String> {
  let permit = match assembly_slots.acquire_owned().await {
    Ok(permit) => permit,
    Err(error) => return Err(format!("获取配音组装并发槽位失败：{error}")),
  };
  let summary = {
    let mut value = journal.lock().await;
    value.active_assembly_count = value.active_assembly_count.saturating_add(1);
    value.assembly_current_file = Some(plan.assets[asset_index].name.clone());
    value.current_file = value.assembly_current_file.clone();
    value.touch();
    overlay_audio_summary(&value, &telemetry, &overlay)
  };
  events.publish_progress(summary);
  let worker_plan = Arc::clone(&plan);
  let worker_task_root = task_root.clone();
  let worker_output_root = output_root.clone();
  let worker_canceled = Arc::clone(&canceled);
  let worker_telemetry = Arc::clone(&telemetry);
  let result = tauri::async_runtime::spawn_blocking(move || {
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
    Ok::<(), String>(())
  })
  .await
  .map_err(|error| format!("配音资源组装 worker 异常退出：{error}"))
  .and_then(|result| result);
  drop(permit);
  let summary = {
    let mut value = journal.lock().await;
    value.active_assembly_count = value.active_assembly_count.saturating_sub(1);
    value.touch();
    overlay_audio_summary(&value, &telemetry, &overlay)
  };
  events.publish_progress(summary);
  result
}

#[allow(clippy::too_many_arguments)]
async fn run_audio_asset_job(
  job: AudioAssetJob,
  events: AudioEventDispatcher,
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
      let _focus = download_focus
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
        async move {
          let download_guard = {
            let mut values = guards.lock().await;
            Arc::clone(
              values.entry(download.id.clone()).or_insert_with(|| Arc::new(AsyncMutex::new(()))),
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
          let result = download_object(
            &client,
            &root,
            &download,
            DownloadControl::new(
              &task_id,
              &canceled,
              &paused,
              &limiter,
              DownloadDurability::Strict,
            ),
          )
          .await;
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
              overlay_audio_summary(&value, &telemetry, &overlay)
            };
            events.publish_progress(summary);
          }
          Ok((download_index, None)) => {
            available_downloads.lock().unwrap().insert(download_index);
          }
          Err(error) => return Err(error),
        }
      }
    }
    assemble_audio_asset(
      events,
      task_root,
      game_root,
      output_root,
      plan,
      asset_index,
      journal,
      canceled,
      assembly_slots,
      telemetry,
      overlay,
    )
    .await
  }
  .await;
  AudioAssetJobCompletion { asset_index, needs_download, result }
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

/// 并发删除单个待移除配音资源：把文件移入备份目录并累计删除进度。
#[allow(clippy::too_many_arguments)]
async fn delete_audio_resource(
  events: &AudioEventDispatcher,
  task_root: &Path,
  game_root: &Path,
  plan: &Arc<PersistedPlan>,
  journal: &Arc<AsyncMutex<TaskJournal>>,
  canceled: &Arc<AtomicBool>,
  paused: &Arc<AtomicBool>,
  telemetry: &assembler::AssemblyTelemetry,
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
  let summary = overlay_audio_summary(&value, telemetry, overlay);
  drop(value);
  events.publish_state(summary);
  Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn run_audio_streaming_task(
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
) {
  let output_root = match committer::prepare_apply_assembly(&plan, &game_root) {
    Ok(path) => path,
    Err(error) => {
      persist_audio_pipeline_error(&task_root, &app_handle, &journal, &paused, &canceled, error)
        .await;
      return;
    }
  };
  let incoming_bytes =
    plan.assets.iter().fold(0_u64, |total, asset| total.saturating_add(asset.size));
  let required = incoming_bytes.saturating_add(SAFETY_MARGIN_BYTES);
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
    move || evidence::trusted_asset_indices(&task_root, &plan, &output_root)
  })
  .await
  {
    Ok(Ok(completed)) => completed,
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
        format!("配音资源证据核对 worker 异常退出：{error}"),
      )
      .await;
      return;
    }
  };
  let (pending_deletes, delete_completed_bytes) = match tauri::async_runtime::spawn_blocking({
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
  };
  let plan = Arc::new(plan);
  let events = match AudioEventDispatcher::new(app_handle.clone(), &plan.plan_id) {
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
  let assembly_telemetry = assembler::AssemblyTelemetry::new();
  let assembly_overlay = Arc::new(AudioLiveAssemblyOverlay::new());
  let _assembly_progress_monitor = start_assembly_write_progress_monitor(
    events.clone(),
    Arc::clone(&journal),
    Arc::clone(&assembly_telemetry),
    Arc::clone(&assembly_overlay),
    Arc::clone(&canceled),
    Arc::clone(&paused),
  );
  let download_focus = Arc::new(Semaphore::new(AUDIO_DOWNLOAD_FOCUS));
  let download_slots = Arc::new(Semaphore::new(install_download_concurrency(concurrency)));
  let assembly_slots = Arc::new(Semaphore::new(install_assembly_concurrency(concurrency)));
  let download_guards = Arc::new(AsyncMutex::new(HashMap::<String, Arc<AsyncMutex<()>>>::new()));
  let mut jobs = stream::FuturesUnordered::new();
  let mut inflight_downloads = 0_usize;
  let mut pipeline_error = None;
  // 删除只移动游戏目录中待移除的语音文件（移入备份），与下载（缓存）、组装
  // （incoming）路径互不冲突；与下载/组装并发执行，避免串行拖长准备阶段。
  let deletion_blocked = is_game_running();
  let mut deletes_done = pending_deletes.is_empty();
  let delete_tasks = stream::iter(pending_deletes.into_iter().map(|deleted| {
    let events = events.clone();
    let task_root = task_root.clone();
    let game_root = game_root.clone();
    let plan = Arc::clone(&plan);
    let journal = Arc::clone(&journal);
    let canceled = Arc::clone(&canceled);
    let paused = Arc::clone(&paused);
    let telemetry = Arc::clone(&assembly_telemetry);
    let overlay = Arc::clone(&assembly_overlay);
    let deletion_blocked = deletion_blocked;
    async move {
      if deletion_blocked {
        return Err("检测到游戏进程，暂时不能删除配音文件，请退出游戏后恢复任务".to_string());
      }
      delete_audio_resource(
        &events, &task_root, &game_root, &plan, &journal, &canceled, &paused, &telemetry, &overlay,
        &deleted,
      )
      .await
    }
  }))
  .buffer_unordered(concurrency.max(1));
  futures_util::pin_mut!(delete_tasks);
  let max_assembly = install_assembly_concurrency(concurrency);
  let max_in_flight = audio_pipeline_window(concurrency);

  loop {
    if pipeline_error.is_none()
      && !paused.load(Ordering::Acquire)
      && !canceled.load(Ordering::Acquire)
    {
      while let Some(asset_index) =
        (0..plan.assets.len()).find(|index| !scheduled_assets.contains(index))
      {
        let job = {
          let mut available = available_downloads.lock().unwrap();
          prepare_audio_asset_job(&plan, asset_index, &dependencies, &mut available, &cache_root)
        };
        let needs_download = !job.pending.is_empty();
        if needs_download && inflight_downloads >= max_in_flight {
          break;
        }
        if !needs_download && jobs.len() >= max_assembly {
          break;
        }
        if jobs.len() >= max_in_flight {
          break;
        }
        scheduled_assets.insert(asset_index);
        if needs_download {
          inflight_downloads = inflight_downloads.saturating_add(1);
        }
        jobs.push(run_audio_asset_job(
          job,
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
          Arc::clone(&assembly_telemetry),
          Arc::clone(&assembly_overlay),
          Arc::clone(&completed_cache_keys),
          Arc::clone(&available_downloads),
          Arc::clone(&labels),
          download_started_at,
        ));
      }
    }
    if jobs.is_empty() && deletes_done {
      break;
    }
    tokio::select! {
      completion = jobs.next(), if !jobs.is_empty() => {
        let Some(completion) = completion else {
          continue;
        };
        if completion.needs_download {
          inflight_downloads = inflight_downloads.saturating_sub(1);
        }
        match completion.result {
          Ok(()) => {
            completed_assets.insert(completion.asset_index);
            if let Some(asset) = plan.assets.get(completion.asset_index) {
              assembly_overlay.account_completed(asset.size);
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
              overlay_audio_summary(&value, &assembly_telemetry, &assembly_overlay)
            };
            events.publish_progress(summary);
          }
          Err(error) => {
            pipeline_error.get_or_insert(error);
          }
        }
      }
      deletion = delete_tasks.next(), if !deletes_done => {
        let Some(result) = deletion else {
          deletes_done = true;
          continue;
        };
        if let Err(error) = result {
          pipeline_error.get_or_insert(error);
        }
      }
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
    value.downloaded_bytes = value.total_bytes;
    value.committed_step = value.total_count;
    value.assembly_completed_count = value.assembly_total_count;
    value.assembly_completed_bytes = value.assembly_total_bytes;
    value.error_message = None;
  } else {
    value.state = PackageTaskState::Failed;
    value.error_message = Some("配音资源流水线结束后仍有下载或组装对象未完成".to_string());
  }
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
  let persisted = journal::persist(task_root, &value).is_ok();
  let summary = value.summary();
  drop(value);
  if persisted {
    emit_progress(app_handle, &summary);
    emit_state(app_handle, &summary);
  }
}

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
  if result == committer::ApplyOutcome::RepairNeeded {
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
  let events = match InstallEventDispatcher::new(app_handle.clone(), &plan.plan_id) {
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
    matches!(
      value.state,
      PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
    )
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
async fn run_install_streaming_task(
  app_handle: AppHandle,
  events: InstallEventDispatcher,
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
    for asset_index in start_cursor..plan.assets.len() {
      if canceled.load(Ordering::Acquire) || paused.load(Ordering::Acquire) {
        break;
      }
      if spool_tracker.lock().unwrap().asset_completed(asset_index) {
        continue;
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
              .with_telemetry(Arc::clone(&metrics.download_telemetry)),
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
      let assemble_telemetry = Arc::clone(&metrics.assembly_telemetry);
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
        .with_telemetry(Arc::clone(&metrics.download_telemetry)),
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
async fn run_install_prepublish_repair(
  events: &InstallEventDispatcher,
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

async fn run_install_bounded_asset_pipeline(
  events: &InstallEventDispatcher,
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
      metrics.queue_refill_count.fetch_add(1, Ordering::Relaxed);
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
    if cached_chunk_matches_async(&shared_root, &download).await
      || cached_chunk_matches_async(&root, &download).await
    {
      return Ok(None);
    }
    let permit =
      slots.acquire_owned().await.map_err(|error| format!("获取下载并发槽位失败：{error}"))?;
    let started_at = metrics.begin_download();
    let result = download_object(
      &client,
      &root,
      &download,
      DownloadControl::new(&task_id, &canceled, &paused, &limiter, DownloadDurability::Recoverable)
        .with_telemetry(Arc::clone(&metrics.download_telemetry)),
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
async fn apply_install_download_results(
  events: &InstallEventDispatcher,
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

#[allow(clippy::too_many_arguments)]
async fn run_install_asset_job(
  job: InstallAssetJob,
  events: InstallEventDispatcher,
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
  let InstallAssetJob { asset_index, pending, reserved_bytes, .. } = job;
  let result = async {
    let downloads = stream::iter(pending.into_iter().map(|download| {
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

    // 组装前最后复验：计划期判为“已缓存”的分片若在组装前丢失（例如并发释放或缓存被清），
    // 在这里补下载一次，避免单个分片缺失就让整个安装失败。
    let missing = {
      let mut missing = Vec::new();
      for chunk in &plan.assets[asset_index].chunks {
        if chunk.reuse.is_some() {
          continue;
        }
        let Some(download) = download_index.get(&plan, chunk.id.as_str()) else {
          continue;
        };
        if !cached_chunk_matches_async(&shared_cache_root, &download).await
          && !cached_chunk_matches_async(&spool_root, &download).await
        {
          missing.push(download.clone());
        }
      }
      missing
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
    let assemble_telemetry = Arc::clone(&metrics.assembly_telemetry);
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

async fn persist_install_stream_error(
  task_root: &Path,
  events: &InstallEventDispatcher,
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
  if let Err(error) = super::launch::sync_voice_language(&actual) {
    persist_audio_registration_error(app_handle, task_root, journal, &error).await;
    return Err(error);
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
  let events = match InstallEventDispatcher::new(app_handle.clone(), &plan.plan_id) {
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

async fn run_install_task(
  events: InstallEventDispatcher,
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

fn check_install_stream_space<'a>(
  plan: &PersistedPlan,
  asset_index: usize,
  pending: impl IntoIterator<Item = &'a PlanDownload>,
  spool_root: &Path,
) -> Result<(), String> {
  check_install_stream_space_with_spool(plan, asset_index, pending, spool_bytes(spool_root))
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
        .map(|sdk| sdk.pkg_version_file_name.clone())
        .or_else(|| asset_names.get(&download.id).cloned())
        .unwrap_or_else(|| download.id.clone());
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
  remember_progress_emit(&summary.task_id);
  if let Err(error) = app_handle.emit("game-package://progress", summary) {
    log::warn!("[game-package] 发送任务进度事件失败：{error}");
  }
}

fn remember_progress_emit(task_id: &str) {
  let now = Instant::now();
  let Ok(mut registry) = PROGRESS_EMIT_REGISTRY.lock() else {
    return;
  };
  prune_progress_emit_slots(&mut registry, now);
  registry.slots.insert(task_id.to_string(), now);
}

fn should_emit_progress(task_id: &str) -> bool {
  let now = Instant::now();
  let Ok(mut registry) = PROGRESS_EMIT_REGISTRY.lock() else {
    return true;
  };
  prune_progress_emit_slots(&mut registry, now);
  if registry
    .slots
    .get(task_id)
    .is_some_and(|last| now.saturating_duration_since(*last) < UI_PROGRESS_EMIT_INTERVAL)
  {
    return false;
  }
  registry.slots.insert(task_id.to_string(), now);
  true
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
