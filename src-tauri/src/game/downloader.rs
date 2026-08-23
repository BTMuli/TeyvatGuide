//! 内容寻址游戏资源缓存、并发下载、限速与完整性校验。
//! @since Beta v0.11.5

use super::{
  hoyoplay::network_error,
  planner::{PlanDownload, PlanDownloadHashKind, cached_chunk_matches, remember_cache_validation},
  sophon::{is_official_download_host, payload_url},
};
use futures_util::TryStreamExt;
use md5::{Digest as Md5Digest, Md5};
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, RANGE};
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
  sync::{
    Arc, LazyLock, Mutex, Weak,
    atomic::{AtomicBool, AtomicU64, Ordering},
  },
  time::{Duration, Instant},
};
use tokio::{
  fs::OpenOptions,
  io::{AsyncWriteExt, BufWriter},
  sync::Mutex as AsyncMutex,
};
use xxhash_rust::xxh64::Xxh64;

const MAX_ATTEMPTS: usize = 4;
const WRITE_BUFFER_BYTES: usize = 256 * 1024;

fn duration_micros(duration: Duration) -> u64 {
  duration.as_micros().min(u128::from(u64::MAX)) as u64
}

static DOWNLOAD_LOCKS: LazyLock<Mutex<HashMap<String, Weak<AsyncMutex<()>>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

pub(crate) struct RateLimiter {
  bytes_per_second: Option<u64>,
  state: AsyncMutex<RateState>,
}

struct RateState {
  started_at: Instant,
  bytes: u64,
}

pub(crate) struct DownloadedObject {
  pub(crate) cache_key: String,
  pub(crate) bytes: u64,
}

/// Aggregated timing and outcome counters for one install task.
///
/// The telemetry is intentionally detached from the download URL, cache key and local paths. It
/// is created by the owning task and is never stored in global state, so concurrent install tasks
/// cannot mix their samples.
#[derive(Default)]
pub(crate) struct DownloadTelemetry {
  network_wait_micros: AtomicU64,
  write_micros: AtomicU64,
  hash_micros: AtomicU64,
  file_sync_count: AtomicU64,
  file_sync_micros: AtomicU64,
  received_bytes: AtomicU64,
  cache_hits: AtomicU64,
  attempts: AtomicU64,
  successful_attempts: AtomicU64,
  failed_attempts: AtomicU64,
  retries: AtomicU64,
  aborted_objects: AtomicU64,
  publish_failures: AtomicU64,
  successful_objects: AtomicU64,
  failed_objects: AtomicU64,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct DownloadTelemetrySnapshot {
  pub(crate) network_wait_micros: u64,
  pub(crate) write_micros: u64,
  pub(crate) hash_micros: u64,
  pub(crate) file_sync_count: u64,
  pub(crate) file_sync_micros: u64,
  pub(crate) received_bytes: u64,
  pub(crate) cache_hits: u64,
  pub(crate) attempts: u64,
  pub(crate) successful_attempts: u64,
  pub(crate) failed_attempts: u64,
  pub(crate) retries: u64,
  pub(crate) aborted_objects: u64,
  pub(crate) publish_failures: u64,
  pub(crate) successful_objects: u64,
  pub(crate) failed_objects: u64,
}

impl DownloadTelemetry {
  pub(crate) fn new() -> Arc<Self> {
    Arc::new(Self::default())
  }

  pub(crate) fn snapshot(&self) -> DownloadTelemetrySnapshot {
    DownloadTelemetrySnapshot {
      network_wait_micros: self.network_wait_micros.load(Ordering::Relaxed),
      write_micros: self.write_micros.load(Ordering::Relaxed),
      hash_micros: self.hash_micros.load(Ordering::Relaxed),
      file_sync_count: self.file_sync_count.load(Ordering::Relaxed),
      file_sync_micros: self.file_sync_micros.load(Ordering::Relaxed),
      received_bytes: self.received_bytes.load(Ordering::Relaxed),
      cache_hits: self.cache_hits.load(Ordering::Relaxed),
      attempts: self.attempts.load(Ordering::Relaxed),
      successful_attempts: self.successful_attempts.load(Ordering::Relaxed),
      failed_attempts: self.failed_attempts.load(Ordering::Relaxed),
      retries: self.retries.load(Ordering::Relaxed),
      aborted_objects: self.aborted_objects.load(Ordering::Relaxed),
      publish_failures: self.publish_failures.load(Ordering::Relaxed),
      successful_objects: self.successful_objects.load(Ordering::Relaxed),
      failed_objects: self.failed_objects.load(Ordering::Relaxed),
    }
  }

  fn begin_attempt(self: &Arc<Self>) -> DownloadAttemptTelemetry {
    self.attempts.fetch_add(1, Ordering::Relaxed);
    DownloadAttemptTelemetry {
      telemetry: Arc::clone(self),
      network_wait_micros: 0,
      write_micros: 0,
      hash_micros: 0,
      file_sync_count: 0,
      file_sync_micros: 0,
      received_bytes: 0,
      committed: false,
    }
  }

  fn record_cache_hit(&self) {
    self.cache_hits.fetch_add(1, Ordering::Relaxed);
  }

  fn record_retry(&self) {
    self.retries.fetch_add(1, Ordering::Relaxed);
  }

  fn record_publish_failure(&self) {
    self.publish_failures.fetch_add(1, Ordering::Relaxed);
  }
}

#[derive(Clone, Copy)]
enum DownloadObjectOutcome {
  Success,
  Aborted,
}

struct DownloadObjectTelemetry {
  telemetry: Arc<DownloadTelemetry>,
  outcome: Option<DownloadObjectOutcome>,
}

impl DownloadObjectTelemetry {
  fn new(telemetry: Arc<DownloadTelemetry>) -> Self {
    Self { telemetry, outcome: None }
  }

  fn finish(&mut self, outcome: DownloadObjectOutcome) {
    self.outcome = Some(outcome);
  }
}

impl Drop for DownloadObjectTelemetry {
  fn drop(&mut self) {
    match self.outcome {
      Some(DownloadObjectOutcome::Success) => {
        self.telemetry.successful_objects.fetch_add(1, Ordering::Relaxed);
      }
      Some(DownloadObjectOutcome::Aborted) => {
        self.telemetry.aborted_objects.fetch_add(1, Ordering::Relaxed);
      }
      None => {
        self.telemetry.failed_objects.fetch_add(1, Ordering::Relaxed);
      }
    }
  }
}

struct DownloadAttemptTelemetry {
  telemetry: Arc<DownloadTelemetry>,
  network_wait_micros: u64,
  write_micros: u64,
  hash_micros: u64,
  file_sync_count: u64,
  file_sync_micros: u64,
  received_bytes: u64,
  committed: bool,
}

impl DownloadAttemptTelemetry {
  fn record_network_wait(&mut self, elapsed: Duration) {
    self.network_wait_micros = self.network_wait_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_write(&mut self, elapsed: Duration) {
    self.write_micros = self.write_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_hash(&mut self, elapsed: Duration) {
    self.hash_micros = self.hash_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_file_sync(&mut self, elapsed: Duration) {
    self.file_sync_count = self.file_sync_count.saturating_add(1);
    self.file_sync_micros = self.file_sync_micros.saturating_add(duration_micros(elapsed));
  }

  fn record_received_bytes(&mut self, bytes: u64) {
    self.received_bytes = self.received_bytes.saturating_add(bytes);
  }

  fn finish(mut self, success: bool) {
    self.commit(success);
  }

  fn commit(&mut self, success: bool) {
    if self.committed {
      return;
    }
    self.telemetry.network_wait_micros.fetch_add(self.network_wait_micros, Ordering::Relaxed);
    self.telemetry.write_micros.fetch_add(self.write_micros, Ordering::Relaxed);
    self.telemetry.hash_micros.fetch_add(self.hash_micros, Ordering::Relaxed);
    self.telemetry.file_sync_count.fetch_add(self.file_sync_count, Ordering::Relaxed);
    self.telemetry.file_sync_micros.fetch_add(self.file_sync_micros, Ordering::Relaxed);
    self.telemetry.received_bytes.fetch_add(self.received_bytes, Ordering::Relaxed);
    if success {
      self.telemetry.successful_attempts.fetch_add(1, Ordering::Relaxed);
    } else {
      self.telemetry.failed_attempts.fetch_add(1, Ordering::Relaxed);
    }
    self.committed = true;
  }
}

impl Drop for DownloadAttemptTelemetry {
  fn drop(&mut self) {
    self.commit(false);
  }
}

/// Controls whether a completed download must be durable across a crash before it is published.
///
/// `Recoverable` is only appropriate for task-private spool objects that can be revalidated and
/// downloaded again after a crash. It deliberately makes no cross-crash durability claim for the
/// file's page-cache contents.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DownloadDurability {
  /// Flush and force the temporary file to stable storage before publishing it.
  Strict,
  /// Flush and close the temporary file, but leave forcing it to stable storage to a later
  /// checkpoint because the object is safe to redownload.
  Recoverable,
}

pub(crate) struct DownloadControl<'a> {
  task_id: &'a str,
  canceled: &'a AtomicBool,
  paused: &'a AtomicBool,
  limiter: &'a RateLimiter,
  durability: DownloadDurability,
  telemetry: Option<Arc<DownloadTelemetry>>,
}

impl<'a> DownloadControl<'a> {
  pub(crate) fn new(
    task_id: &'a str,
    canceled: &'a AtomicBool,
    paused: &'a AtomicBool,
    limiter: &'a RateLimiter,
    durability: DownloadDurability,
  ) -> Self {
    Self { task_id, canceled, paused, limiter, durability, telemetry: None }
  }

  pub(crate) fn with_telemetry(mut self, telemetry: Arc<DownloadTelemetry>) -> Self {
    self.telemetry = Some(telemetry);
    self
  }
}

impl DownloadDurability {
  fn requires_file_sync(self) -> bool {
    matches!(self, Self::Strict)
  }
}

impl RateLimiter {
  pub(crate) fn new(bytes_per_second: Option<u64>) -> Self {
    Self {
      bytes_per_second,
      state: AsyncMutex::new(RateState { started_at: Instant::now(), bytes: 0 }),
    }
  }

  async fn consume(&self, bytes: u64) {
    let Some(limit) = self.bytes_per_second else {
      return;
    };
    let delay = {
      let mut state = self.state.lock().await;
      if state.started_at.elapsed() > Duration::from_secs(10) {
        state.started_at = Instant::now();
        state.bytes = 0;
      }
      state.bytes = state.bytes.saturating_add(bytes);
      let expected = Duration::from_secs_f64(state.bytes as f64 / limit as f64);
      expected.saturating_sub(state.started_at.elapsed())
    };
    if !delay.is_zero() {
      tokio::time::sleep(delay).await;
    }
  }
}

pub(crate) fn prepare_cache_root(task_root: &Path) -> Result<PathBuf, String> {
  let cache_root = task_root.join("cache/chunks");
  fs::create_dir_all(&cache_root).map_err(|error| format!("创建游戏资源缓存目录失败：{error}"))?;
  reject_reparse_point(task_root)?;
  reject_reparse_point(&task_root.join("cache"))?;
  reject_reparse_point(&cache_root)?;
  Ok(cache_root)
}

pub(crate) async fn download_object(
  client: &reqwest::Client,
  cache_root: &Path,
  download: &PlanDownload,
  control: DownloadControl<'_>,
) -> Result<DownloadedObject, String> {
  let DownloadControl { task_id, canceled, paused, limiter, durability, telemetry } = control;
  let mut object_telemetry =
    telemetry.as_ref().map(|value| DownloadObjectTelemetry::new(Arc::clone(value)));
  if download.hash_kind == PlanDownloadHashKind::UnsupportedPatchRange {
    return Err("当前阶段不支持下载无法独立校验的 patch Range".to_string());
  }
  let lock = download_lock(&download.cache_key)?;
  let _guard = lock.lock().await;
  if cached_chunk_matches(cache_root, download) {
    if let Some(telemetry) = telemetry.as_ref() {
      telemetry.record_cache_hit();
    }
    if let Some(object_telemetry) = object_telemetry.as_mut() {
      object_telemetry.finish(DownloadObjectOutcome::Success);
    }
    return Ok(DownloadedObject {
      cache_key: download.cache_key.clone(),
      bytes: download.compressed_size,
    });
  }
  let target = cache_root.join(&download.cache_key);
  reject_existing_link(&target)?;
  let partial = cache_root.join(format!("{}.part.{task_id}", download.cache_key));
  let mut last_error = String::new();
  for attempt in 0..MAX_ATTEMPTS {
    if paused.load(Ordering::Acquire) {
      remove_partial(&partial);
      if let Some(object_telemetry) = object_telemetry.as_mut() {
        object_telemetry.finish(DownloadObjectOutcome::Aborted);
      }
      return Err("任务已暂停".to_string());
    }
    if canceled.load(Ordering::Acquire) {
      remove_partial(&partial);
      if let Some(object_telemetry) = object_telemetry.as_mut() {
        object_telemetry.finish(DownloadObjectOutcome::Aborted);
      }
      return Err("任务已取消".to_string());
    }
    remove_partial(&partial);
    let mut attempt_telemetry = telemetry.as_ref().map(|value| value.begin_attempt());
    let result = download_once(
      client,
      download,
      &partial,
      canceled,
      paused,
      limiter,
      durability,
      attempt_telemetry.as_mut(),
    )
    .await;
    match result {
      Ok(()) => {
        if let Some(attempt_telemetry) = attempt_telemetry.take() {
          attempt_telemetry.finish(true);
        }
        if paused.load(Ordering::Acquire) {
          remove_partial(&partial);
          if let Some(object_telemetry) = object_telemetry.as_mut() {
            object_telemetry.finish(DownloadObjectOutcome::Aborted);
          }
          return Err("任务已暂停".to_string());
        }
        if target.exists() {
          if cached_chunk_matches(cache_root, download) {
            remove_partial(&partial);
            if let Some(object_telemetry) = object_telemetry.as_mut() {
              object_telemetry.finish(DownloadObjectOutcome::Success);
            }
            return Ok(DownloadedObject {
              cache_key: download.cache_key.clone(),
              bytes: download.compressed_size,
            });
          }
          if let Err(error) = fs::remove_file(&target) {
            if let Some(telemetry) = telemetry.as_ref() {
              telemetry.record_publish_failure();
            }
            return Err(format!("清理损坏缓存文件失败：{error}"));
          }
        }
        if let Err(error) = fs::rename(&partial, &target) {
          if let Some(telemetry) = telemetry.as_ref() {
            telemetry.record_publish_failure();
          }
          return Err(format!("提交游戏资源缓存失败：{error}"));
        }
        let metadata = match fs::symlink_metadata(&target) {
          Ok(metadata) => metadata,
          Err(error) => {
            if let Some(telemetry) = telemetry.as_ref() {
              telemetry.record_publish_failure();
            }
            return Err(format!("读取已提交游戏资源缓存失败：{error}"));
          }
        };
        if !metadata.is_file() || metadata.len() != download.compressed_size {
          let _ = fs::remove_file(&target);
          if let Some(telemetry) = telemetry.as_ref() {
            telemetry.record_publish_failure();
          }
          return Err("已提交游戏资源缓存的类型或大小无效".to_string());
        }
        #[cfg(target_os = "windows")]
        {
          use std::os::windows::fs::MetadataExt;
          use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
          if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            let _ = fs::remove_file(&target);
            if let Some(telemetry) = telemetry.as_ref() {
              telemetry.record_publish_failure();
            }
            return Err("已提交游戏资源缓存不能是重解析点".to_string());
          }
        }
        remember_cache_validation(cache_root, download, &metadata);
        if let Some(object_telemetry) = object_telemetry.as_mut() {
          object_telemetry.finish(DownloadObjectOutcome::Success);
        }
        return Ok(DownloadedObject {
          cache_key: download.cache_key.clone(),
          bytes: download.compressed_size,
        });
      }
      Err(error) => last_error = error,
    }
    if paused.load(Ordering::Acquire) {
      remove_partial(&partial);
      if let Some(object_telemetry) = object_telemetry.as_mut() {
        object_telemetry.finish(DownloadObjectOutcome::Aborted);
      }
      return Err("任务已暂停".to_string());
    }
    if canceled.load(Ordering::Acquire) {
      remove_partial(&partial);
      if let Some(object_telemetry) = object_telemetry.as_mut() {
        object_telemetry.finish(DownloadObjectOutcome::Aborted);
      }
      return Err("任务已取消".to_string());
    }
    if attempt + 1 < MAX_ATTEMPTS {
      if let Some(telemetry) = telemetry.as_ref() {
        telemetry.record_retry();
      }
      let jitter = download.cache_key.as_bytes().first().copied().unwrap_or_default() as u64 % 200;
      tokio::time::sleep(Duration::from_millis((1_u64 << attempt) * 500 + jitter)).await;
    }
  }
  remove_partial(&partial);
  Err(format!("游戏资源下载重试后仍失败：{last_error}"))
}

async fn download_once(
  client: &reqwest::Client,
  download: &PlanDownload,
  partial: &Path,
  canceled: &AtomicBool,
  paused: &AtomicBool,
  limiter: &RateLimiter,
  durability: DownloadDurability,
  mut telemetry: Option<&mut DownloadAttemptTelemetry>,
) -> Result<(), String> {
  let url = download_url(download)?;
  let mut request = client.get(url);
  if let (Some(start), Some(length)) = (download.range_start, download.range_length) {
    let end = start.checked_add(length - 1).ok_or_else(|| "下载 Range 溢出".to_string())?;
    request = request.header(RANGE, format!("bytes={start}-{end}"));
  }
  let send_started_at = Instant::now();
  let response = request.send().await;
  if let Some(telemetry) = telemetry.as_deref_mut() {
    telemetry.record_network_wait(send_started_at.elapsed());
  }
  let response = response.map_err(|error| network_error("下载游戏资源", &error))?;
  if download.range_start.is_some() {
    if response.status() != reqwest::StatusCode::PARTIAL_CONTENT {
      return Err("资源服务器未按请求返回 Range 数据".to_string());
    }
    validate_content_range(response.headers().get(CONTENT_RANGE), download)?;
  } else if !response.status().is_success() {
    return Err(format!("下载游戏资源失败：HTTP {}", response.status().as_u16()));
  }
  if let Some(length) = response.headers().get(CONTENT_LENGTH) {
    let length = length.to_str().ok().and_then(|value| value.parse::<u64>().ok());
    if length != Some(download.compressed_size) {
      return Err("资源响应长度与计划不一致".to_string());
    }
  }
  let file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(partial)
    .await
    .map_err(|error| format!("创建资源下载临时文件失败：{error}"))?;
  let mut writer = BufWriter::with_capacity(WRITE_BUFFER_BYTES, file);
  let mut stream = response.bytes_stream();
  let mut bytes = 0_u64;
  let mut xxhasher = Xxh64::new(0);
  let mut md5hasher = <Md5 as Md5Digest>::new();
  loop {
    let body_started_at = Instant::now();
    let next_chunk = stream.try_next().await;
    if let Some(telemetry) = telemetry.as_deref_mut() {
      telemetry.record_network_wait(body_started_at.elapsed());
    }
    let Some(chunk) = next_chunk.map_err(|error| network_error("读取游戏资源", &error))?
    else {
      break;
    };
    if paused.load(Ordering::Acquire) {
      drop(writer);
      remove_partial(partial);
      return Err("任务已暂停".to_string());
    }
    if canceled.load(Ordering::Acquire) {
      drop(writer);
      remove_partial(partial);
      return Err("任务已取消".to_string());
    }
    if let Some(telemetry) = telemetry.as_deref_mut() {
      telemetry.record_received_bytes(chunk.len() as u64);
    }
    limiter.consume(chunk.len() as u64).await;
    bytes = bytes.checked_add(chunk.len() as u64).ok_or_else(|| "下载资源大小溢出".to_string())?;
    if bytes > download.compressed_size {
      return Err("下载资源超过计划大小".to_string());
    }
    let write_started_at = Instant::now();
    let write_result = writer.write_all(&chunk).await;
    if let Some(telemetry) = telemetry.as_deref_mut() {
      telemetry.record_write(write_started_at.elapsed());
    }
    write_result.map_err(|error| format!("写入资源下载临时文件失败：{error}"))?;
    let hash_started_at = Instant::now();
    match download.hash_kind {
      PlanDownloadHashKind::XxHash64 => xxhasher.update(&chunk),
      PlanDownloadHashKind::Md5 => md5hasher.update(&chunk),
      PlanDownloadHashKind::UnsupportedPatchRange => {
        return Err("当前阶段不支持校验 patch Range".to_string());
      }
    }
    if let Some(telemetry) = telemetry.as_deref_mut() {
      telemetry.record_hash(hash_started_at.elapsed());
    }
  }
  if bytes != download.compressed_size {
    return Err("下载资源大小与计划不一致".to_string());
  }
  let hash_started_at = Instant::now();
  let actual_hash = match download.hash_kind {
    PlanDownloadHashKind::XxHash64 => format!("{:016x}", xxhasher.digest()),
    PlanDownloadHashKind::Md5 => format!("{:x}", md5hasher.finalize()),
    PlanDownloadHashKind::UnsupportedPatchRange => {
      return Err("当前阶段不支持校验 patch Range".to_string());
    }
  };
  if let Some(telemetry) = telemetry.as_deref_mut() {
    telemetry.record_hash(hash_started_at.elapsed());
  }
  if !actual_hash.eq_ignore_ascii_case(&download.expected_hash) {
    drop(writer);
    remove_partial(partial);
    return Err("下载资源 hash 校验失败".to_string());
  }
  let flush_started_at = Instant::now();
  let flush_result = writer.flush().await;
  if let Some(telemetry) = telemetry.as_deref_mut() {
    telemetry.record_write(flush_started_at.elapsed());
  }
  flush_result.map_err(|error| format!("刷新资源下载缓冲区失败：{error}"))?;
  let file = writer.into_inner();
  if durability.requires_file_sync() {
    let sync_started_at = Instant::now();
    let sync_result = file.sync_all().await;
    if let Some(telemetry) = telemetry.as_deref_mut() {
      telemetry.record_file_sync(sync_started_at.elapsed());
    }
    sync_result.map_err(|error| format!("刷新资源下载临时文件失败：{error}"))?;
  }
  drop(file);
  Ok(())
}

fn validate_content_range(
  header: Option<&reqwest::header::HeaderValue>,
  download: &PlanDownload,
) -> Result<(), String> {
  let value = header
    .and_then(|header| header.to_str().ok())
    .ok_or_else(|| "Range 响应缺少 Content-Range".to_string())?;
  let expected_start = download.range_start.ok_or_else(|| "Range 计划缺少起点".to_string())?;
  let expected_length = download.range_length.ok_or_else(|| "Range 计划缺少长度".to_string())?;
  let expected_end =
    expected_start.checked_add(expected_length - 1).ok_or_else(|| "Range 计划溢出".to_string())?;
  let range = value
    .strip_prefix("bytes ")
    .and_then(|value| value.split_once('/').map(|parts| parts.0))
    .and_then(|value| value.split_once('-'))
    .and_then(|(start, end)| Some((start.parse::<u64>().ok()?, end.parse::<u64>().ok()?)));
  if range != Some((expected_start, expected_end)) {
    return Err("Range 响应范围与计划不一致".to_string());
  }
  Ok(())
}

fn download_lock(cache_key: &str) -> Result<Arc<AsyncMutex<()>>, String> {
  let mut locks = DOWNLOAD_LOCKS.lock().map_err(|_| "游戏资源下载锁已损坏".to_string())?;
  if let Some(lock) = locks.get(cache_key).and_then(Weak::upgrade) {
    return Ok(lock);
  }
  locks.retain(|_, lock| lock.strong_count() > 0);
  let lock = Arc::new(AsyncMutex::new(()));
  locks.insert(cache_key.to_string(), Arc::downgrade(&lock));
  Ok(lock)
}

fn reject_existing_link(path: &Path) -> Result<(), String> {
  match fs::symlink_metadata(path) {
    Ok(metadata) if metadata.file_type().is_symlink() => {
      Err("游戏资源缓存路径不能是符号链接".to_string())
    }
    Ok(metadata) if metadata.is_dir() => Err("游戏资源缓存目标不能是目录".to_string()),
    Ok(metadata) => {
      #[cfg(target_os = "windows")]
      {
        use std::os::windows::fs::MetadataExt;
        use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
          return Err("游戏资源缓存目标不能是重解析点".to_string());
        }
      }
      Ok(())
    }
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("读取游戏资源缓存目标状态失败：{error}")),
  }
}

fn reject_reparse_point(path: &Path) -> Result<(), String> {
  let metadata =
    fs::symlink_metadata(path).map_err(|error| format!("读取游戏资源缓存目录状态失败：{error}"))?;
  if metadata.file_type().is_symlink() {
    return Err("游戏资源缓存目录不能是符号链接".to_string());
  }
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
    if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
      return Err("游戏资源缓存目录不能是重解析点".to_string());
    }
  }
  Ok(())
}

fn remove_partial(path: &Path) {
  if let Err(error) = fs::remove_file(path)
    && error.kind() != std::io::ErrorKind::NotFound
  {
    log::warn!("[game-package] 清理任务私有下载临时文件失败：{error}");
  }
}

fn download_url(download: &PlanDownload) -> Result<reqwest::Url, String> {
  if download.cache_key.starts_with("sdk-")
    && download.cache_key.ends_with(".zip")
    && download.id == download.cache_key
    && download.url_suffix.is_empty()
  {
    let parsed =
      reqwest::Url::parse(&download.url_prefix).map_err(|_| "安装资源下载地址无效".to_string())?;
    let host = parsed.host_str().unwrap_or_default();
    if parsed.scheme() != "https"
      || !parsed.username().is_empty()
      || parsed.password().is_some()
      || !is_official_download_host(host)
    {
      return Err("安装资源下载地址主机不受信任".to_string());
    }
    return Ok(parsed);
  }
  payload_url(&download.url_prefix, &download.url_suffix, &download.id)
}

#[cfg(test)]
mod tests {
  use super::{
    DownloadDurability, DownloadObjectOutcome, DownloadObjectTelemetry, DownloadTelemetry,
    download_url, is_official_download_host, validate_content_range,
  };
  use crate::game::planner::{PayloadEncoding, PlanDownload, PlanDownloadHashKind};
  use reqwest::header::HeaderValue;
  use std::{sync::Arc, time::Duration};

  fn range_download() -> PlanDownload {
    PlanDownload {
      id: "patch".to_string(),
      cache_key: "0123456789abcdef0123456789abcdef.patch".to_string(),
      hash_kind: PlanDownloadHashKind::UnsupportedPatchRange,
      expected_hash: String::new(),
      compressed_size: 8,
      decompressed_size: 8,
      encoding: PayloadEncoding::Raw,
      url_prefix: "https://example.yuanshen.com/patch".to_string(),
      url_suffix: String::new(),
      range_start: Some(10),
      range_length: Some(8),
    }
  }

  #[test]
  fn validates_exact_content_range() {
    let header = HeaderValue::from_static("bytes 10-17/128");
    assert!(validate_content_range(Some(&header), &range_download()).is_ok());
  }

  #[test]
  fn rejects_mismatched_content_range() {
    let header = HeaderValue::from_static("bytes 0-7/128");
    assert!(validate_content_range(Some(&header), &range_download()).is_err());
  }

  #[test]
  fn accepts_official_legacy_download_hosts() {
    assert!(is_official_download_host("autopatchcn.yuanshen.com"));
    assert!(is_official_download_host("launcher-webstatic.mihoyo.com"));
    assert!(!is_official_download_host("example.com"));
  }

  #[test]
  fn appends_resource_id_to_sophon_url_without_suffix() {
    let mut download = range_download();
    download.id = "0123456789abcdef".to_string();
    download.cache_key = download.id.clone();
    download.url_prefix = "https://autopatchcn.yuanshen.com/chunks".to_string();

    assert_eq!(
      download_url(&download).unwrap().as_str(),
      "https://autopatchcn.yuanshen.com/chunks/0123456789abcdef"
    );
  }

  #[test]
  fn keeps_sdk_direct_url_without_appending_cache_key() {
    let download = PlanDownload {
      id: "sdk-0123456789abcdef0123456789abcdef.zip".to_string(),
      cache_key: "sdk-0123456789abcdef0123456789abcdef.zip".to_string(),
      hash_kind: PlanDownloadHashKind::Md5,
      expected_hash: String::new(),
      compressed_size: 1,
      decompressed_size: 1,
      encoding: PayloadEncoding::Raw,
      url_prefix: "https://launcher-webstatic.mihoyo.com/sdk.zip?signature=test".to_string(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    };

    assert_eq!(
      download_url(&download).unwrap().as_str(),
      "https://launcher-webstatic.mihoyo.com/sdk.zip?signature=test"
    );
  }

  #[test]
  fn durability_policy_only_syncs_strict_downloads() {
    assert!(DownloadDurability::Strict.requires_file_sync());
    assert!(!DownloadDurability::Recoverable.requires_file_sync());
  }

  #[test]
  fn telemetry_accumulates_attempt_phases_and_strict_syncs() {
    let telemetry = DownloadTelemetry::new();
    let mut attempt = telemetry.begin_attempt();
    attempt.record_network_wait(Duration::from_micros(11));
    attempt.record_write(Duration::from_micros(13));
    attempt.record_hash(Duration::from_micros(17));
    attempt.record_file_sync(Duration::from_micros(19));
    attempt.record_received_bytes(23);
    attempt.finish(true);

    assert_eq!(
      telemetry.snapshot(),
      super::DownloadTelemetrySnapshot {
        network_wait_micros: 11,
        write_micros: 13,
        hash_micros: 17,
        file_sync_count: 1,
        file_sync_micros: 19,
        received_bytes: 23,
        attempts: 1,
        successful_attempts: 1,
        ..Default::default()
      }
    );
  }

  #[test]
  fn telemetry_isolated_and_records_abort_failure_and_publish_events() {
    let first = DownloadTelemetry::new();
    let second = DownloadTelemetry::new();

    {
      let _failed_attempt = first.begin_attempt();
    }
    {
      let mut aborted = DownloadObjectTelemetry::new(Arc::clone(&first));
      aborted.finish(DownloadObjectOutcome::Aborted);
    }
    first.record_retry();
    first.record_publish_failure();
    first.record_cache_hit();

    assert_eq!(
      first.snapshot(),
      super::DownloadTelemetrySnapshot {
        cache_hits: 1,
        attempts: 1,
        failed_attempts: 1,
        retries: 1,
        aborted_objects: 1,
        publish_failures: 1,
        ..Default::default()
      }
    );
    assert_eq!(second.snapshot(), super::DownloadTelemetrySnapshot::default());
  }
}
