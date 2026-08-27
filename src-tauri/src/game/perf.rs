//! 游戏资源页性能基线计数器。
//!
//! 仅统计不改变行为：journal 读取、缓存目录遍历与 spool metadata 扫描次数。
//! 计数从进程启动（或 [`reset`]）开始累计，由 `game_perf_snapshot` 命令读取。
//! @since Beta v0.11.5

use serde::Serialize;
use std::{
  sync::{
    Mutex, OnceLock,
    atomic::{AtomicU64, Ordering},
  },
  time::Instant,
};

/// 性能基线快照。
#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GamePerfSnapshot {
  /// 完整 journal 目录枚举次数（`journal::list`）。
  pub journal_list_calls: u64,
  /// 单个 journal 文件读取与反序列化次数（`journal::load`）。
  pub journal_load_calls: u64,
  /// 缓存目录整树遍历次数（状态统计、计数与清理）。
  pub cache_dir_passes: u64,
  /// spool 目录全量 metadata 扫描次数（`spool_bytes`）。
  pub spool_dir_scans: u64,
  /// spool 单文件 metadata 探测次数（回收路径）。
  pub spool_metadata_probes: u64,
  /// 自上次重置以来的累计时长（毫秒）。
  pub elapsed_ms: u64,
}

struct GamePerfCounters {
  journal_list_calls: AtomicU64,
  journal_load_calls: AtomicU64,
  cache_dir_passes: AtomicU64,
  spool_dir_scans: AtomicU64,
  spool_metadata_probes: AtomicU64,
  anchor: Mutex<Instant>,
}

fn counters() -> &'static GamePerfCounters {
  static COUNTERS: OnceLock<GamePerfCounters> = OnceLock::new();
  COUNTERS.get_or_init(|| GamePerfCounters {
    journal_list_calls: AtomicU64::new(0),
    journal_load_calls: AtomicU64::new(0),
    cache_dir_passes: AtomicU64::new(0),
    spool_dir_scans: AtomicU64::new(0),
    spool_metadata_probes: AtomicU64::new(0),
    anchor: Mutex::new(Instant::now()),
  })
}

fn add(counter: &AtomicU64) {
  counter.fetch_add(1, Ordering::Relaxed);
}

/// 记录一次完整的 journal 目录枚举。
pub(crate) fn record_journal_list() {
  add(&counters().journal_list_calls);
}

/// 记录一次单个 journal 文件读取。
pub(crate) fn record_journal_load() {
  add(&counters().journal_load_calls);
}

/// 记录一次缓存目录整树遍历。
pub(crate) fn record_cache_dir_pass() {
  add(&counters().cache_dir_passes);
}

/// 记录一次 spool 目录全量 metadata 扫描。
pub(crate) fn record_spool_dir_scan() {
  add(&counters().spool_dir_scans);
}

/// 记录一次 spool 单文件 metadata 探测。
pub(crate) fn record_spool_metadata_probe() {
  add(&counters().spool_metadata_probes);
}

/// 读取当前累计计数。
pub(crate) fn snapshot() -> GamePerfSnapshot {
  let counters = counters();
  let elapsed_ms =
    u64::try_from(counters.anchor.lock().map_or(0, |anchor| anchor.elapsed().as_millis()))
      .unwrap_or(u64::MAX);
  GamePerfSnapshot {
    journal_list_calls: counters.journal_list_calls.load(Ordering::Relaxed),
    journal_load_calls: counters.journal_load_calls.load(Ordering::Relaxed),
    cache_dir_passes: counters.cache_dir_passes.load(Ordering::Relaxed),
    spool_dir_scans: counters.spool_dir_scans.load(Ordering::Relaxed),
    spool_metadata_probes: counters.spool_metadata_probes.load(Ordering::Relaxed),
    elapsed_ms,
  }
}

/// 清零所有计数并重置计时锚点。
pub(crate) fn reset() {
  let counters = counters();
  counters.journal_list_calls.store(0, Ordering::Relaxed);
  counters.journal_load_calls.store(0, Ordering::Relaxed);
  counters.cache_dir_passes.store(0, Ordering::Relaxed);
  counters.spool_dir_scans.store(0, Ordering::Relaxed);
  counters.spool_metadata_probes.store(0, Ordering::Relaxed);
  if let Ok(mut anchor) = counters.anchor.lock() {
    *anchor = Instant::now();
  }
}
