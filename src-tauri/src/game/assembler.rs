//! 将已验证的 manifest-diff 计划流式组装到任务 staging 目录。
//! @since Beta v0.11.5

use super::{
  model::PackagePlanStrategy,
  path_guard::{
    prepare_guarded_manifest_directory, prepare_manifest_output_file,
    resolve_existing_manifest_file,
  },
  planner::{PayloadEncoding, PersistedPlan, PlanAsset, PlanChunk, cached_chunk_matches},
};
use md5::{Digest, Md5};
use std::{
  collections::HashMap,
  fs::{self, File, OpenOptions},
  io::{BufReader, Read, Seek, SeekFrom, Write},
  path::{Path, PathBuf},
  sync::atomic::{AtomicBool, Ordering},
};

const COPY_BUFFER_SIZE: usize = 128 * 1024;

/// 已成功写入 staging 的资源统计。
#[derive(Debug, Default, Eq, PartialEq)]
pub(crate) struct AssemblySummary {
  pub(crate) asset_count: usize,
  pub(crate) assembled_bytes: u64,
}

/// 将一个已 hydrate 的 manifest-diff 计划组装到任务私有 staging 目录。
///
/// 此函数绝不会写入 `game_root`；它只将经过校验的完整资源原子提交至
/// `<task_root>/tasks/<plan_id>/staging`。调用方应在提交阶段之外使用该目录。
pub(crate) fn assemble_manifest_plan(
  plan: &PersistedPlan,
  game_root: &Path,
  task_root: &Path,
  canceled: &AtomicBool,
) -> Result<AssemblySummary, String> {
  if plan.strategy != PackagePlanStrategy::ManifestDiff {
    return Err("当前组装器只支持 manifest-diff 资源计划".to_string());
  }
  check_canceled(canceled)?;
  if plan.downloads.iter().any(|download| download.encoding == PayloadEncoding::LegacyUnspecified) {
    return Err("资源计划缺少载荷编码；请重新验证远端清单".to_string());
  }

  let cache_root = task_root.join("cache").join("chunks");
  let staging_root =
    prepare_guarded_manifest_directory(task_root, &format!("tasks/{}/staging", plan.plan_id))?;

  let downloads = plan
    .downloads
    .iter()
    .map(|download| (download.id.as_str(), download))
    .collect::<HashMap<_, _>>();
  let mut summary = AssemblySummary::default();
  for asset in &plan.assets {
    check_canceled(canceled)?;
    validate_asset_layout(asset, &downloads)?;
    assemble_asset(asset, &downloads, game_root, &cache_root, &staging_root, canceled)?;
    summary.asset_count += 1;
    summary.assembled_bytes = summary
      .assembled_bytes
      .checked_add(asset.size)
      .ok_or_else(|| "组装资源总大小溢出".to_string())?;
  }
  Ok(summary)
}

fn validate_asset_layout<'a>(
  asset: &PlanAsset,
  downloads: &HashMap<&'a str, &'a super::planner::PlanDownload>,
) -> Result<(), String> {
  if asset.patch.is_some() {
    return Err(format!("manifest-diff 资源不能包含 patch：{}", asset.name));
  }
  let mut chunks = asset.chunks.iter().collect::<Vec<_>>();
  chunks.sort_by_key(|chunk| chunk.target_offset);
  let mut previous_end = 0_u64;
  for chunk in &chunks {
    let end = chunk
      .target_offset
      .checked_add(chunk.decompressed_size)
      .ok_or_else(|| format!("资源 chunk 目标范围溢出：{}", asset.name))?;
    if chunk.target_offset < previous_end {
      return Err(format!("资源 chunk 布局重叠：{}", asset.name));
    }
    if end > asset.size {
      return Err(format!("资源 chunk 超出目标文件边界：{}", asset.name));
    }
    previous_end = end;
  }
  for chunk in chunks {
    if chunk.decompressed_size == 0 || chunk.decompressed_md5.len() != 32 {
      return Err(format!("资源 chunk 元数据无效：{}", asset.name));
    }
    if chunk.reuse.is_none() {
      let download = downloads
        .get(chunk.id.as_str())
        .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
      if download.compressed_size != chunk.compressed_size
        || download.decompressed_size != chunk.decompressed_size
      {
        return Err(format!("资源 chunk 下载元数据不一致：{}", chunk.id));
      }
      if download.encoding == PayloadEncoding::LegacyUnspecified {
        return Err(format!("资源 chunk 缺少载荷编码：{}", chunk.id));
      }
    }
  }
  Ok(())
}

fn assemble_asset(
  asset: &PlanAsset,
  downloads: &HashMap<&str, &super::planner::PlanDownload>,
  game_root: &Path,
  cache_root: &Path,
  staging_root: &Path,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  let partial = partial_path(&output)?;
  remove_stale_partial(&partial)?;
  remove_stale_output(&output)?;

  let result = (|| {
    let mut file = OpenOptions::new()
      .create_new(true)
      .read(true)
      .write(true)
      .open(&partial)
      .map_err(|error| format!("创建资源临时文件失败：{}：{error}", asset.name))?;
    file
      .set_len(asset.size)
      .map_err(|error| format!("设置资源临时文件长度失败：{}：{error}", asset.name))?;
    let mut chunks = asset.chunks.iter().collect::<Vec<_>>();
    chunks.sort_by_key(|chunk| chunk.target_offset);
    for chunk in chunks {
      check_canceled(canceled)?;
      file
        .seek(SeekFrom::Start(chunk.target_offset))
        .map_err(|error| format!("定位资源 chunk 失败：{}：{error}", asset.name))?;
      if let Some(reuse) = &chunk.reuse {
        write_reused_chunk(
          &mut file,
          chunk,
          game_root,
          &reuse.asset_name,
          reuse.source_offset,
          canceled,
        )?;
      } else {
        let download = downloads
          .get(chunk.id.as_str())
          .ok_or_else(|| format!("资源 chunk 缺少下载缓存：{}", chunk.id))?;
        write_downloaded_chunk(&mut file, chunk, cache_root, download, canceled)?;
      }
    }
    let output_size = file
      .metadata()
      .map_err(|error| format!("读取资源临时文件长度失败：{}：{error}", asset.name))?
      .len();
    if output_size != asset.size {
      return Err(format!("资源长度校验失败：{}", asset.name));
    }
    file
      .seek(SeekFrom::Start(0))
      .map_err(|error| format!("定位资源临时文件失败：{}：{error}", asset.name))?;
    let actual_asset_md5 = hash_exact_file(&mut file, asset.size, canceled)?;
    if !actual_asset_md5.eq_ignore_ascii_case(&asset.md5) {
      return Err(format!("资源 MD5 校验失败：{}", asset.name));
    }
    check_canceled(canceled)?;
    file.sync_all().map_err(|error| format!("同步资源临时文件失败：{}：{error}", asset.name))?;
    drop(file);
    fs::rename(&partial, &output)
      .map_err(|error| format!("提交 staging 资源失败：{}：{error}", asset.name))?;
    Ok(())
  })();
  if result.is_err() {
    let _ = fs::remove_file(&partial);
  }
  result
}

fn write_downloaded_chunk(
  output: &mut File,
  chunk: &PlanChunk,
  cache_root: &Path,
  download: &super::planner::PlanDownload,
  canceled: &AtomicBool,
) -> Result<(), String> {
  check_canceled(canceled)?;
  if !cached_chunk_matches(cache_root, download) {
    return Err(format!("下载缓存完整性复验失败：{}", chunk.id));
  }
  let path = cache_root.join(&download.cache_key);
  let file =
    File::open(&path).map_err(|error| format!("打开下载缓存失败：{}：{error}", chunk.id))?;
  match download.encoding {
    PayloadEncoding::Raw => {
      if download.compressed_size != download.decompressed_size {
        return Err(format!("Raw 下载缓存大小不一致：{}", chunk.id));
      }
      let mut reader = BufReader::new(file);
      write_exact_chunk(output, chunk, &mut reader, canceled)?;
    }
    PayloadEncoding::Zstd => {
      let mut reader = zstd::stream::read::Decoder::new(BufReader::new(file))
        .map_err(|error| format!("打开 zstd 下载缓存失败：{}：{error}", chunk.id))?;
      write_exact_chunk(output, chunk, &mut reader, canceled)?;
      let mut extra = [0_u8; 1];
      if reader
        .read(&mut extra)
        .map_err(|error| format!("读取 zstd 下载缓存失败：{}：{error}", chunk.id))?
        != 0
      {
        return Err(format!("zstd 下载缓存解压后超出计划大小：{}", chunk.id));
      }
    }
    PayloadEncoding::LegacyUnspecified => {
      return Err(format!("资源 chunk 缺少载荷编码：{}", chunk.id));
    }
  }
  Ok(())
}

fn write_reused_chunk(
  output: &mut File,
  chunk: &PlanChunk,
  game_root: &Path,
  asset_name: &str,
  source_offset: u64,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let path = resolve_existing_manifest_file(game_root, asset_name)?;
  let source_end = source_offset
    .checked_add(chunk.decompressed_size)
    .ok_or_else(|| format!("复用 chunk 源范围溢出：{}", chunk.id))?;
  let metadata = fs::metadata(&path)
    .map_err(|error| format!("读取复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  if metadata.len() < source_end {
    return Err(format!("复用 chunk 源文件范围不足：{}", chunk.id));
  }
  let mut file = File::open(&path)
    .map_err(|error| format!("打开复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  file
    .seek(SeekFrom::Start(source_offset))
    .map_err(|error| format!("定位复用 chunk 源文件失败：{}：{error}", chunk.id))?;
  let mut reader = BufReader::new(file);
  write_exact_chunk(output, chunk, &mut reader, canceled)
}

fn write_exact_chunk<R: Read>(
  output: &mut File,
  chunk: &PlanChunk,
  reader: &mut R,
  canceled: &AtomicBool,
) -> Result<(), String> {
  let mut remaining = chunk.decompressed_size;
  let mut chunk_hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  while remaining > 0 {
    check_canceled(canceled)?;
    let maximum = usize::try_from(remaining.min(buffer.len() as u64))
      .map_err(|_| format!("资源 chunk 大小无法表示：{}", chunk.id))?;
    let read = reader
      .read(&mut buffer[..maximum])
      .map_err(|error| format!("读取资源 chunk 失败：{}：{error}", chunk.id))?;
    if read == 0 {
      return Err(format!("资源 chunk 小于计划解压大小：{}", chunk.id));
    }
    output
      .write_all(&buffer[..read])
      .map_err(|error| format!("写入资源 chunk 失败：{}：{error}", chunk.id))?;
    chunk_hasher.update(&buffer[..read]);
    remaining -= read as u64;
  }
  let actual_md5 = format!("{:x}", chunk_hasher.finalize());
  if !actual_md5.eq_ignore_ascii_case(&chunk.decompressed_md5) {
    return Err(format!("资源 chunk MD5 校验失败：{}", chunk.id));
  }
  Ok(())
}

fn hash_exact_file(file: &mut File, size: u64, canceled: &AtomicBool) -> Result<String, String> {
  let mut remaining = size;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; COPY_BUFFER_SIZE];
  while remaining > 0 {
    check_canceled(canceled)?;
    let maximum = usize::try_from(remaining.min(buffer.len() as u64))
      .map_err(|_| "资源文件大小无法表示".to_string())?;
    let read = file
      .read(&mut buffer[..maximum])
      .map_err(|error| format!("读取资源临时文件失败：{error}"))?;
    if read == 0 {
      return Err("资源临时文件小于计划大小".to_string());
    }
    hasher.update(&buffer[..read]);
    remaining -= read as u64;
  }
  Ok(format!("{:x}", hasher.finalize()))
}

fn partial_path(output: &Path) -> Result<PathBuf, String> {
  let name = output.file_name().ok_or_else(|| "资源 staging 输出路径缺少文件名".to_string())?;
  let mut partial_name = name.to_os_string();
  partial_name.push(".part");
  Ok(output.with_file_name(partial_name))
}

fn remove_stale_partial(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理过期资源临时文件失败：{error}")),
  }
}

/// `prepare_manifest_output_file` 已检查该路径及其父目录；仅删除受任务 staging 管控的普通文件。
fn remove_stale_output(path: &Path) -> Result<(), String> {
  match fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(format!("清理过期 staging 资源失败：{error}")),
  }
}

fn check_canceled(canceled: &AtomicBool) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) {
    Err("游戏资源组装已取消".to_string())
  } else {
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::{assemble_manifest_plan, partial_path};
  use crate::game::{
    model::{PackagePlanStrategy, PackagePlanTarget, SchemeId},
    planner::{
      PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction, PlanChunk, PlanDownload,
      PlanDownloadHashKind, PlanReuse,
    },
  };
  use md5::{Digest, Md5};
  use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
  };
  use uuid::Uuid;
  use xxhash_rust::xxh64::xxh64;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-assembler-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }

    fn task_root(&self) -> PathBuf {
      let path = self.0.join("task-root");
      fs::create_dir_all(&path).unwrap();
      path
    }

    fn game_root(&self) -> PathBuf {
      self.0.join("game-root")
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn md5(bytes: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
  }

  fn plan(downloads: Vec<PlanDownload>, assets: Vec<PlanAsset>) -> PersistedPlan {
    PersistedPlan {
      schema_version: 3,
      plan_id: "assembler-test".to_string(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Main,
      source_tag: "1.0.0".to_string(),
      target_tag: "1.0.1".to_string(),
      manifest_digest: "0".repeat(64),
      strategy: PackagePlanStrategy::ManifestDiff,
      downloads,
      assets,
      delete_files: Vec::new(),
      inventory: Vec::new(),
      created_at: "2026-01-01T00:00:00Z".to_string(),
    }
  }

  fn downloaded_chunk(
    id: &str,
    cache_key: &str,
    bytes: &[u8],
    encoding: PayloadEncoding,
  ) -> PlanDownload {
    PlanDownload {
      id: id.to_string(),
      cache_key: cache_key.to_string(),
      hash_kind: PlanDownloadHashKind::XxHash64,
      expected_hash: format!("{:016x}", xxh64(bytes, 0)),
      compressed_size: bytes.len() as u64,
      decompressed_size: bytes.len() as u64,
      encoding,
      url_prefix: String::new(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    }
  }

  fn asset(name: &str, bytes: &[u8], chunks: Vec<PlanChunk>) -> PlanAsset {
    PlanAsset {
      name: name.to_string(),
      action: PlanAssetAction::Add,
      source: None,
      size: bytes.len() as u64,
      md5: md5(bytes),
      chunks,
      patch: None,
    }
  }

  fn chunk(id: &str, bytes: &[u8], reuse: Option<PlanReuse>) -> PlanChunk {
    PlanChunk {
      id: id.to_string(),
      decompressed_md5: md5(bytes),
      target_offset: 0,
      compressed_size: bytes.len() as u64,
      decompressed_size: bytes.len() as u64,
      reuse,
    }
  }

  fn write_cache(task_root: &Path, key: &str, bytes: &[u8]) {
    let cache = task_root.join("cache/chunks");
    fs::create_dir_all(&cache).unwrap();
    fs::write(cache.join(key), bytes).unwrap();
  }

  fn staging_file(task_root: &Path) -> PathBuf {
    task_root.join("tasks/assembler-test/staging/target.bin")
  }

  #[test]
  fn assembles_raw_cached_chunk_into_staging() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"raw manifest chunk";
    let download = downloaded_chunk("raw-id", "raw-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let plan =
      plan(vec![download], vec![asset("target.bin", bytes, vec![chunk("raw-id", bytes, None)])]);

    let summary =
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .unwrap();

    assert_eq!(summary.asset_count, 1);
    assert_eq!(summary.assembled_bytes, bytes.len() as u64);
    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), bytes);
  }

  #[test]
  fn assembles_zstd_cached_chunk_into_staging() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let plain = b"zstd manifest chunk with a longer payload";
    let compressed = zstd::stream::encode_all(&plain[..], 1).unwrap();
    let mut download =
      downloaded_chunk("zstd-id", "zstd-cache", &compressed, PayloadEncoding::Zstd);
    download.decompressed_size = plain.len() as u64;
    write_cache(&task_root, &download.cache_key, &compressed);
    let mut target_chunk = chunk("zstd-id", plain, None);
    target_chunk.compressed_size = compressed.len() as u64;
    let plan = plan(vec![download], vec![asset("target.bin", plain, vec![target_chunk])]);

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), plain);
  }

  #[test]
  fn assembles_sparse_chunk_layout_with_zero_filled_gap() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let first_bytes = b"ab";
    let second_bytes = b"cd";
    let expected = b"ab\0\0cd";
    let first = downloaded_chunk("gap-first", "gap-first-cache", first_bytes, PayloadEncoding::Raw);
    let second =
      downloaded_chunk("gap-second", "gap-second-cache", second_bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &first.cache_key, first_bytes);
    write_cache(&task_root, &second.cache_key, second_bytes);
    let mut second_chunk = chunk("gap-second", second_bytes, None);
    second_chunk.target_offset = 4;
    let plan = plan(
      vec![first, second],
      vec![asset(
        "target.bin",
        expected,
        vec![chunk("gap-first", first_bytes, None), second_chunk],
      )],
    );

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), expected);
  }

  #[test]
  fn assembles_reused_chunk_without_writing_game_root() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let game_root = root.game_root();
    let bytes = b"reused manifest chunk";
    fs::create_dir_all(&game_root).unwrap();
    fs::write(game_root.join("source.bin"), bytes).unwrap();
    let reuse = PlanReuse { asset_name: "source.bin".to_string(), source_offset: 0 };
    let plan = plan(
      Vec::new(),
      vec![asset("target.bin", bytes, vec![chunk("reuse-id", bytes, Some(reuse))])],
    );

    assemble_manifest_plan(&plan, &game_root, &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(staging_file(&task_root)).unwrap(), bytes);
    assert_eq!(fs::read(game_root.join("source.bin")).unwrap(), bytes);
  }

  #[test]
  fn replaces_existing_staging_output_after_guarding_it() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"replacement output";
    let download = downloaded_chunk("replace", "replace-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let plan =
      plan(vec![download], vec![asset("target.bin", bytes, vec![chunk("replace", bytes, None)])]);
    let existing = staging_file(&task_root);
    fs::create_dir_all(existing.parent().unwrap()).unwrap();
    fs::write(&existing, b"interrupted staging output").unwrap();

    assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false)).unwrap();

    assert_eq!(fs::read(existing).unwrap(), bytes);
  }

  #[test]
  fn rejects_chunk_md5_mismatch() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"bad chunk digest";
    let download = downloaded_chunk("bad-md5", "bad-md5-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let mut target_chunk = chunk("bad-md5", bytes, None);
    target_chunk.decompressed_md5 = md5(b"different");
    let plan = plan(vec![download], vec![asset("target.bin", bytes, vec![target_chunk])]);

    assert!(
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .is_err()
    );
    assert!(!staging_file(&task_root).exists());
    assert!(!partial_path(&staging_file(&task_root)).unwrap().exists());
  }

  #[test]
  fn rejects_asset_md5_mismatch() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"bad asset digest";
    let download = downloaded_chunk("bad-asset", "bad-asset-cache", bytes, PayloadEncoding::Raw);
    write_cache(&task_root, &download.cache_key, bytes);
    let mut output = asset("target.bin", bytes, vec![chunk("bad-asset", bytes, None)]);
    output.md5 = md5(b"different");
    let plan = plan(vec![download], vec![output]);

    assert!(
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .is_err()
    );
    assert!(!staging_file(&task_root).exists());
  }

  #[test]
  fn rejects_overlapping_chunk_layout_before_opening_cache() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let bytes = b"abcd";
    let mut first = chunk("one", b"ab", None);
    let mut second = chunk("two", b"cd", None);
    first.target_offset = 0;
    second.target_offset = 1;
    let plan = plan(Vec::new(), vec![asset("target.bin", bytes, vec![first, second])]);

    let error =
      assemble_manifest_plan(&plan, &root.game_root(), &task_root, &AtomicBool::new(false))
        .unwrap_err();
    assert!(error.contains("布局重叠"));
    assert!(!staging_file(&task_root).exists());
  }

  #[test]
  fn stops_before_writing_when_canceled() {
    let root = TempRoot::new();
    let task_root = root.task_root();
    let canceled = AtomicBool::new(true);
    let plan = plan(Vec::new(), Vec::new());

    assert!(assemble_manifest_plan(&plan, &root.game_root(), &task_root, &canceled).is_err());
    assert!(!task_root.join("tasks/assembler-test/staging").exists());
  }
}
