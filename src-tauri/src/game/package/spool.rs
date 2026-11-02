//! 安装任务私有分片的生命周期、完成游标与磁盘回收。
//! @since Beta v0.13.0

use crate::game::{
  installer,
  planner::{PersistedPlan, cached_chunk_matches},
};
use std::{
  collections::{HashMap, HashSet},
  fs,
  path::Path,
  sync::{Arc, Mutex},
};

/// 任务私有 spool 中一个已知对象的增量记账。
struct ResidentSpoolFile {
  id: String,
  bytes: u64,
}

/// 全新安装私有 spool 的增量记账。
/// @since Beta v0.13.0
///
/// 每个资源证据落盘后立即扣减其对象消费者；乱序完成不会再被连续游标阻塞释放。
/// `spool_bytes` 在 `from_disk` 时计入目录内全部普通文件，之后只对已知对象做加减，
/// 删除失败不会漏记，避免空间检查低估占用。
pub(super) struct InstallSpoolTracker {
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

/// 资源完成集合及用于重启恢复的连续游标。
/// @since Beta v0.13.0
#[derive(Clone, Copy)]
pub(super) struct InstallCompletionSnapshot {
  pub(super) completed_count: usize,
  pub(super) completed_bytes: u64,
  pub(super) contiguous_cursor: usize,
  pub(super) contiguous_bytes: u64,
}

impl InstallSpoolTracker {
  /// 从磁盘现状构建：一次扫描 spool 目录与共享缓存，之后只做增量更新。
  /// @since Beta v0.13.0
  pub(super) fn from_disk(
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

  /// 返回当前记账的 spool 字节数。
  /// @since Beta v0.13.0
  pub(super) fn spool_bytes(&self) -> u64 {
    self.spool_bytes
  }

  /// 返回已完成下载对象的数量。
  /// @since Beta v0.13.0
  pub(super) fn committed_step(&self) -> usize {
    self.counted.len()
  }

  /// 计算计划中尚未入账下载对象的字节数。
  /// @since Beta v0.13.0
  pub(super) fn remaining_download_bytes(&self, plan: &PersistedPlan) -> u64 {
    plan.downloads.iter().fold(0_u64, |total, download| {
      if self.counted.contains(&download.id) {
        total
      } else {
        total.saturating_add(download.compressed_size)
      }
    })
  }

  /// 记录一个已下载对象，并返回当前完成下载数。
  /// @since Beta v0.13.0
  pub(super) fn mark_downloaded(&mut self, id: &str, cache_key: &str, bytes: u64) -> usize {
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

  /// 作废并移除指定下载对象的记账。
  /// @since Beta v0.13.0
  pub(super) fn forget_download(&mut self, id: &str, cache_key: &str) {
    self.counted.remove(id);
    if let Some(existing) = self.resident.remove(cache_key) {
      self.spool_bytes = self.spool_bytes.saturating_sub(existing.bytes);
    }
  }

  /// 判断指定安装资源是否已完成。
  /// @since Beta v0.13.0
  pub(super) fn asset_completed(&self, index: usize) -> bool {
    self.completed_assets.contains(&index)
  }

  /// 标记安装资源完成并推进连续完成游标。
  /// @since Beta v0.13.0
  pub(super) fn mark_asset_completed(&mut self, plan: &PersistedPlan, index: usize) -> bool {
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

  /// 作废已完成安装资源，并回退连续完成游标。
  /// @since Beta v0.13.0
  pub(super) fn invalidate_asset(&mut self, plan: &PersistedPlan, index: usize) -> bool {
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
  /// @since Beta v0.13.0
  fn releasable_file(&self, id: &str) -> bool {
    self
      .consumers
      .get(id)
      .is_some_and(|indices| indices.iter().all(|index| self.completed_assets.contains(index)))
  }

  /// 生成安装完成快照。
  /// @since Beta v0.13.0
  pub(super) fn completion_snapshot(&self, plan: &PersistedPlan) -> InstallCompletionSnapshot {
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
/// @since Beta v0.13.0
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
    let metadata = match fs::symlink_metadata(&path) {
      Ok(metadata) => metadata,
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
        // Windows 会把父目录不可遍历也映射为 NotFound；只有 spool 根目录仍可信时
        // 才能把该错误解释为分片已不存在。
        let root_available = fs::symlink_metadata(spool_root).is_ok_and(|metadata| {
          metadata.is_dir()
            && !metadata.file_type().is_symlink()
            && !installer::is_reparse_point(&metadata)
        });
        if root_available {
          forget_released_spool_file(tracker, &key, &id);
        } else {
          log::warn!("[game-install][{}] 分片目录不可访问，保留占用记账", plan.plan_id);
        }
        continue;
      }
      Err(error) => {
        log::warn!("[game-install][{}] 读取待回收分片失败，保留占用记账：{error}", plan.plan_id);
        continue;
      }
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
      match installer::adopt_spool_chunk(shared_cache_root, spool_root, download, &plan.plan_id) {
        Ok(_) => {
          // adopt 成功或跳过（目标已存在/校验不符）后，确保 spool 残留文件被清理。
          if let Err(error) = fs::remove_file(&path)
            && error.kind() != std::io::ErrorKind::NotFound
          {
            log::warn!("[game-install][{}] 清理保留分片失败，保留占用记账：{error}", plan.plan_id);
            continue;
          }
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
/// @since Beta v0.13.0
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
/// @since Beta v0.13.0
pub(super) async fn release_spool_unneeded_async(
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

/// 读取安装 spool 字节数。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `tracker`: spool 跟踪器。
///
/// # 返回
/// 字节数。
pub(super) fn install_tracker_spool_bytes(tracker: &Mutex<InstallSpoolTracker>) -> u64 {
  tracker.lock().unwrap().spool_bytes()
}

#[cfg(test)]
mod tests {
  use super::{InstallSpoolTracker, release_spool_unneeded};
  use crate::game::{
    model::{PackagePlanStrategy, PackagePlanTarget, SchemeId},
    planner::{
      PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction, PlanChunk, PlanDownload,
      PlanDownloadHashKind, PlanFallback, PlanFile,
    },
  };
  use md5::{Digest, Md5};
  use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
  };
  use uuid::Uuid;

  /// 两个资源共享同一下载分片的独立临时夹具。
  /// @since Beta v0.13.0
  struct Fixture {
    root: PathBuf,
    spool: PathBuf,
    cache: PathBuf,
    plan: PersistedPlan,
  }

  impl Fixture {
    /// 创建真实小分片与引用它的两个资源。
    /// @since Beta v0.13.0
    fn new() -> Self {
      let root = std::env::temp_dir().join(format!("teyvatguide-spool-{}", Uuid::new_v4()));
      let spool = root.join("spool");
      let cache = root.join("cache");
      fs::create_dir_all(&spool).unwrap();
      fs::create_dir_all(&cache).unwrap();
      fs::write(spool.join("shared"), b"shared").unwrap();
      let hash = hex::encode(Md5::digest(b"shared"));
      let download = PlanDownload {
        id: "shared".to_string(),
        cache_key: "shared".to_string(),
        hash_kind: PlanDownloadHashKind::Md5,
        expected_hash: hash.clone(),
        compressed_size: 6,
        decompressed_size: 6,
        encoding: PayloadEncoding::Raw,
        url_prefix: String::new(),
        url_suffix: String::new(),
        range_start: None,
        range_length: None,
      };
      let assets = ["one.bin", "two.bin"]
        .into_iter()
        .map(|name| PlanAsset {
          name: name.to_string(),
          action: PlanAssetAction::Add,
          source: None,
          size: 6,
          md5: hash.clone(),
          patch: None,
          chunks: vec![PlanChunk {
            id: "shared".to_string(),
            decompressed_md5: hash.clone(),
            target_offset: 0,
            compressed_size: 6,
            decompressed_size: 6,
            reuse: None,
          }],
        })
        .collect::<Vec<_>>();
      let plan = PersistedPlan {
        schema_version: 7,
        plan_id: Uuid::new_v4().to_string(),
        installation_id: "test-install".to_string(),
        source_scheme: SchemeId::CnOfficial,
        target_scheme: SchemeId::CnOfficial,
        target: PackagePlanTarget::Main,
        source_tag: Some("1.0.0".to_string()),
        target_tag: "2.0.0".to_string(),
        manifest_digest: "a".repeat(64),
        strategy: PackagePlanStrategy::ManifestDiff,
        downloads: vec![download.clone()],
        assets: assets.clone(),
        delete_files: Vec::new(),
        inventory: assets
          .iter()
          .map(|asset| PlanFile {
            name: asset.name.clone(),
            size: asset.size,
            md5: asset.md5.clone(),
          })
          .collect(),
        fallback: Some(PlanFallback {
          manifest_digest: "a".repeat(64),
          downloads: vec![download],
          assets,
        }),
        install_overlay: None,
        audio_selection: None,
        created_at: "2026-11-02T00:00:00Z".to_string(),
      };
      Self { root, spool, cache, plan }
    }

    /// 从真实磁盘状态构造被测记账器。
    /// @since Beta v0.13.0
    fn tracker(&self, completed: &[usize]) -> Arc<Mutex<InstallSpoolTracker>> {
      Arc::new(Mutex::new(InstallSpoolTracker::from_disk(
        &self.plan,
        &self.spool,
        &self.cache,
        completed.iter().copied().collect::<HashSet<_>>(),
      )))
    }
  }

  impl Drop for Fixture {
    /// 仅清理本测试创建的临时目录。
    /// @since Beta v0.13.0
    fn drop(&mut self) {
      assert_eq!(self.root.parent(), Some(std::env::temp_dir().as_path()));
      assert!(self.root.file_name().unwrap().to_string_lossy().starts_with("teyvatguide-spool-"));
      let _ = fs::remove_dir_all(&self.root);
    }
  }

  /// 共享分片只有在全部消费者完成后才释放，完成进度不会随磁盘释放倒退。
  /// @since Beta v0.13.0
  #[test]
  fn shared_chunk_waits_for_all_consumers() {
    let fixture = Fixture::new();
    let tracker = fixture.tracker(&[0]);
    assert_eq!(
      release_spool_unneeded(&tracker, &fixture.plan, &fixture.spool, &fixture.cache, false),
      0
    );
    assert!(fixture.spool.join("shared").exists());
    tracker.lock().unwrap().mark_asset_completed(&fixture.plan, 1);
    assert_eq!(
      release_spool_unneeded(&tracker, &fixture.plan, &fixture.spool, &fixture.cache, false),
      6
    );
    let tracker = tracker.lock().unwrap();
    assert_eq!(tracker.spool_bytes(), 0);
    assert_eq!(tracker.committed_step(), 1);
    assert_eq!(tracker.completion_snapshot(&fixture.plan).completed_count, 2);
  }

  /// 乱序完成与证据作废会正确回退连续游标，并阻止重做资源提前丢失分片。
  /// @since Beta v0.13.0
  #[test]
  fn invalidated_asset_blocks_release_and_rewinds_cursor() {
    let fixture = Fixture::new();
    let tracker = fixture.tracker(&[1]);
    {
      let mut tracker = tracker.lock().unwrap();
      assert_eq!(tracker.completion_snapshot(&fixture.plan).contiguous_cursor, 0);
      tracker.mark_asset_completed(&fixture.plan, 0);
      assert_eq!(tracker.completion_snapshot(&fixture.plan).contiguous_cursor, 2);
      tracker.invalidate_asset(&fixture.plan, 0);
      let snapshot = tracker.completion_snapshot(&fixture.plan);
      assert_eq!(snapshot.contiguous_cursor, 0);
      assert_eq!(snapshot.completed_count, 1);
      assert_eq!(snapshot.completed_bytes, 6);
    }
    assert_eq!(
      release_spool_unneeded(&tracker, &fixture.plan, &fixture.spool, &fixture.cache, false),
      0
    );
    assert!(fixture.spool.join("shared").exists());
  }

  /// 分片确实不存在时才撤销磁盘占用，不重复累计释放字节。
  /// @since Beta v0.13.0
  #[test]
  fn missing_chunk_clears_resident_accounting_once() {
    let fixture = Fixture::new();
    let tracker = fixture.tracker(&[0, 1]);
    fs::remove_file(fixture.spool.join("shared")).unwrap();
    assert_eq!(
      release_spool_unneeded(&tracker, &fixture.plan, &fixture.spool, &fixture.cache, false),
      0
    );
    assert_eq!(tracker.lock().unwrap().spool_bytes(), 0);
  }

  /// 文件系统探测失败不能被当作分片已释放，否则会低估磁盘占用。
  /// @since Beta v0.13.0
  #[test]
  fn metadata_failure_keeps_resident_accounting() {
    let fixture = Fixture::new();
    let tracker = fixture.tracker(&[0, 1]);
    let saved = fixture.root.join("saved-spool");
    fs::rename(&fixture.spool, &saved).unwrap();
    fs::write(&fixture.spool, b"not a directory").unwrap();
    assert_eq!(
      release_spool_unneeded(&tracker, &fixture.plan, &fixture.spool, &fixture.cache, false),
      0
    );
    assert_eq!(tracker.lock().unwrap().spool_bytes(), 6);
  }
}
