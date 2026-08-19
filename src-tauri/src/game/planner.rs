//! 游戏资源差异、空间估算与不可变计划持久化。
//! @since Beta v0.11.5

use super::{
  hoyoplay::{GameBranches, create_http_client},
  model::{GameInstallation, PackagePlanStrategy, PackagePlanSummary, PackagePlanTarget, SchemeId},
  path_guard::normalize_manifest_path,
  sophon::{
    Asset, DecodedBuild, DecodedPatchBuild, DownloadInfo, PatchInfo, chunk_xxhash64,
    get_decoded_build, get_decoded_patch_build,
  },
};
use chrono::Utc;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
  collections::HashMap,
  fs::{self, File, OpenOptions},
  io::{BufReader, Read, Write},
  path::Path,
};
use uuid::Uuid;
use xxhash_rust::xxh64::Xxh64;

const PLAN_SCHEMA_VERSION: u32 = 1;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_PLAN_BYTES: usize = 256 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedPlan {
  schema_version: u32,
  plan_id: String,
  installation_id: String,
  source_scheme: SchemeId,
  target_scheme: SchemeId,
  target: PackagePlanTarget,
  source_tag: String,
  target_tag: String,
  manifest_digest: String,
  strategy: PackagePlanStrategy,
  downloads: Vec<PlanDownload>,
  assets: Vec<PlanAsset>,
  delete_files: Vec<PlanDelete>,
  created_at: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanDownload {
  id: String,
  compressed_size: u64,
  decompressed_size: u64,
  url_prefix: String,
  url_suffix: String,
  range_start: Option<u64>,
  range_length: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanAsset {
  name: String,
  action: PlanAssetAction,
  size: u64,
  md5: String,
  chunks: Vec<PlanChunk>,
  patch: Option<PlanPatch>,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum PlanAssetAction {
  Add,
  Modify,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanChunk {
  id: String,
  decompressed_md5: String,
  target_offset: u64,
  compressed_size: u64,
  decompressed_size: u64,
  reuse: Option<PlanReuse>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanReuse {
  asset_name: String,
  source_offset: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanPatch {
  id: String,
  patch_file_size: u64,
  patch_md5: String,
  range_start: u64,
  range_length: u64,
  original_name: String,
  original_size: u64,
  original_md5: String,
}

#[derive(Serialize)]
struct PlanDelete {
  name: String,
  size: u64,
  md5: String,
}

struct PlanParts {
  strategy: PackagePlanStrategy,
  manifest_digest: String,
  downloads: Vec<PlanDownload>,
  assets: Vec<PlanAsset>,
  delete_files: Vec<PlanDelete>,
}

/// 请求远端清单，优先选择 patch，并将完整计划原子写入应用数据目录。
pub async fn create_and_persist_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  target: PackagePlanTarget,
  app_data_dir: &Path,
) -> Result<PackagePlanSummary, String> {
  let source_tag = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法生成资源计划".to_string())?;
  let target_branch = match target {
    PackagePlanTarget::Main => &branches.main,
    PackagePlanTarget::PreDownload => {
      branches.pre_download.as_ref().ok_or_else(|| "当前没有可用的预下载分支".to_string())?
    }
  };
  if source_tag == target_branch.tag {
    return Err("本地版本已与目标版本一致".to_string());
  }
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;

  let parts = if target_branch.diff_tags.iter().any(|tag| tag == source_tag) {
    match get_decoded_patch_build(&client, target_branch, source_tag, &installation.audio_languages)
      .await
    {
      Ok(build) => build_patch_plan(build, source_tag)?,
      Err(error) => {
        log::warn!("[game-package] patch 计划不可用，回退 manifest diff：{error}");
        build_manifest_plan(
          &client,
          &branches.main.with_tag(source_tag),
          target_branch,
          &installation.audio_languages,
        )
        .await?
      }
    }
  } else {
    build_manifest_plan(
      &client,
      &branches.main.with_tag(source_tag),
      target_branch,
      &installation.audio_languages,
    )
    .await?
  };

  let task_root = app_data_dir.join("game-tasks");
  let cache_root = task_root.join("cache/chunks");
  let cache_hit_bytes = calculate_cache_hits(&cache_root, &parts.downloads);
  let download_bytes = parts.downloads.iter().try_fold(0_u64, |total, item| {
    total.checked_add(item.compressed_size).ok_or_else(|| "计划下载字节数溢出".to_string())
  })?;
  let install_bytes = parts.assets.iter().try_fold(0_u64, |total, item| {
    total.checked_add(item.size).ok_or_else(|| "计划安装字节数溢出".to_string())
  })?;
  let required_free_bytes = download_bytes
    .saturating_sub(cache_hit_bytes)
    .checked_add(install_bytes)
    .and_then(|value| value.checked_add(SAFETY_MARGIN_BYTES))
    .ok_or_else(|| "计划所需空间溢出".to_string())?;
  let available_free_bytes = fs2::available_space(&installation.root_path)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  let plan_id = Uuid::new_v4().to_string();
  let summary = PackagePlanSummary {
    plan_id: plan_id.clone(),
    installation_id: installation.id.clone(),
    source_tag: source_tag.to_string(),
    target_tag: target_branch.tag.clone(),
    manifest_digest: parts.manifest_digest.clone(),
    strategy: parts.strategy,
    download_bytes,
    install_bytes,
    cache_hit_bytes,
    required_free_bytes,
    available_free_bytes,
    has_sufficient_space: available_free_bytes >= required_free_bytes,
    download_count: parts.downloads.len(),
    add_count: parts
      .assets
      .iter()
      .filter(|asset| matches!(asset.action, PlanAssetAction::Add))
      .count(),
    modify_count: parts
      .assets
      .iter()
      .filter(|asset| matches!(asset.action, PlanAssetAction::Modify))
      .count(),
    delete_count: parts.delete_files.len(),
  };
  let plan = PersistedPlan {
    schema_version: PLAN_SCHEMA_VERSION,
    plan_id: plan_id.clone(),
    installation_id: installation.id.clone(),
    source_scheme: scheme,
    target_scheme: scheme,
    target,
    source_tag: source_tag.to_string(),
    target_tag: target_branch.tag.clone(),
    manifest_digest: parts.manifest_digest,
    strategy: parts.strategy,
    downloads: parts.downloads,
    assets: parts.assets,
    delete_files: parts.delete_files,
    created_at: Utc::now().to_rfc3339(),
  };
  persist_plan(&task_root, &plan_id, &plan)?;
  Ok(summary)
}

async fn build_manifest_plan(
  client: &reqwest::Client,
  source_branch: &super::hoyoplay::BranchDescriptor,
  target_branch: &super::hoyoplay::BranchDescriptor,
  audio_languages: &[String],
) -> Result<PlanParts, String> {
  let (source, target) = futures_util::try_join!(
    get_decoded_build(client, source_branch, audio_languages),
    get_decoded_build(client, target_branch, audio_languages),
  )?;
  build_manifest_diff(source, target)
}

fn build_manifest_diff(source: DecodedBuild, target: DecodedBuild) -> Result<PlanParts, String> {
  let source_assets = collect_assets(&source)?;
  let target_assets = collect_assets(&target)?;
  let source_chunks = collect_reusable_chunks(&source_assets)?;
  let mut downloads = HashMap::<String, PlanDownload>::new();
  let mut assets = Vec::new();

  let target_downloads = collect_category_downloads(&target)?;
  let mut target_names = target_assets.keys().cloned().collect::<Vec<_>>();
  target_names.sort();
  for name in target_names {
    let target_asset = target_assets[&name];
    if source_assets.get(&name).is_some_and(|source_asset| assets_equal(source_asset, target_asset))
    {
      continue;
    }
    let action = if source_assets.contains_key(&name) {
      PlanAssetAction::Modify
    } else {
      PlanAssetAction::Add
    };
    let download =
      target_downloads.get(&name).ok_or_else(|| format!("目标资源缺少 chunk 下载信息：{name}"))?;
    let mut chunks = Vec::with_capacity(target_asset.asset_chunks.len());
    for chunk in &target_asset.asset_chunks {
      let compressed_size = positive_u64(chunk.chunk_size, "chunk 压缩大小")?;
      let decompressed_size = positive_u64(chunk.chunk_size_decompressed, "chunk 解压大小")?;
      let target_offset = nonnegative_u64(chunk.chunk_on_file_offset, "chunk 目标偏移")?;
      let reuse_key = (chunk.chunk_decompressed_hash_md5.clone(), decompressed_size);
      let reuse = source_chunks.get(&reuse_key).cloned();
      if reuse.is_none() {
        let candidate = PlanDownload {
          id: chunk.chunk_name.clone(),
          compressed_size,
          decompressed_size,
          url_prefix: download.url_prefix.clone(),
          url_suffix: download.url_suffix.clone(),
          range_start: None,
          range_length: None,
        };
        if let Some(existing) = downloads.get(&candidate.id) {
          if existing.compressed_size != candidate.compressed_size
            || existing.decompressed_size != candidate.decompressed_size
          {
            return Err("相同 chunk hash 对应了冲突的大小".to_string());
          }
        } else {
          downloads.insert(candidate.id.clone(), candidate);
        }
      }
      chunks.push(PlanChunk {
        id: chunk.chunk_name.clone(),
        decompressed_md5: chunk.chunk_decompressed_hash_md5.clone(),
        target_offset,
        compressed_size,
        decompressed_size,
        reuse,
      });
    }
    assets.push(PlanAsset {
      name,
      action,
      size: nonnegative_u64(target_asset.asset_size, "资源大小")?,
      md5: target_asset.asset_hash_md5.clone(),
      chunks,
      patch: None,
    });
  }
  let mut delete_files = source_assets
    .iter()
    .filter(|(name, _)| !target_assets.contains_key(*name))
    .map(|(name, asset)| {
      Ok(PlanDelete {
        name: name.clone(),
        size: nonnegative_u64(asset.asset_size, "删除资源大小")?,
        md5: asset.asset_hash_md5.clone(),
      })
    })
    .collect::<Result<Vec<_>, String>>()?;
  delete_files.sort_by(|left, right| left.name.cmp(&right.name));
  assets.sort_by(|left, right| left.name.cmp(&right.name));
  let mut downloads = downloads.into_values().collect::<Vec<_>>();
  downloads.sort_by(|left, right| left.id.cmp(&right.id));
  Ok(PlanParts {
    strategy: PackagePlanStrategy::ManifestDiff,
    manifest_digest: manifest_digest(&target),
    downloads,
    assets,
    delete_files,
  })
}

fn build_patch_plan(build: DecodedPatchBuild, source_tag: &str) -> Result<PlanParts, String> {
  let manifest_digest = patch_manifest_digest(&build);
  let mut downloads = HashMap::<(String, u64, u64), PlanDownload>::new();
  let mut assets = Vec::new();
  let mut delete_files = HashMap::<String, PlanDelete>::new();
  for manifest in &build.manifests {
    for file in &manifest.data.file_datas {
      let name = normalize_manifest_path(&file.file_name)?;
      let Some(info) = file
        .patches_entries
        .iter()
        .find(|entry| entry.key == source_tag)
        .and_then(|entry| entry.patch_info.as_ref())
      else {
        continue;
      };
      let patch = plan_patch(info)?;
      let key = (patch.id.clone(), patch.range_start, patch.range_length);
      downloads.entry(key).or_insert_with(|| PlanDownload {
        id: patch.id.clone(),
        compressed_size: patch.range_length,
        decompressed_size: patch.range_length,
        url_prefix: manifest.diff_download.url_prefix.clone(),
        url_suffix: manifest.diff_download.url_suffix.clone(),
        range_start: Some(patch.range_start),
        range_length: Some(patch.range_length),
      });
      assets.push(PlanAsset {
        name,
        action: if patch.original_size == 0 {
          PlanAssetAction::Add
        } else {
          PlanAssetAction::Modify
        },
        size: nonnegative_u64(file.file_size, "patch 目标资源大小")?,
        md5: file.file_hash.clone(),
        chunks: Vec::new(),
        patch: Some(patch),
      });
    }
    for entry in &manifest.data.delete_files_entries {
      if entry.key != source_tag {
        continue;
      }
      if let Some(files) = &entry.delete_files {
        for file in &files.infos {
          let name = normalize_manifest_path(&file.name)?;
          let candidate = PlanDelete {
            name: name.clone(),
            size: nonnegative_u64(file.size, "patch 删除资源大小")?,
            md5: file.hash.clone(),
          };
          if let Some(existing) = delete_files.get(&name)
            && (existing.size != candidate.size || existing.md5 != candidate.md5)
          {
            return Err(format!("patch 删除资源元数据冲突：{name}"));
          }
          delete_files.insert(name, candidate);
        }
      }
    }
  }
  assets.sort_by(|left, right| left.name.cmp(&right.name));
  let mut downloads = downloads.into_values().collect::<Vec<_>>();
  downloads
    .sort_by(|left, right| (&left.id, left.range_start).cmp(&(&right.id, right.range_start)));
  let mut delete_files = delete_files.into_values().collect::<Vec<_>>();
  delete_files.sort_by(|left, right| left.name.cmp(&right.name));
  Ok(PlanParts {
    strategy: PackagePlanStrategy::Patch,
    manifest_digest,
    downloads,
    assets,
    delete_files,
  })
}

fn collect_assets(build: &DecodedBuild) -> Result<HashMap<String, &Asset>, String> {
  let mut assets = HashMap::new();
  for manifest in &build.manifests {
    for asset in &manifest.data.assets {
      let name = normalize_manifest_path(&asset.asset_name)?;
      if assets.insert(name.clone(), asset).is_some() {
        return Err(format!("Sophon build 包含重复资源：{name}"));
      }
    }
  }
  Ok(assets)
}

fn collect_category_downloads(
  build: &DecodedBuild,
) -> Result<HashMap<String, &DownloadInfo>, String> {
  let mut downloads = HashMap::new();
  for manifest in &build.manifests {
    for asset in &manifest.data.assets {
      let name = normalize_manifest_path(&asset.asset_name)?;
      downloads.insert(name, &manifest.chunk_download);
    }
  }
  Ok(downloads)
}

fn collect_reusable_chunks(
  assets: &HashMap<String, &Asset>,
) -> Result<HashMap<(String, u64), PlanReuse>, String> {
  let mut chunks = HashMap::new();
  for (asset_name, asset) in assets {
    for chunk in &asset.asset_chunks {
      let size = positive_u64(chunk.chunk_size_decompressed, "旧 chunk 解压大小")?;
      chunks.entry((chunk.chunk_decompressed_hash_md5.clone(), size)).or_insert(PlanReuse {
        asset_name: asset_name.clone(),
        source_offset: nonnegative_u64(chunk.chunk_on_file_offset, "旧 chunk 偏移")?,
      });
    }
  }
  Ok(chunks)
}

fn assets_equal(left: &Asset, right: &Asset) -> bool {
  left.asset_size == right.asset_size
    && left.asset_hash_md5.eq_ignore_ascii_case(&right.asset_hash_md5)
}

fn plan_patch(info: &PatchInfo) -> Result<PlanPatch, String> {
  Ok(PlanPatch {
    id: info.id.clone(),
    patch_file_size: positive_u64(info.patch_file_size, "patch 文件大小")?,
    patch_md5: info.patches_file_hash.clone(),
    range_start: nonnegative_u64(info.patch_start_offset, "patch 起始偏移")?,
    range_length: positive_u64(info.patch_length, "patch 长度")?,
    original_name: if info.original_file_name.is_empty() {
      String::new()
    } else {
      normalize_manifest_path(&info.original_file_name)?
    },
    original_size: nonnegative_u64(info.original_file_size, "patch 原文件大小")?,
    original_md5: info.original_file_hash.clone(),
  })
}

fn manifest_digest(build: &DecodedBuild) -> String {
  let mut entries = build
    .manifests
    .iter()
    .map(|manifest| {
      format!("{}:{}:{}", manifest.matching_field, manifest.manifest_id, manifest.manifest_checksum)
    })
    .collect::<Vec<_>>();
  entries.sort();
  digest_parts(&build.tag, &entries)
}

fn patch_manifest_digest(build: &DecodedPatchBuild) -> String {
  let mut entries = build
    .manifests
    .iter()
    .map(|manifest| {
      format!("{}:{}:{}", manifest.matching_field, manifest.manifest_id, manifest.manifest_checksum)
    })
    .collect::<Vec<_>>();
  entries.sort();
  digest_parts(&build.tag, &entries)
}

fn digest_parts(tag: &str, entries: &[String]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(tag.as_bytes());
  for entry in entries {
    hasher.update([0]);
    hasher.update(entry.as_bytes());
  }
  format!("{:x}", hasher.finalize())
}

fn calculate_cache_hits(cache_root: &Path, downloads: &[PlanDownload]) -> u64 {
  downloads
    .iter()
    .filter(|download| download.range_start.is_none())
    .filter(|download| cached_chunk_matches(cache_root, download))
    .map(|download| download.compressed_size)
    .sum()
}

fn cached_chunk_matches(cache_root: &Path, download: &PlanDownload) -> bool {
  let expected = match chunk_xxhash64(&download.id) {
    Some(value) => value,
    None => return false,
  };
  let path = cache_root.join(&download.id);
  if !fs::metadata(&path).is_ok_and(|metadata| metadata.len() == download.compressed_size) {
    return false;
  }
  let Ok(file) = File::open(path) else {
    return false;
  };
  let mut reader = BufReader::new(file);
  let mut hasher = Xxh64::new(0);
  let mut buffer = [0_u8; 128 * 1024];
  loop {
    let Ok(read) = reader.read(&mut buffer) else {
      return false;
    };
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  hasher.digest() == expected
}

fn persist_plan(task_root: &Path, plan_id: &str, plan: &PersistedPlan) -> Result<(), String> {
  let directory = task_root.join("tasks").join(plan_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建游戏资源计划目录失败：{error}"))?;
  let content =
    serde_json::to_vec_pretty(plan).map_err(|error| format!("序列化游戏资源计划失败：{error}"))?;
  if content.len() > MAX_PLAN_BYTES {
    return Err("游戏资源计划超过安全大小上限".to_string());
  }
  let target = directory.join("plan.json");
  let temporary = directory.join("plan.json.tmp");
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建游戏资源计划临时文件失败：{error}"))?;
  file
    .write_all(&content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入游戏资源计划失败：{error}"))?;
  drop(file);
  fs::rename(&temporary, &target).map_err(|error| format!("提交游戏资源计划失败：{error}"))?;
  sync_directory(&directory)?;
  Ok(())
}

fn sync_directory(directory: &Path) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let _ = directory;
    Ok(())
  }
  #[cfg(not(target_os = "windows"))]
  {
    File::open(directory)
      .and_then(|file| file.sync_all())
      .map_err(|error| format!("刷新游戏资源计划目录失败：{error}"))
  }
}

fn positive_u64(value: i64, field: &str) -> Result<u64, String> {
  if value <= 0 {
    return Err(format!("{field}不是正整数"));
  }
  Ok(value as u64)
}

fn nonnegative_u64(value: i64, field: &str) -> Result<u64, String> {
  if value < 0 {
    return Err(format!("{field}为负数"));
  }
  Ok(value as u64)
}

#[cfg(test)]
mod tests {
  use super::{assets_equal, build_manifest_diff, build_patch_plan, digest_parts};
  use crate::game::{
    hoyoplay::{create_http_client, get_game_branches},
    model::{PackagePlanStrategy, SchemeId},
    sophon::{
      Asset, AssetChunk, DecodedBuild, DecodedManifest, DownloadInfo, ManifestProto,
      get_decoded_patch_build,
    },
  };

  fn download_info() -> DownloadInfo {
    serde_json::from_value(serde_json::json!({
      "encryption": 0,
      "password": "",
      "compression": 1,
      "url_prefix": "https://example.com/chunks",
      "url_suffix": "token=test"
    }))
    .unwrap()
  }

  fn asset(name: &str, md5: &str, chunk_name: &str, chunk_md5: &str) -> Asset {
    Asset {
      asset_name: name.to_string(),
      asset_chunks: vec![AssetChunk {
        chunk_name: chunk_name.to_string(),
        chunk_decompressed_hash_md5: chunk_md5.to_string(),
        chunk_on_file_offset: 0,
        chunk_size: 8,
        chunk_size_decompressed: 10,
      }],
      asset_type: 0,
      asset_size: 10,
      asset_hash_md5: md5.to_string(),
    }
  }

  fn build(tag: &str, assets: Vec<Asset>) -> DecodedBuild {
    DecodedBuild {
      tag: tag.to_string(),
      manifests: vec![DecodedManifest {
        matching_field: "game".to_string(),
        manifest_id: format!("manifest-{tag}"),
        manifest_checksum: "0123456789abcdef0123456789abcdef".to_string(),
        chunk_download: download_info(),
        data: ManifestProto { assets },
      }],
    }
  }

  #[test]
  fn asset_identity_requires_size_and_md5() {
    let left = Asset {
      asset_name: "file".to_string(),
      asset_chunks: Vec::new(),
      asset_type: 0,
      asset_size: 10,
      asset_hash_md5: "0123456789abcdef0123456789abcdef".to_string(),
    };
    let mut right = left.clone();
    assert!(assets_equal(&left, &right));
    right.asset_size = 11;
    assert!(!assets_equal(&left, &right));
  }

  #[test]
  fn manifest_digest_is_stable_for_ordered_inputs() {
    let entries = vec!["game:a:b".to_string(), "zh-cn:c:d".to_string()];
    assert_eq!(digest_parts("7.0.0", &entries), digest_parts("7.0.0", &entries));
  }

  #[test]
  fn manifest_diff_is_stable_and_deduplicates_reused_chunks() {
    let hash_a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    let hash_b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    let hash_c = "cccccccccccccccccccccccccccccccc";
    let source = build(
      "1.0.0",
      vec![
        asset("same.bin", hash_a, "1111111111111111", hash_a),
        asset("modify.bin", hash_b, "2222222222222222", hash_b),
        asset("delete.bin", hash_b, "2222222222222222", hash_b),
      ],
    );
    let target = build(
      "2.0.0",
      vec![
        asset("same.bin", hash_a, "1111111111111111", hash_a),
        asset("modify.bin", hash_c, "3333333333333333", hash_c),
        asset("reuse.bin", hash_a, "1111111111111111", hash_a),
      ],
    );
    let plan = build_manifest_diff(source, target).unwrap();
    assert_eq!(plan.strategy, PackagePlanStrategy::ManifestDiff);
    assert_eq!(plan.downloads.len(), 1);
    assert_eq!(plan.assets.len(), 2);
    assert_eq!(plan.delete_files.len(), 1);
    assert_eq!(plan.assets.iter().filter(|asset| asset.chunks[0].reuse.is_some()).count(), 1);
  }

  #[test]
  #[ignore = "只读访问官方 HoyoPlay/Sophon，用于 patch 计划协议冒烟验证"]
  fn plans_current_official_patch_manifest() {
    tauri::async_runtime::block_on(async {
      let client = create_http_client().unwrap();
      let branches = get_game_branches(&client, SchemeId::CnOfficial).await.unwrap();
      let source_tag = branches.main.diff_tags.first().unwrap();
      let build = get_decoded_patch_build(&client, &branches.main, source_tag, &[]).await.unwrap();
      let plan = build_patch_plan(build, source_tag).unwrap();
      assert_eq!(plan.strategy, PackagePlanStrategy::Patch);
      assert!(!plan.assets.is_empty());
      assert!(!plan.downloads.is_empty());
    });
  }
}
