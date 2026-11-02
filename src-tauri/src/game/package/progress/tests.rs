//! 资源进度叠加与实时组装回归测试。
//! @since Beta v0.13.0

use super::{AudioLiveAssemblyOverlay, BandwidthTracker, apply_assembly_write_bandwidth};
use crate::game::{
  assembler,
  journal::TaskJournal,
  model::{PackagePlanStrategy, PackagePlanTarget, PackageTaskState, SchemeId},
  planner::{
    PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction, PlanChunk, PlanDownload,
    PlanDownloadHashKind, PlanFallback, PlanFile, PlanReuse, PlanSource,
  },
};
use md5::{Digest, Md5};
use std::{
  fs,
  path::PathBuf,
  sync::{Arc, atomic::AtomicBool},
  time::{Duration, Instant},
};
use uuid::Uuid;

/// 生成一段测试数据的 MD5。
///
/// @since Beta v0.13.0
fn md5_hex(bytes: &[u8]) -> String {
  hex::encode(Md5::digest(bytes))
}

/// 构造一个未压缩的真实下载对象。
///
/// @since Beta v0.13.0
fn raw_download(id: &str, bytes: &[u8]) -> PlanDownload {
  PlanDownload {
    id: id.to_string(),
    cache_key: id.to_string(),
    hash_kind: PlanDownloadHashKind::Md5,
    expected_hash: md5_hex(bytes),
    compressed_size: bytes.len() as u64,
    decompressed_size: bytes.len() as u64,
    encoding: PayloadEncoding::Raw,
    url_prefix: String::new(),
    url_suffix: String::new(),
    range_start: None,
    range_length: None,
  }
}

/// 构造一个 Raw 资源 chunk。
///
/// @since Beta v0.13.0
fn raw_chunk(id: &str, bytes: &[u8], target_offset: u64) -> PlanChunk {
  PlanChunk {
    id: id.to_string(),
    decompressed_md5: md5_hex(bytes),
    target_offset,
    compressed_size: bytes.len() as u64,
    decompressed_size: bytes.len() as u64,
    reuse: None,
  }
}

/// 构造一个复用旧文件区间的资源 chunk。
///
/// @since Beta v0.13.0
fn missing_reuse_chunk(target_offset: u64) -> PlanChunk {
  PlanChunk {
    id: "missing-source".to_string(),
    decompressed_md5: md5_hex(b"def"),
    target_offset,
    compressed_size: 3,
    decompressed_size: 3,
    reuse: Some(PlanReuse { asset_name: "missing.bin".to_string(), source_offset: 0 }),
  }
}

/// 构造一个资源计划资产。
///
/// @since Beta v0.13.0
fn asset(name: &str, bytes: &[u8], chunks: Vec<PlanChunk>) -> PlanAsset {
  PlanAsset {
    name: name.to_string(),
    action: PlanAssetAction::Modify,
    source: Some(PlanSource { size: bytes.len() as u64, md5: md5_hex(bytes) }),
    size: bytes.len() as u64,
    md5: md5_hex(bytes),
    chunks,
    patch: None,
  }
}

/// 构造最小可执行的 manifest-diff 计划。
///
/// @since Beta v0.13.0
fn plan(
  assets: Vec<PlanAsset>,
  downloads: Vec<PlanDownload>,
  fallback: Option<PlanFallback>,
) -> PersistedPlan {
  PersistedPlan {
    schema_version: 7,
    plan_id: Uuid::new_v4().to_string(),
    installation_id: "progress-test-installation".to_string(),
    source_scheme: SchemeId::CnOfficial,
    target_scheme: SchemeId::CnOfficial,
    target: PackagePlanTarget::Main,
    source_tag: Some("1.0.0".to_string()),
    target_tag: "2.0.0".to_string(),
    manifest_digest: "a".repeat(64),
    strategy: PackagePlanStrategy::ManifestDiff,
    downloads,
    inventory: assets
      .iter()
      .map(|asset| PlanFile { name: asset.name.clone(), size: asset.size, md5: asset.md5.clone() })
      .collect(),
    assets,
    delete_files: Vec::new(),
    fallback,
    install_overlay: None,
    audio_selection: None,
    created_at: "2026-11-03T00:00:00Z".to_string(),
  }
}

/// 一组仅由测试创建的真实小文件与强类型计划。
///
/// @since Beta v0.13.0
struct Fixture {
  root: PathBuf,
  task_root: PathBuf,
  game_root: PathBuf,
  output_root: PathBuf,
  primary: PersistedPlan,
  fallback: PersistedPlan,
  other: PersistedPlan,
  invalid: PersistedPlan,
}

impl Fixture {
  /// 创建 3 字节 Raw chunk、缺失旧源和完整 fallback 的最小夹具。
  ///
  /// @since Beta v0.13.0
  fn new() -> Self {
    let root = std::env::temp_dir().join(format!("teyvatguide-progress-{}", Uuid::new_v4()));
    let task_root = root.join("task");
    let game_root = root.join("game");
    let output_root = root.join("output");
    let cache_root = task_root.join("cache").join("chunks");
    fs::create_dir_all(&cache_root).expect("创建测试缓存目录失败");
    fs::create_dir_all(&game_root).expect("创建测试游戏目录失败");
    fs::create_dir_all(&output_root).expect("创建测试输出目录失败");

    let primary_download = raw_download("primary", b"abc");
    let fallback_left = raw_download("fallback-left", b"abc");
    let fallback_right = raw_download("fallback-right", b"def");
    let other_download = raw_download("other", b"mnopqr");
    let invalid_download = raw_download("invalid", b"abc");
    for (name, bytes) in [
      ("primary", b"abc".as_slice()),
      ("fallback-left", b"abc".as_slice()),
      ("fallback-right", b"def".as_slice()),
      ("other", b"mnopqr".as_slice()),
      ("invalid", b"abc".as_slice()),
    ] {
      fs::write(cache_root.join(name), bytes).expect("写入测试缓存分片失败");
    }

    let primary_asset =
      asset("asset.bin", b"abcdef", vec![raw_chunk("primary", b"abc", 0), missing_reuse_chunk(3)]);
    let fallback_asset = asset(
      "asset.bin",
      b"abcdef",
      vec![raw_chunk("fallback-left", b"abc", 0), raw_chunk("fallback-right", b"def", 3)],
    );
    let primary = plan(
      vec![primary_asset.clone()],
      vec![primary_download],
      Some(PlanFallback {
        manifest_digest: "a".repeat(64),
        downloads: vec![fallback_left.clone(), fallback_right.clone()],
        assets: vec![fallback_asset.clone()],
      }),
    );
    let fallback = plan(vec![fallback_asset], vec![fallback_left, fallback_right], None);
    let other = plan(
      vec![asset("other.bin", b"mnopqr", vec![raw_chunk("other", b"mnopqr", 0)])],
      vec![other_download],
      None,
    );
    let invalid_asset = PlanAsset {
      name: "invalid.bin".to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size: 3,
      md5: md5_hex(b"xyz"),
      chunks: vec![PlanChunk {
        id: "invalid".to_string(),
        decompressed_md5: md5_hex(b"xyz"),
        target_offset: 0,
        compressed_size: 3,
        decompressed_size: 3,
        reuse: None,
      }],
      patch: None,
    };
    let invalid = plan(vec![invalid_asset], vec![invalid_download], None);
    Self { root, task_root, game_root, output_root, primary, fallback, other, invalid }
  }

  /// 创建与计划一致的组装态 journal。
  ///
  /// @since Beta v0.13.0
  fn journal(&self, total_bytes: u64) -> TaskJournal {
    let mut journal = TaskJournal::from_plan(&self.primary);
    journal.state = PackageTaskState::Assembling;
    journal.assembly_total_count = 2;
    journal.assembly_total_bytes = total_bytes;
    journal
  }
}

impl Drop for Fixture {
  /// 仅删除本测试创建且带有固定前缀的临时目录。
  ///
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    let temp = std::env::temp_dir();
    let valid_parent = self.root.parent() == Some(temp.as_path());
    let valid_name = self
      .root
      .file_name()
      .and_then(|name| name.to_str())
      .is_some_and(|name| name.starts_with("teyvatguide-progress-"));
    assert!(valid_parent && valid_name);
    let _ = fs::remove_dir_all(&self.root);
  }
}

/// 执行一个真实资源组装并绑定独立写入进度。
///
/// @since Beta v0.13.0
fn assemble_with_progress(
  plan: &PersistedPlan,
  fixture: &Fixture,
  telemetry: &Arc<assembler::AssemblyTelemetry>,
  progress: Arc<assembler::AssemblyWriteProgress>,
  canceled: &AtomicBool,
) -> Result<assembler::AssetAssemblyOutcome, String> {
  let view = telemetry.with_write_progress(progress);
  assembler::assemble_plan_asset_with_source_outcome(
    plan,
    0,
    &fixture.game_root,
    &fixture.task_root,
    &fixture.output_root,
    canceled,
    Some(&view),
  )
}

/// 执行一个真实成功组装并绑定独立写入进度。
///
/// @since Beta v0.13.0
fn assemble_success_with_progress(
  plan: &PersistedPlan,
  fixture: &Fixture,
  telemetry: &Arc<assembler::AssemblyTelemetry>,
  progress: Arc<assembler::AssemblyWriteProgress>,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let view = telemetry.with_write_progress(progress);
  assembler::assemble_plan_asset_to_root(
    plan,
    0,
    &fixture.game_root,
    &fixture.task_root,
    &fixture.output_root,
    canceled,
    Some(&view),
  )
}

/// 无写入时旧速度必须衰减，最终清空没有依据的剩余时间。
///
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
///
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

/// AlreadyTarget 的零写入或部分写入都必须只清除自身，保留另一资源实时量。
///
/// @since Beta v0.13.0
#[test]
fn already_target_clears_own_attempt_without_touching_other_live_asset() {
  for (reuse_first_chunk, expected_written) in [(false, 3), (true, 0)] {
    let fixture = Fixture::new();
    fs::write(fixture.game_root.join("asset.bin"), b"abcdef").expect("写入目标文件失败");
    let overlay = AudioLiveAssemblyOverlay::new();
    let telemetry = assembler::AssemblyTelemetry::new();
    let canceled = AtomicBool::new(false);
    let mut journal = fixture.journal(12);
    let attempt_b = overlay.begin_attempt(1, 6);
    assemble_success_with_progress(
      &fixture.other,
      &fixture,
      &telemetry,
      Arc::clone(&attempt_b),
      &canceled,
    )
    .expect("另一资源组装失败");
    let mut primary = fixture.primary.clone();
    if reuse_first_chunk {
      primary.assets[0].chunks[0].reuse = missing_reuse_chunk(0).reuse;
    }
    let attempt_a = overlay.begin_attempt(0, 6);
    let outcome =
      assemble_with_progress(&primary, &fixture, &telemetry, Arc::clone(&attempt_a), &canceled)
        .expect("AlreadyTarget 组装失败");
    assert_eq!(outcome, assembler::AssetAssemblyOutcome::AlreadyTarget);
    assert_eq!(attempt_a.written_bytes(), expected_written);
    assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 6 + expected_written);
    overlay.clear_asset(0);
    assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 6);

    journal.assembly_completed_bytes = 6;
    overlay.clear_asset(0);
    assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 12);
    assert_eq!(telemetry.snapshot().written_bytes, 6 + expected_written);
    journal.assembly_completed_bytes = 12;
    overlay.clear_asset(1);
    assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 12);
  }
}

/// 首选路径部分写入后回退，最终展示只保留 fallback 与并发资源。
///
/// @since Beta v0.13.0
#[test]
fn fallback_replaces_partial_attempt_and_durable_completion_preserves_other_live_asset() {
  let fixture = Fixture::new();
  let overlay = AudioLiveAssemblyOverlay::new();
  let telemetry = assembler::AssemblyTelemetry::new();
  let canceled = AtomicBool::new(false);
  let mut journal = fixture.journal(18);
  journal.assembly_total_count = 3;

  let primary_attempt = overlay.begin_attempt(0, 6);
  let outcome = assemble_with_progress(
    &fixture.primary,
    &fixture,
    &telemetry,
    Arc::clone(&primary_attempt),
    &canceled,
  )
  .expect("首选路径组装失败");
  assert!(matches!(outcome, assembler::AssetAssemblyOutcome::FallbackRequired(_)));
  assert_eq!(primary_attempt.written_bytes(), 3);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 3);
  overlay.clear_asset(0);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 0);

  let fallback_attempt = overlay.begin_attempt(0, 6);
  assemble_success_with_progress(
    &fixture.fallback,
    &fixture,
    &telemetry,
    Arc::clone(&fallback_attempt),
    &canceled,
  )
  .expect("fallback 组装失败");
  assert_eq!(fallback_attempt.written_bytes(), 6);

  let other_attempt = overlay.begin_attempt(1, 6);
  assemble_success_with_progress(
    &fixture.other,
    &fixture,
    &telemetry,
    Arc::clone(&other_attempt),
    &canceled,
  )
  .expect("并发资源组装失败");
  assert_eq!(other_attempt.written_bytes(), 6);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 12);
  assert_eq!(telemetry.snapshot().written_bytes, 15);

  journal.state = PackageTaskState::ReadyToApply;
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 0);
  journal.state = PackageTaskState::Assembling;
  journal.assembly_completed_bytes = 6;
  overlay.clear_asset(0);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 12);
  journal.assembly_completed_bytes = 12;
  overlay.clear_asset(1);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 12);
}

/// 错误、暂停和取消都不能继续叠加已放弃的实时写入。
///
/// @since Beta v0.13.0
#[test]
fn error_pause_and_cancel_clear_abandoned_live_writes() {
  let fixture = Fixture::new();
  let overlay = AudioLiveAssemblyOverlay::new();
  let telemetry = assembler::AssemblyTelemetry::new();
  let canceled = AtomicBool::new(false);
  let mut journal = fixture.journal(6);

  let failed_attempt = overlay.begin_attempt(0, 3);
  let error = assemble_success_with_progress(
    &fixture.invalid,
    &fixture,
    &telemetry,
    Arc::clone(&failed_attempt),
    &canceled,
  );
  assert!(error.is_err());
  assert_eq!(failed_attempt.written_bytes(), 3);
  for state in [PackageTaskState::Paused, PackageTaskState::Canceled, PackageTaskState::Failed] {
    journal.state = state;
    assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 0);
  }
  overlay.clear_asset(0);
  journal.state = PackageTaskState::Assembling;
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 0);

  canceled.store(true, std::sync::atomic::Ordering::Release);
  let canceled_attempt = overlay.begin_attempt(0, 3);
  let canceled_result = assemble_success_with_progress(
    &fixture.invalid,
    &fixture,
    &telemetry,
    Arc::clone(&canceled_attempt),
    &canceled,
  );
  assert!(canceled_result.is_err());
  assert_eq!(canceled_attempt.written_bytes(), 0);
  overlay.clear_asset(0);
  assert_eq!(overlay.overlay(&journal).assembly_completed_bytes, 0);
}
