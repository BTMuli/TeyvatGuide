//! 资源任务的实时进度叠加、带宽采样与采样任务生命周期。
//! @since Beta v0.13.0

use super::{events::TaskEventDispatcher, metrics::InstallPipelineMetrics};
use crate::game::{
  assembler,
  journal::TaskJournal,
  model::{PackageTaskState, PackageTaskSummary},
};
use std::{
  sync::{
    Arc,
    atomic::{AtomicBool, AtomicU64, Ordering},
  },
  time::{Duration, Instant},
};
use tokio::sync::Mutex as AsyncMutex;

/// 配音与正式更新的写入进度叠加器。
/// @since Beta v0.13.0
pub(super) struct AudioLiveAssemblyOverlay {
  accounted_written: AtomicU64,
}

impl AudioLiveAssemblyOverlay {
  /// 创建组装进度叠加器。
  ///
  /// @since Beta v0.13.0
  pub(super) fn new() -> Self {
    Self { accounted_written: AtomicU64::new(0) }
  }

  /// 计算展示用已完成字节数。
  ///
  /// @since Beta v0.13.0
  ///
  /// # 参数
  /// - `durable_completed`: 持久完成字节数。
  /// - `total`: 总字节数。
  /// - `written`: 已写字节数。
  /// - `accounted`: 已入账字节数。
  ///
  /// # 返回
  /// 展示字节数。
  fn display_bytes(durable_completed: u64, total: u64, written: u64, accounted: u64) -> u64 {
    durable_completed.saturating_add(written.saturating_sub(accounted)).min(total)
  }

  /// 叠加写出进度到任务摘要。
  ///
  /// @since Beta v0.13.0
  ///
  /// # 参数
  /// - `journal`: 任务日志。
  /// - `written`: 已写字节数。
  ///
  /// # 返回
  /// 叠加后的摘要。
  pub(super) fn overlay(&self, journal: &TaskJournal, written: u64) -> PackageTaskSummary {
    let mut summary = journal.summary();
    summary.assembly_completed_bytes = Self::display_bytes(
      journal.assembly_completed_bytes,
      journal.assembly_total_bytes,
      written,
      self.accounted_written.load(Ordering::Relaxed),
    );
    summary
  }

  /// 在 journal 锁内与持久完成量同步入账，保留其他资源的会话增量。
  /// @since Beta v0.13.0
  pub(super) fn account_completed(&self, asset_size: u64) {
    self.accounted_written.fetch_add(asset_size, Ordering::Relaxed);
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
      let summary = overlay.overlay(&value, written_bytes);
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

/// 从共享遥测生成配音与正式更新的实时组装摘要。
/// @since Beta v0.13.0
pub(super) fn overlay_audio_summary(
  journal: &TaskJournal,
  telemetry: &assembler::AssemblyTelemetry,
  overlay: &AudioLiveAssemblyOverlay,
) -> PackageTaskSummary {
  overlay.overlay(journal, telemetry.snapshot().written_bytes)
}

#[cfg(test)]
mod tests {
  use super::{BandwidthTracker, apply_assembly_write_bandwidth};
  use crate::game::{journal::TaskJournal, model::SchemeId};
  use std::time::{Duration, Instant};

  /// 无写入时旧速度必须衰减，最终清空没有依据的剩余时间。
  /// @since Beta v0.13.0
  #[test]
  fn stalled_writes_decay_and_expire_eta() {
    let now = Instant::now();
    let mut tracker = BandwidthTracker::new(100, now);
    let mut journal = TaskJournal::from_switch(
      "task".to_string(),
      "installation".to_string(),
      SchemeId::CnOfficial,
      SchemeId::CnOfficial,
      "a".repeat(64),
      0,
      0,
    );
    journal.assembly_total_bytes = 4096;
    let speed = tracker.sample(2148, 1, now + Duration::from_secs(2));
    assert_eq!(speed, 1024);
    assert!(apply_assembly_write_bandwidth(&mut journal, speed));
    assert_eq!(journal.assembly_eta_seconds, Some(4));
    let speed = tracker.sample(2148, 1, now + Duration::from_secs(3));
    assert_eq!(speed, 512);
    apply_assembly_write_bandwidth(&mut journal, speed);
    assert_eq!(journal.assembly_eta_seconds, Some(8));
    for seconds in 4..=14 {
      let speed = tracker.sample(2148, 1, now + Duration::from_secs(seconds));
      apply_assembly_write_bandwidth(&mut journal, speed);
    }
    assert_eq!(journal.assembly_bytes_per_second, 0);
    assert_eq!(journal.assembly_eta_seconds, None);
  }

  /// 采样使用实际窗口并保留平滑；并发数归零后清除上一轮速度。
  /// @since Beta v0.13.0
  #[test]
  fn bandwidth_uses_elapsed_time_and_resets_after_workers_finish() {
    let now = Instant::now();
    let mut tracker = BandwidthTracker::new(0, now);
    assert_eq!(tracker.sample(2000, 2, now + Duration::from_secs(2)), 1000);
    assert_eq!(tracker.sample(6000, 2, now + Duration::from_secs(4)), 1300);
    assert_eq!(tracker.sample(7000, 0, now + Duration::from_secs(5)), 0);
    assert_eq!(tracker.sample(9000, 1, now + Duration::from_secs(7)), 1000);
  }
}
