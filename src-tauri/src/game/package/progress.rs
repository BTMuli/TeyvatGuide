//! 资源任务的实时进度叠加、带宽采样与采样任务生命周期。
//! 同一资源的尝试由资源 job 串行调度；登记表只读取原子进度，不等待磁盘操作。
//! @since Beta v0.13.0

use super::{events::TaskEventDispatcher, metrics::InstallPipelineMetrics};
use crate::game::{
  assembler,
  journal::TaskJournal,
  model::{PackageTaskState, PackageTaskSummary},
};
use std::{
  collections::HashMap,
  sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
  },
  time::{Duration, Instant},
};
use tokio::sync::Mutex as AsyncMutex;

/// 单次组装尝试的写入进度；展示量不超过该资源目标大小。
/// @since Beta v0.13.0
struct AssetWriteProgress {
  progress: Arc<assembler::AssemblyWriteProgress>,
  total_bytes: u64,
}

/// 按资源归属叠加实时写入，调用方在 journal 锁内登记、移除与读取快照。
/// @since Beta v0.13.0
pub(super) struct AudioLiveAssemblyOverlay {
  assets: Mutex<HashMap<usize, AssetWriteProgress>>,
}

impl AudioLiveAssemblyOverlay {
  /// 创建组装进度叠加器。
  ///
  /// @since Beta v0.13.0
  pub(super) fn new() -> Self {
    Self { assets: Mutex::new(HashMap::new()) }
  }

  /// 登记本资源的新尝试；回退前须先清除上一尝试的实时量。
  /// @since Beta v0.13.0
  pub(super) fn begin_attempt(
    &self,
    asset_index: usize,
    total_bytes: u64,
  ) -> Arc<assembler::AssemblyWriteProgress> {
    let progress = assembler::AssemblyWriteProgress::new();
    self
      .assets
      .lock()
      .unwrap()
      .insert(asset_index, AssetWriteProgress { progress: Arc::clone(&progress), total_bytes });
    progress
  }

  /// 叠加尚未入账或丢弃的资源写入；暂停和终态只显示持久完成量。
  /// @since Beta v0.13.0
  pub(super) fn overlay(&self, journal: &TaskJournal) -> PackageTaskSummary {
    let mut summary = journal.summary();
    if !matches!(journal.state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
      return summary;
    }
    let live_bytes = self.assets.lock().unwrap().values().fold(0_u64, |total, asset| {
      total.saturating_add(asset.progress.written_bytes().min(asset.total_bytes))
    });
    summary.assembly_completed_bytes =
      journal.assembly_completed_bytes.saturating_add(live_bytes).min(journal.assembly_total_bytes);
    summary
  }

  /// 在 journal 锁内移除失败、跳过或已计入持久完成量的资源，保留其他资源的实时量。
  /// @since Beta v0.13.0
  pub(super) fn clear_asset(&self, asset_index: usize) {
    self.assets.lock().unwrap().remove(&asset_index);
  }
}

/// 采样任务的停止守卫；离开任务作用域后禁止继续写入日志。
/// @since Beta v0.13.0
pub(super) struct ProgressMonitor {
  stopped: Arc<AtomicBool>,
}

impl Drop for ProgressMonitor {
  /// 停止进度采样；任务在等待日志锁后仍会复查此标志。
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    self.stopped.store(true, Ordering::Release);
  }
}

/// 按累计字节与活跃 worker 数采样带宽，供下载和组装共用。
/// @since Beta v0.13.0
struct BandwidthTracker {
  last_bytes: u64,
  last_sample_at: Instant,
  smoothed_bytes_per_second: f64,
}

impl BandwidthTracker {
  /// 以当前字节数和单调时钟初始化带宽采样器。
  /// @since Beta v0.13.0
  fn new(bytes: u64, now: Instant) -> Self {
    Self { last_bytes: bytes, last_sample_at: now, smoothed_bytes_per_second: 0.0 }
  }

  /// 采样最近窗口的字节带宽，并用 EMA 平滑。
  /// @since Beta v0.13.0
  fn sample(&mut self, bytes: u64, active_workers: usize, now: Instant) -> u64 {
    let elapsed = now.saturating_duration_since(self.last_sample_at).as_secs_f64().max(0.001);
    let delta = bytes.saturating_sub(self.last_bytes);
    self.last_bytes = bytes;
    self.last_sample_at = now;
    if active_workers == 0 {
      self.smoothed_bytes_per_second = 0.0;
    } else if delta > 0 {
      let sample = delta as f64 / elapsed;
      self.smoothed_bytes_per_second = if self.smoothed_bytes_per_second > 0.0 {
        self.smoothed_bytes_per_second * 0.7 + sample * 0.3
      } else {
        sample
      };
    } else {
      self.smoothed_bytes_per_second *= 0.5;
    }
    self.smoothed_bytes_per_second.max(0.0) as u64
  }
}

/// 把组装写盘带宽写回任务日志；数值未变化时返回 false。
/// @since Beta v0.13.0
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

/// 启动安装流水线进度采样，定期把下载/组装带宽与 ETA 写回任务日志。
/// @since Beta v0.13.0
pub(super) fn start_install_download_progress_monitor(
  events: TaskEventDispatcher,
  journal: Arc<AsyncMutex<TaskJournal>>,
  metrics: Arc<InstallPipelineMetrics>,
) -> ProgressMonitor {
  let stopped = Arc::new(AtomicBool::new(false));
  let stopped_for_task = Arc::clone(&stopped);
  tauri::async_runtime::spawn(async move {
    let mut download_tracker =
      BandwidthTracker::new(metrics.download_snapshot().received_bytes, Instant::now());
    let mut last_in_flight_bytes = 0_u64;
    let mut assembly_tracker =
      BandwidthTracker::new(metrics.assembly_snapshot().written_bytes, Instant::now());
    loop {
      tokio::time::sleep(Duration::from_secs(1)).await;
      if stopped_for_task.load(Ordering::Acquire) || metrics.is_stall_pause_requested() {
        break;
      }
      let snapshot = metrics.download_snapshot();
      let sampled_download_speed = download_tracker.sample(
        snapshot.received_bytes,
        metrics.active_downloads(),
        Instant::now(),
      );
      let assembly_written = metrics.assembly_snapshot().written_bytes;
      let active_assemblies = metrics.active_assemblies();
      let sampled_assembly_speed =
        assembly_tracker.sample(assembly_written, active_assemblies, Instant::now());

      let mut value = journal.lock().await;
      if stopped_for_task.load(Ordering::Acquire) || metrics.is_stall_pause_requested() {
        break;
      }
      let speed =
        if value.state == PackageTaskState::Downloading { sampled_download_speed } else { 0 };
      let remaining = metrics.remaining_bytes().saturating_sub(snapshot.in_flight_bytes);
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
  ProgressMonitor { stopped }
}

/// 启动配音组装写盘进度采样，实时把组装增量叠加到任务摘要。
/// @since Beta v0.13.0
pub(super) fn start_assembly_write_progress_monitor(
  events: TaskEventDispatcher,
  journal: Arc<AsyncMutex<TaskJournal>>,
  telemetry: Arc<assembler::AssemblyTelemetry>,
  overlay: Arc<AudioLiveAssemblyOverlay>,
  canceled: Arc<AtomicBool>,
  paused: Arc<AtomicBool>,
) -> ProgressMonitor {
  let stopped = Arc::new(AtomicBool::new(false));
  let stopped_for_task = Arc::clone(&stopped);
  tauri::async_runtime::spawn(async move {
    let mut tracker = BandwidthTracker::new(telemetry.snapshot().written_bytes, Instant::now());
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
      let summary = overlay.overlay(&value);
      drop(value);
      if !speed_changed && summary.assembly_completed_bytes == last_display_bytes {
        continue;
      }
      last_display_bytes = summary.assembly_completed_bytes;
      events.publish_progress(summary);
    }
  });
  ProgressMonitor { stopped }
}

/// 按剩余字节与当前带宽计算 ETA。
/// @since Beta v0.13.0
fn download_eta_seconds(remaining_bytes: u64, bytes_per_second: u64) -> Option<u64> {
  (remaining_bytes > 0 && bytes_per_second > 0).then(|| remaining_bytes.div_ceil(bytes_per_second))
}

/// 把下载中的实时字节叠加到任务摘要，并限制在任务总量内。
/// @since Beta v0.13.0
pub(super) fn overlay_install_download_progress(
  journal: &TaskJournal,
  metrics: &InstallPipelineMetrics,
) -> PackageTaskSummary {
  let mut summary = journal.summary();
  if !matches!(journal.state, PackageTaskState::Downloading | PackageTaskState::Assembling) {
    return summary;
  }
  let in_flight = metrics.download_snapshot().in_flight_bytes;
  summary.downloaded_bytes =
    journal.downloaded_bytes.saturating_add(in_flight).min(journal.total_bytes);
  summary
}

#[cfg(test)]
mod tests;
