//! 游戏资源差异、空间估算与不可变计划持久化。
//! @since Beta v0.11.5

use super::{
  hoyoplay::{GameBranches, create_http_client},
  model::{GameInstallation, PackagePlanStrategy, PackagePlanSummary, PackagePlanTarget, SchemeId},
  path_guard::{normalize_manifest_path, resolve_optional_manifest_file},
  sophon::{
    Asset, DecodedBuild, DecodedPatchBuild, DownloadInfo, PatchInfo, chunk_xxhash64,
    get_decoded_build, get_decoded_patch_build,
  },
};
use chrono::Utc;
use md5::Md5;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  collections::HashMap,
  fs::{self, File, OpenOptions},
  io::{BufReader, Read, Write},
  path::Path,
};
use uuid::Uuid;
use xxhash_rust::xxh64::Xxh64;

const PLAN_SCHEMA_VERSION: u32 = 4;
const LEGACY_PLAN_SCHEMA_VERSION_V3: u32 = 3;
const LEGACY_PLAN_SCHEMA_VERSION_V2: u32 = 2;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_PLAN_BYTES: usize = 256 * 1024 * 1024;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedPlan {
  pub(crate) schema_version: u32,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) source_scheme: SchemeId,
  pub(crate) target_scheme: SchemeId,
  pub(crate) target: PackagePlanTarget,
  pub(crate) source_tag: String,
  pub(crate) target_tag: String,
  pub(crate) manifest_digest: String,
  pub(crate) strategy: PackagePlanStrategy,
  pub(crate) downloads: Vec<PlanDownload>,
  pub(crate) assets: Vec<PlanAsset>,
  pub(crate) delete_files: Vec<PlanDelete>,
  #[serde(default)]
  pub(crate) inventory: Vec<PlanFile>,
  pub(crate) created_at: String,
}

/// The complete target manifest file inventory used to verify a finished update.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanFile {
  pub(crate) name: String,
  pub(crate) size: u64,
  pub(crate) md5: String,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanDownload {
  pub(crate) id: String,
  pub(crate) cache_key: String,
  pub(crate) hash_kind: PlanDownloadHashKind,
  pub(crate) expected_hash: String,
  pub(crate) compressed_size: u64,
  pub(crate) decompressed_size: u64,
  #[serde(default)]
  pub(crate) encoding: PayloadEncoding,
  #[serde(default, skip_serializing)]
  pub(crate) url_prefix: String,
  #[serde(default, skip_serializing)]
  pub(crate) url_suffix: String,
  pub(crate) range_start: Option<u64>,
  pub(crate) range_length: Option<u64>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PlanDownloadHashKind {
  XxHash64,
  Md5,
  UnsupportedPatchRange,
}

/// 下载对象写入目标资源前采用的载荷编码。
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PayloadEncoding {
  Raw,
  Zstd,
  /// v2 计划未保存编码；仅允许在重新请求远端清单前短暂存在。
  #[default]
  LegacyUnspecified,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanAsset {
  pub(crate) name: String,
  pub(crate) action: PlanAssetAction,
  #[serde(default)]
  pub(crate) source: Option<PlanSource>,
  pub(crate) size: u64,
  pub(crate) md5: String,
  pub(crate) chunks: Vec<PlanChunk>,
  pub(crate) patch: Option<PlanPatch>,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanSource {
  pub(crate) size: u64,
  pub(crate) md5: String,
}

#[derive(Clone, Copy, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PlanAssetAction {
  Add,
  Modify,
  Repair,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanChunk {
  pub(crate) id: String,
  pub(crate) decompressed_md5: String,
  pub(crate) target_offset: u64,
  pub(crate) compressed_size: u64,
  pub(crate) decompressed_size: u64,
  pub(crate) reuse: Option<PlanReuse>,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanReuse {
  pub(crate) asset_name: String,
  pub(crate) source_offset: u64,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanPatch {
  pub(crate) id: String,
  pub(crate) patch_file_size: u64,
  pub(crate) patch_md5: String,
  pub(crate) range_start: u64,
  pub(crate) range_length: u64,
  pub(crate) original_name: String,
  pub(crate) original_size: u64,
  pub(crate) original_md5: String,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
pub(crate) struct PlanDelete {
  pub(crate) name: String,
  pub(crate) size: u64,
  pub(crate) md5: String,
}

pub(crate) struct PlanParts {
  strategy: PackagePlanStrategy,
  manifest_digest: String,
  downloads: Vec<PlanDownload>,
  assets: Vec<PlanAsset>,
  delete_files: Vec<PlanDelete>,
  inventory: Vec<PlanFile>,
}

/// 请求远端清单，生成可执行的 patch 或 manifest-diff 计划并原子写入应用数据目录。
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
    PackagePlanTarget::Switch => {
      return Err("渠道转换请使用换服评估入口".to_string());
    }
  };
  if source_tag == target_branch.tag {
    return Err("本地版本已与目标版本一致".to_string());
  }
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  let parts = build_executable_plan(
    &client,
    branches,
    target_branch,
    source_tag,
    &installation.audio_languages,
  )
  .await?;

  persist_plan_parts(
    installation,
    scheme,
    target,
    source_tag,
    &target_branch.tag,
    parts,
    &app_data_dir.join("game-tasks"),
  )
}

/// 读取当前安装版本的完整目标清单，供完整性校验扫描。
pub(crate) async fn load_verify_target(
  installation: &GameInstallation,
  branches: &GameBranches,
) -> Result<(DecodedBuild, Vec<PlanFile>), String> {
  let version = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法校验资源完整性".to_string())?;
  let client = create_http_client()?;
  let target =
    get_decoded_build(&client, &branches.main.with_tag(version), &installation.audio_languages)
      .await?;
  let inventory = collect_inventory(&collect_assets(&target)?)?;
  Ok((target, inventory))
}

pub(crate) fn persist_plan_parts(
  installation: &GameInstallation,
  scheme: SchemeId,
  target: PackagePlanTarget,
  source_tag: &str,
  target_tag: &str,
  parts: PlanParts,
  task_root: &Path,
) -> Result<PackagePlanSummary, String> {
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
    target,
    source_tag: source_tag.to_string(),
    target_tag: target_tag.to_string(),
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
      .filter(|asset| matches!(asset.action, PlanAssetAction::Add | PlanAssetAction::Repair))
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
    target_tag: target_tag.to_string(),
    manifest_digest: parts.manifest_digest,
    strategy: parts.strategy,
    downloads: parts.downloads,
    assets: parts.assets,
    delete_files: parts.delete_files,
    inventory: parts.inventory,
    created_at: Utc::now().to_rfc3339(),
  };
  persist_plan(task_root, &plan_id, &plan)?;
  Ok(summary)
}

/// 重新请求当前远端清单，核对计划摘要并补回不会持久化的签名下载字段。
pub(crate) async fn hydrate_and_validate_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  mut plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(plan.source_tag.as_str())
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if is_integrity_repair_plan(&plan) {
    return hydrate_integrity_repair_plan(installation, branches, plan).await;
  }
  let target_branch = match plan.target {
    PackagePlanTarget::Main => &branches.main,
    PackagePlanTarget::PreDownload => {
      branches.pre_download.as_ref().ok_or_else(|| "预下载分支已不可用，请重新评估".to_string())?
    }
    PackagePlanTarget::Switch => {
      return Err("渠道转换任务不能作为资源下载计划恢复".to_string());
    }
  };
  if target_branch.tag != plan.target_tag {
    return Err("资源计划目标版本已变化，请重新评估".to_string());
  }
  let client = create_http_client()?;
  let fresh = match plan.strategy {
    PackagePlanStrategy::Patch => {
      let build = get_decoded_patch_build(
        &client,
        target_branch,
        &plan.source_tag,
        &installation.audio_languages,
      )
      .await?;
      build_patch_plan(build, &plan.source_tag)?
    }
    PackagePlanStrategy::ManifestDiff => {
      build_manifest_plan(
        &client,
        &branches.main.with_tag(&plan.source_tag),
        target_branch,
        &installation.audio_languages,
      )
      .await?
    }
  };
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets, plan.schema_version != PLAN_SCHEMA_VERSION)
    || fresh.delete_files != plan.delete_files
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || !(fresh.inventory == plan.inventory
      || (matches!(
        plan.schema_version,
        LEGACY_PLAN_SCHEMA_VERSION_V2 | LEGACY_PLAN_SCHEMA_VERSION_V3
      ) && plan.inventory.is_empty()))
  {
    return Err("远端资源清单已变化，请重新评估".to_string());
  }
  plan.schema_version = PLAN_SCHEMA_VERSION;
  plan.downloads = fresh.downloads;
  plan.assets = fresh.assets;
  plan.inventory = fresh.inventory;
  Ok(plan)
}

/// 重新请求已发布的 main 分支，并为 ReadyToApply 消费补齐完整目标清单。
pub(crate) async fn hydrate_and_validate_apply_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  mut plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(plan.source_tag.as_str())
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch) {
    return Err("当前只能应用包含完整目标清单的资源计划".to_string());
  }
  if is_integrity_repair_plan(&plan) {
    return hydrate_integrity_repair_plan(installation, branches, plan).await;
  }
  if branches.main.tag != plan.target_tag {
    return Err(match plan.target {
      PackagePlanTarget::PreDownload => "预下载目标尚未成为正式版本，暂时不能应用".to_string(),
      PackagePlanTarget::Main => "正式版本已变化，请重新评估".to_string(),
      PackagePlanTarget::Switch => "渠道转换任务不能作为资源更新应用".to_string(),
    });
  }
  let client = create_http_client()?;
  let fresh = match plan.strategy {
    PackagePlanStrategy::Patch => {
      let build = get_decoded_patch_build(
        &client,
        &branches.main,
        &plan.source_tag,
        &installation.audio_languages,
      )
      .await?;
      build_patch_plan(build, &plan.source_tag)?
    }
    PackagePlanStrategy::ManifestDiff => {
      build_manifest_plan(
        &client,
        &branches.main.with_tag(&plan.source_tag),
        &branches.main,
        &installation.audio_languages,
      )
      .await?
    }
  };
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets, plan.schema_version != PLAN_SCHEMA_VERSION)
    || fresh.delete_files != plan.delete_files
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || !(fresh.inventory == plan.inventory
      || (matches!(
        plan.schema_version,
        LEGACY_PLAN_SCHEMA_VERSION_V2 | LEGACY_PLAN_SCHEMA_VERSION_V3
      ) && plan.inventory.is_empty()))
  {
    return Err("正式版本资源清单与计划不一致，请重新评估".to_string());
  }
  plan.schema_version = PLAN_SCHEMA_VERSION;
  plan.downloads = fresh.downloads;
  plan.assets = fresh.assets;
  plan.inventory = fresh.inventory;
  Ok(plan)
}

/// 将已重新验证并补齐的计划覆盖持久化，供断电恢复离线读取。
pub(crate) fn persist_validated_plan(task_root: &Path, plan: &PersistedPlan) -> Result<(), String> {
  validate_persisted_plan(plan, &plan.plan_id)?;
  persist_plan(task_root, &plan.plan_id, plan)
}

/// 按缺失/损坏文件重新请求当前 main 清单，生成只含 Repair 资产的可执行计划。
pub(crate) async fn hydrate_and_validate_repair_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  plan: PersistedPlan,
  files: &[PlanFile],
) -> Result<PersistedPlan, String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(plan.source_tag.as_str())
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch) {
    return Err("当前只能修复已提交的资源计划".to_string());
  }
  let client = create_http_client()?;
  let tagged_branch;
  let target_branch = if plan.source_tag == plan.target_tag {
    tagged_branch = branches.main.with_tag(&plan.target_tag);
    &tagged_branch
  } else {
    if branches.main.tag != plan.target_tag {
      return Err("正式版本已变化，请重新评估".to_string());
    }
    &branches.main
  };
  let target = get_decoded_build(&client, target_branch, &installation.audio_languages).await?;
  overlay_repair_parts(plan, build_repair_parts(target, files)?)
}

fn overlay_repair_parts(
  mut plan: PersistedPlan,
  parts: PlanParts,
) -> Result<PersistedPlan, String> {
  if parts.inventory != plan.inventory {
    return Err("正式版本资源清单与计划不一致，请重新评估".to_string());
  }
  if plan.strategy == PackagePlanStrategy::ManifestDiff
    && parts.manifest_digest != plan.manifest_digest
  {
    return Err("正式版本资源清单与计划不一致，请重新评估".to_string());
  }
  plan.downloads = parts.downloads;
  plan.assets = parts.assets;
  plan.delete_files = Vec::new();
  plan.strategy = PackagePlanStrategy::ManifestDiff;
  validate_persisted_plan(&plan, &plan.plan_id)?;
  Ok(plan)
}

async fn hydrate_integrity_repair_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  let client = create_http_client()?;
  let target = get_decoded_build(
    &client,
    &branches.main.with_tag(&plan.target_tag),
    &installation.audio_languages,
  )
  .await?;
  let files = plan
    .assets
    .iter()
    .map(|asset| PlanFile { name: asset.name.clone(), size: asset.size, md5: asset.md5.clone() })
    .collect::<Vec<_>>();
  overlay_repair_parts(plan, build_repair_parts(target, &files)?)
}

fn is_integrity_repair_plan(plan: &PersistedPlan) -> bool {
  plan.source_tag == plan.target_tag
    && plan.target == PackagePlanTarget::Main
    && plan.strategy == PackagePlanStrategy::ManifestDiff
    && plan.delete_files.is_empty()
    && !plan.assets.is_empty()
    && plan.assets.iter().all(|asset| asset.action == PlanAssetAction::Repair)
}

fn collect_mismatched_files(
  inventory: &[PlanFile],
  game_root: &Path,
) -> Result<Vec<PlanFile>, String> {
  let mut mismatched = Vec::new();
  for file in inventory {
    match resolve_optional_manifest_file(game_root, &file.name)? {
      Some(path) if file_matches(&path, file.size, &file.md5)? => {}
      _ => mismatched.push(file.clone()),
    }
  }
  Ok(mismatched)
}

fn file_matches(path: &Path, size: u64, md5: &str) -> Result<bool, String> {
  let metadata = fs::metadata(path).map_err(|error| format!("读取资源文件状态失败：{error}"))?;
  if metadata.len() != size {
    return Ok(false);
  }
  let mut file = File::open(path).map_err(|error| format!("打开资源文件失败：{error}"))?;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; 128 * 1024];
  loop {
    let read = file.read(&mut buffer).map_err(|error| format!("读取资源文件失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  Ok(format!("{:x}", hasher.finalize()).eq_ignore_ascii_case(md5))
}

fn downloads_match(left: &[PlanDownload], right: &[PlanDownload]) -> bool {
  left.len() == right.len()
    && left.iter().zip(right).all(|(left, right)| {
      left.id == right.id
        && left.cache_key == right.cache_key
        && left.hash_kind == right.hash_kind
        && left.expected_hash.eq_ignore_ascii_case(&right.expected_hash)
        && left.compressed_size == right.compressed_size
        && left.decompressed_size == right.decompressed_size
        && (left.encoding == right.encoding || right.encoding == PayloadEncoding::LegacyUnspecified)
        && left.range_start == right.range_start
        && left.range_length == right.range_length
    })
}

fn assets_match(left: &[PlanAsset], right: &[PlanAsset], allow_missing_source: bool) -> bool {
  left.len() == right.len()
    && left.iter().zip(right).all(|(left, right)| {
      left.name == right.name
        && left.action == right.action
        && (left.source == right.source || (allow_missing_source && right.source.is_none()))
        && left.size == right.size
        && left.md5.eq_ignore_ascii_case(&right.md5)
        && left.chunks == right.chunks
        && left.patch == right.patch
    })
}

async fn build_executable_plan(
  client: &reqwest::Client,
  branches: &GameBranches,
  target_branch: &super::hoyoplay::BranchDescriptor,
  source_tag: &str,
  audio_languages: &[String],
) -> Result<PlanParts, String> {
  if target_branch.diff_tags.iter().any(|tag| tag == source_tag) {
    match get_decoded_patch_build(client, target_branch, source_tag, audio_languages)
      .await
      .and_then(|build| build_patch_plan(build, source_tag))
    {
      Ok(parts)
        if !parts.inventory.is_empty()
          && (!parts.assets.is_empty() || !parts.delete_files.is_empty()) =>
      {
        log::info!("[game-package] {source_tag} → {} 使用 patch 计划", target_branch.tag);
        return Ok(parts);
      }
      Ok(_) => {
        log::warn!(
          "[game-package] {source_tag} → {} 的 patch 计划缺少可执行变更，回退 manifest-diff",
          target_branch.tag
        );
      }
      Err(error) => {
        log::warn!(
          "[game-package] {source_tag} → {} 的 patch 计划失败，回退 manifest-diff：{error}",
          target_branch.tag
        );
      }
    }
  }
  build_manifest_plan(client, &branches.main.with_tag(source_tag), target_branch, audio_languages)
    .await
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
  let inventory = collect_inventory(&target_assets)?;
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
    let source = source_assets
      .get(&name)
      .map(|asset| {
        Ok::<PlanSource, String>(PlanSource {
          size: nonnegative_u64(asset.asset_size, "源资源大小")?,
          md5: asset.asset_hash_md5.clone(),
        })
      })
      .transpose()?;
    assets.push(plan_target_asset(
      name,
      target_asset,
      action,
      source,
      download,
      &source_chunks,
      &mut downloads,
    )?);
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
    inventory,
  })
}

fn build_patch_plan(build: DecodedPatchBuild, source_tag: &str) -> Result<PlanParts, String> {
  let manifest_digest = patch_manifest_digest(&build);
  let inventory = collect_patch_inventory(&build)?;
  let mut downloads = HashMap::<String, PlanDownload>::new();
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
      let candidate = PlanDownload {
        id: patch.id.clone(),
        cache_key: patch_container_cache_key(&patch),
        hash_kind: PlanDownloadHashKind::Md5,
        expected_hash: patch.patch_md5.clone(),
        compressed_size: patch.patch_file_size,
        decompressed_size: patch.patch_file_size,
        encoding: PayloadEncoding::Raw,
        url_prefix: manifest.diff_download.url_prefix.clone(),
        url_suffix: manifest.diff_download.url_suffix.clone(),
        range_start: None,
        range_length: None,
      };
      if let Some(existing) = downloads.get(&patch.id) {
        if existing.compressed_size != candidate.compressed_size
          || !existing.expected_hash.eq_ignore_ascii_case(&candidate.expected_hash)
          || existing.url_prefix != candidate.url_prefix
          || existing.url_suffix != candidate.url_suffix
        {
          return Err("相同 patch 容器对应了冲突的下载元数据".to_string());
        }
      } else {
        downloads.insert(patch.id.clone(), candidate);
      }
      assets.push(PlanAsset {
        name,
        action: if patch.original_size == 0 {
          PlanAssetAction::Add
        } else {
          PlanAssetAction::Modify
        },
        source: (patch.original_size > 0)
          .then(|| PlanSource { size: patch.original_size, md5: patch.original_md5.clone() }),
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
  downloads.sort_by(|left, right| left.id.cmp(&right.id));
  let mut delete_files = delete_files.into_values().collect::<Vec<_>>();
  delete_files.sort_by(|left, right| left.name.cmp(&right.name));
  Ok(PlanParts {
    strategy: PackagePlanStrategy::Patch,
    manifest_digest,
    downloads,
    assets,
    delete_files,
    inventory,
  })
}

pub(crate) fn build_repair_parts(
  target: DecodedBuild,
  files: &[PlanFile],
) -> Result<PlanParts, String> {
  if files.is_empty() {
    return Err("没有需要修复的资源文件".to_string());
  }
  let target_assets = collect_assets(&target)?;
  let inventory = collect_inventory(&target_assets)?;
  let target_downloads = collect_category_downloads(&target)?;
  let mut downloads = HashMap::<String, PlanDownload>::new();
  let mut assets = Vec::new();
  for file in files {
    let target_asset = target_assets
      .get(&file.name)
      .ok_or_else(|| format!("修复目标不在正式清单中：{}", file.name))?;
    let size = nonnegative_u64(target_asset.asset_size, "资源大小")?;
    if size != file.size || !target_asset.asset_hash_md5.eq_ignore_ascii_case(&file.md5) {
      return Err(format!("修复目标元数据与清单不一致：{}", file.name));
    }
    let download = target_downloads
      .get(&file.name)
      .ok_or_else(|| format!("目标资源缺少 chunk 下载信息：{}", file.name))?;
    assets.push(plan_target_asset(
      file.name.clone(),
      target_asset,
      PlanAssetAction::Repair,
      None,
      download,
      &HashMap::new(),
      &mut downloads,
    )?);
  }
  assets.sort_by(|left, right| left.name.cmp(&right.name));
  let mut downloads = downloads.into_values().collect::<Vec<_>>();
  downloads.sort_by(|left, right| left.id.cmp(&right.id));
  Ok(PlanParts {
    strategy: PackagePlanStrategy::ManifestDiff,
    manifest_digest: manifest_digest(&target),
    downloads,
    assets,
    delete_files: Vec::new(),
    inventory,
  })
}

fn plan_target_asset(
  name: String,
  target_asset: &Asset,
  action: PlanAssetAction,
  source: Option<PlanSource>,
  download: &DownloadInfo,
  source_chunks: &HashMap<(String, u64), PlanReuse>,
  downloads: &mut HashMap<String, PlanDownload>,
) -> Result<PlanAsset, String> {
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
        cache_key: chunk.chunk_name.clone(),
        hash_kind: PlanDownloadHashKind::XxHash64,
        expected_hash: format!("{:016x}", chunk_xxhash64(&chunk.chunk_name).unwrap_or_default()),
        compressed_size,
        decompressed_size,
        encoding: payload_encoding(download.compression)?,
        url_prefix: download.url_prefix.clone(),
        url_suffix: download.url_suffix.clone(),
        range_start: None,
        range_length: None,
      };
      if let Some(existing) = downloads.get(&candidate.id) {
        if existing.compressed_size != candidate.compressed_size
          || existing.decompressed_size != candidate.decompressed_size
          || existing.encoding != candidate.encoding
        {
          return Err("相同 chunk hash 对应了冲突的大小或编码".to_string());
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
  Ok(PlanAsset {
    name,
    action,
    source,
    size: nonnegative_u64(target_asset.asset_size, "资源大小")?,
    md5: target_asset.asset_hash_md5.clone(),
    chunks,
    patch: None,
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
  validate_managed_paths(assets.keys().map(String::as_str))?;
  Ok(assets)
}

fn collect_inventory(assets: &HashMap<String, &Asset>) -> Result<Vec<PlanFile>, String> {
  let mut inventory = assets
    .iter()
    .map(|(name, asset)| {
      Ok(PlanFile {
        name: name.clone(),
        size: nonnegative_u64(asset.asset_size, "目标资源大小")?,
        md5: asset.asset_hash_md5.clone(),
      })
    })
    .collect::<Result<Vec<_>, String>>()?;
  inventory.sort_by(|left, right| left.name.cmp(&right.name));
  validate_inventory(&inventory)?;
  Ok(inventory)
}

fn collect_patch_inventory(build: &DecodedPatchBuild) -> Result<Vec<PlanFile>, String> {
  let mut files = HashMap::<String, PlanFile>::new();
  for manifest in &build.manifests {
    for file in &manifest.data.file_datas {
      let name = normalize_manifest_path(&file.file_name)?;
      let candidate = PlanFile {
        name: name.clone(),
        size: nonnegative_u64(file.file_size, "patch 目标资源大小")?,
        md5: file.file_hash.clone(),
      };
      if let Some(existing) = files.get(&name)
        && (existing.size != candidate.size || !existing.md5.eq_ignore_ascii_case(&candidate.md5))
      {
        return Err(format!("patch 目标清单元数据冲突：{name}"));
      }
      files.insert(name, candidate);
    }
  }
  let mut inventory = files.into_values().collect::<Vec<_>>();
  inventory.sort_by(|left, right| left.name.cmp(&right.name));
  validate_inventory(&inventory)?;
  Ok(inventory)
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

fn patch_container_cache_key(patch: &PlanPatch) -> String {
  let mut hasher = Sha256::new();
  hasher.update(patch.id.as_bytes());
  hasher.update([0]);
  hasher.update(patch.patch_file_size.to_le_bytes());
  hasher.update([0]);
  hasher.update(patch.patch_md5.as_bytes());
  format!("{:x}.patch", hasher.finalize())
}

pub(crate) fn manifest_digest(build: &DecodedBuild) -> String {
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
    .filter(|download| cached_chunk_matches(cache_root, download))
    .map(|download| download.compressed_size)
    .sum()
}

pub(crate) fn cached_chunk_matches(cache_root: &Path, download: &PlanDownload) -> bool {
  if download.hash_kind == PlanDownloadHashKind::UnsupportedPatchRange {
    return false;
  }
  let path = cache_root.join(&download.cache_key);
  let Ok(metadata) = fs::symlink_metadata(&path) else {
    return false;
  };
  if metadata.file_type().is_symlink()
    || !metadata.is_file()
    || metadata.len() != download.compressed_size
  {
    return false;
  }
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
    if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
      return false;
    }
  }
  let Ok(file) = File::open(path) else {
    return false;
  };
  let mut reader = BufReader::new(file);
  let mut xxhasher = Xxh64::new(0);
  let mut md5hasher = Md5::new();
  let mut buffer = [0_u8; 128 * 1024];
  loop {
    let Ok(read) = reader.read(&mut buffer) else {
      return false;
    };
    if read == 0 {
      break;
    }
    match download.hash_kind {
      PlanDownloadHashKind::XxHash64 => xxhasher.update(&buffer[..read]),
      PlanDownloadHashKind::Md5 => md5hasher.update(&buffer[..read]),
      PlanDownloadHashKind::UnsupportedPatchRange => unreachable!(),
    }
  }
  match download.hash_kind {
    PlanDownloadHashKind::XxHash64 => {
      format!("{:016x}", xxhasher.digest()).eq_ignore_ascii_case(&download.expected_hash)
    }
    PlanDownloadHashKind::Md5 => {
      format!("{:x}", md5hasher.finalize()).eq_ignore_ascii_case(&download.expected_hash)
    }
    PlanDownloadHashKind::UnsupportedPatchRange => unreachable!(),
  }
}

/// 从应用数据目录读取并严格校验一个已持久化计划。
pub(crate) fn load_persisted_plan(
  task_root: &Path,
  plan_id: &str,
) -> Result<PersistedPlan, String> {
  if Uuid::parse_str(plan_id).is_err() {
    return Err("游戏资源计划 ID 无效".to_string());
  }
  let path = task_root.join("tasks").join(plan_id).join("plan.json");
  let metadata = fs::metadata(&path).map_err(|error| format!("读取游戏资源计划失败：{error}"))?;
  if metadata.len() == 0 || metadata.len() > MAX_PLAN_BYTES as u64 {
    return Err("游戏资源计划大小无效".to_string());
  }
  let bytes = fs::read(path).map_err(|error| format!("读取游戏资源计划失败：{error}"))?;
  let plan: PersistedPlan =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析游戏资源计划失败：{error}"))?;
  validate_persisted_plan(&plan, plan_id)?;
  Ok(plan)
}

fn validate_persisted_plan(plan: &PersistedPlan, plan_id: &str) -> Result<(), String> {
  if !matches!(
    plan.schema_version,
    PLAN_SCHEMA_VERSION | LEGACY_PLAN_SCHEMA_VERSION_V3 | LEGACY_PLAN_SCHEMA_VERSION_V2
  ) || plan.plan_id != plan_id
  {
    return Err("游戏资源计划版本或身份不匹配".to_string());
  }
  if plan.installation_id.is_empty()
    || plan.source_tag.is_empty()
    || plan.source_tag.len() > 128
    || plan.source_tag.chars().any(char::is_control)
    || plan.target_tag.is_empty()
    || plan.target_tag.len() > 128
    || plan.target_tag.chars().any(char::is_control)
    || plan.manifest_digest.len() != 64
    || !plan.manifest_digest.bytes().all(|byte| byte.is_ascii_hexdigit())
    || plan.downloads.len() > 5_000_000
  {
    return Err("游戏资源计划字段无效".to_string());
  }
  let mut cache_keys = std::collections::HashSet::with_capacity(plan.downloads.len());
  for download in &plan.downloads {
    let encoding_valid = match plan.schema_version {
      PLAN_SCHEMA_VERSION | LEGACY_PLAN_SCHEMA_VERSION_V3 => {
        download.encoding != PayloadEncoding::LegacyUnspecified
      }
      LEGACY_PLAN_SCHEMA_VERSION_V2 => download.encoding == PayloadEncoding::LegacyUnspecified,
      _ => false,
    };
    let hash_valid = match download.hash_kind {
      PlanDownloadHashKind::XxHash64 => chunk_xxhash64(&download.id).is_some_and(|expected| {
        format!("{expected:016x}").eq_ignore_ascii_case(&download.expected_hash)
      }),
      PlanDownloadHashKind::Md5 => is_md5(&download.expected_hash),
      PlanDownloadHashKind::UnsupportedPatchRange => download.expected_hash.is_empty(),
    };
    let range_valid = match (download.range_start, download.range_length) {
      (None, None) => {
        matches!(download.hash_kind, PlanDownloadHashKind::XxHash64 | PlanDownloadHashKind::Md5)
      }
      (Some(_), Some(length)) => {
        download.hash_kind == PlanDownloadHashKind::UnsupportedPatchRange
          && length == download.compressed_size
          && length > 0
      }
      _ => false,
    };
    if download.id.is_empty()
      || download.cache_key.is_empty()
      || download.cache_key.len() > 256
      || !download
        .cache_key
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
      || download.compressed_size == 0
      || download.decompressed_size == 0
      || !encoding_valid
      || (download.encoding == PayloadEncoding::Raw
        && download.compressed_size != download.decompressed_size)
      || !hash_valid
      || !range_valid
      || !cache_keys.insert(download.cache_key.as_str())
    {
      return Err("游戏资源计划下载条目无效".to_string());
    }
  }
  validate_plan_assets(plan)?;
  Ok(())
}

fn validate_plan_assets(plan: &PersistedPlan) -> Result<(), String> {
  if plan.assets.len() > 500_000
    || plan.delete_files.len() > 500_000
    || plan.inventory.len() > 500_000
    || (plan.schema_version == PLAN_SCHEMA_VERSION
      && matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
      && plan.inventory.is_empty())
  {
    return Err("游戏资源计划文件条目数超过安全上限".to_string());
  }
  let downloads =
    plan.downloads.iter().map(|item| (item.id.as_str(), item)).collect::<HashMap<_, _>>();
  let mut asset_names = std::collections::HashSet::with_capacity(plan.assets.len());
  let mut chunk_count = 0_usize;
  for asset in &plan.assets {
    let source_valid = match (asset.action, &asset.source) {
      (PlanAssetAction::Add, None) | (PlanAssetAction::Repair, None) => true,
      (PlanAssetAction::Modify, Some(source)) => is_md5(&source.md5),
      (PlanAssetAction::Modify, None) => plan.schema_version != PLAN_SCHEMA_VERSION,
      (PlanAssetAction::Add, Some(_)) | (PlanAssetAction::Repair, Some(_)) => false,
    };
    if !asset_names.insert(asset.name.as_str())
      || !is_md5(&asset.md5)
      || !source_valid
      || (plan.strategy == PackagePlanStrategy::ManifestDiff && asset.patch.is_some())
      || (plan.strategy == PackagePlanStrategy::Patch && asset.patch.is_none())
    {
      return Err("游戏资源计划包含无效资源条目".to_string());
    }
    chunk_count = chunk_count.saturating_add(asset.chunks.len());
    if chunk_count > 5_000_000 {
      return Err("游戏资源计划 chunk 数量超过安全上限".to_string());
    }
    let mut ranges = Vec::with_capacity(asset.chunks.len());
    for chunk in &asset.chunks {
      let end = chunk
        .target_offset
        .checked_add(chunk.decompressed_size)
        .ok_or_else(|| "游戏资源计划 chunk 范围溢出".to_string())?;
      if chunk.id.is_empty()
        || !is_md5(&chunk.decompressed_md5)
        || chunk.compressed_size == 0
        || chunk.decompressed_size == 0
        || end > asset.size
      {
        return Err("游戏资源计划包含无效 chunk 条目".to_string());
      }
      if let Some(reuse) = &chunk.reuse {
        if normalize_manifest_path(&reuse.asset_name)? != reuse.asset_name {
          return Err("reuse chunk path is not normalized".to_string());
        }
        reuse
          .source_offset
          .checked_add(chunk.decompressed_size)
          .ok_or_else(|| "游戏资源计划复用 chunk 范围溢出".to_string())?;
      } else {
        let download = downloads
          .get(chunk.id.as_str())
          .ok_or_else(|| "游戏资源计划 chunk 缺少下载对象".to_string())?;
        if download.compressed_size != chunk.compressed_size
          || download.decompressed_size != chunk.decompressed_size
        {
          return Err("游戏资源计划 chunk 与下载对象大小不一致".to_string());
        }
      }
      ranges.push((chunk.target_offset, end));
    }
    ranges.sort_unstable();
    if ranges.windows(2).any(|pair| pair[0].1 > pair[1].0) {
      return Err("游戏资源计划包含重叠 chunk".to_string());
    }
    if let Some(patch) = &asset.patch {
      let download = downloads
        .get(patch.id.as_str())
        .ok_or_else(|| "游戏资源计划 patch 缺少下载对象".to_string())?;
      if download.hash_kind != PlanDownloadHashKind::Md5
        || download.compressed_size != patch.patch_file_size
        || download.decompressed_size != patch.patch_file_size
        || !download.expected_hash.eq_ignore_ascii_case(&patch.patch_md5)
        || download.range_start.is_some()
        || download.range_length.is_some()
      {
        return Err("游戏资源计划 patch 与下载对象不一致".to_string());
      }
    }
  }
  let mut delete_names = std::collections::HashSet::with_capacity(plan.delete_files.len());
  for deleted in &plan.delete_files {
    if !delete_names.insert(deleted.name.as_str())
      || asset_names.contains(deleted.name.as_str())
      || !is_md5(&deleted.md5)
    {
      return Err("游戏资源计划包含无效删除条目".to_string());
    }
  }
  validate_managed_paths(
    plan
      .assets
      .iter()
      .map(|asset| asset.name.as_str())
      .chain(plan.delete_files.iter().map(|deleted| deleted.name.as_str())),
  )?;
  validate_inventory(&plan.inventory)?;
  let inventory =
    plan.inventory.iter().map(|file| (file.name.as_str(), file)).collect::<HashMap<_, _>>();
  if plan.schema_version == PLAN_SCHEMA_VERSION
    && matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch)
    && plan.assets.iter().any(|asset| {
      inventory
        .get(asset.name.as_str())
        .is_none_or(|file| file.size != asset.size || !file.md5.eq_ignore_ascii_case(&asset.md5))
    })
  {
    return Err("plan inventory does not match changed assets".to_string());
  }
  Ok(())
}

fn validate_inventory(inventory: &[PlanFile]) -> Result<(), String> {
  if inventory.iter().any(|file| !is_md5(&file.md5))
    || inventory.windows(2).any(|files| files[0].name >= files[1].name)
  {
    return Err("plan contains an invalid target file inventory".to_string());
  }
  validate_managed_paths(inventory.iter().map(|file| file.name.as_str()))
}

fn validate_managed_paths<'a>(paths: impl IntoIterator<Item = &'a str>) -> Result<(), String> {
  let mut normalized_paths = Vec::new();
  for path in paths {
    if normalize_manifest_path(path)? != path {
      return Err("plan contains an unnormalized managed path".to_string());
    }
    let case_folded = path.to_lowercase();
    if case_folded == "config.ini"
      || case_folded == ".teyvatguide-update"
      || case_folded.starts_with(".teyvatguide-update/")
    {
      return Err("plan contains a reserved managed path".to_string());
    }
    normalized_paths.push(case_folded);
  }
  normalized_paths.sort_unstable();
  for paths in normalized_paths.windows(2) {
    if paths[0] == paths[1] || paths[1].starts_with(&format!("{}/", paths[0])) {
      return Err("plan contains conflicting managed paths".to_string());
    }
  }
  Ok(())
}

fn is_md5(value: &str) -> bool {
  value.len() == 32 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
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
  match fs::remove_file(&temporary) {
    Ok(()) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("清理旧游戏资源计划临时文件失败：{error}")),
  }
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
  atomic_replace_plan(&temporary, &target)?;
  sync_directory(&directory)?;
  Ok(())
}

#[cfg(target_os = "windows")]
fn atomic_replace_plan(source: &Path, target: &Path) -> Result<(), String> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
  };
  let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let result = unsafe {
    MoveFileExW(
      source.as_ptr(),
      target.as_ptr(),
      MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
    )
  };
  if result == 0 {
    return Err(format!("提交游戏资源计划失败：{}", std::io::Error::last_os_error()));
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace_plan(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("提交游戏资源计划失败：{error}"))
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

fn payload_encoding(compression: u32) -> Result<PayloadEncoding, String> {
  match compression {
    0 => Ok(PayloadEncoding::Raw),
    1 => Ok(PayloadEncoding::Zstd),
    _ => Err(format!("Sophon 资源载荷使用了不支持的压缩方式：{compression}")),
  }
}

#[cfg(test)]
mod tests {
  use super::{
    PLAN_SCHEMA_VERSION, PayloadEncoding, PersistedPlan, PlanAsset, PlanAssetAction,
    PlanDownloadHashKind, PlanFile, PlanParts, assets_equal, build_manifest_diff, build_patch_plan,
    cached_chunk_matches, collect_mismatched_files, digest_parts, is_integrity_repair_plan,
    load_persisted_plan, overlay_repair_parts, validate_persisted_plan,
  };
  use crate::game::{
    hoyoplay::{create_http_client, get_game_branches},
    model::{PackagePlanStrategy, PackagePlanTarget, SchemeId},
    sophon::{
      Asset, AssetChunk, DecodedBuild, DecodedManifest, DecodedPatchBuild, DecodedPatchManifest,
      DownloadInfo, ManifestProto, PatchFile, PatchInfo, PatchManifestProto, PatchesEntry,
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

  fn persisted_manifest_plan(plan_id: String, inventory: Vec<PlanFile>) -> PersistedPlan {
    PersistedPlan {
      schema_version: PLAN_SCHEMA_VERSION,
      plan_id,
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Main,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      strategy: PackagePlanStrategy::ManifestDiff,
      downloads: Vec::new(),
      assets: Vec::new(),
      delete_files: Vec::new(),
      inventory,
      created_at: "2026-08-19T00:00:00Z".to_string(),
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
  fn persisted_download_omits_signed_url_fields() {
    let download = super::PlanDownload {
      id: "0123456789abcdef".to_string(),
      cache_key: "0123456789abcdef".to_string(),
      hash_kind: super::PlanDownloadHashKind::XxHash64,
      expected_hash: "0123456789abcdef".to_string(),
      compressed_size: 8,
      decompressed_size: 10,
      encoding: super::PayloadEncoding::Zstd,
      url_prefix: "https://example.yuanshen.com/chunks".to_string(),
      url_suffix: "signature=secret".to_string(),
      range_start: None,
      range_length: None,
    };
    let value = serde_json::to_value(download).unwrap();
    assert!(value.get("urlPrefix").is_none());
    assert!(value.get("urlSuffix").is_none());
    assert!(!value.to_string().contains("secret"));
  }

  #[test]
  fn reads_v2_plan_with_unspecified_payload_encoding() {
    let plan_id = uuid::Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-plan-v2-{plan_id}"));
    let directory = root.join("tasks").join(&plan_id);
    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(
      directory.join("plan.json"),
      serde_json::json!({
        "schemaVersion": 2,
        "planId": plan_id,
        "installationId": "installation",
        "sourceScheme": "cn_official",
        "targetScheme": "cn_official",
        "target": "pre_download",
        "sourceTag": "1.0.0",
        "targetTag": "2.0.0",
        "manifestDigest": "a".repeat(64),
        "strategy": "manifest_diff",
        "downloads": [{
          "id": "0123456789abcdef",
          "cacheKey": "0123456789abcdef",
          "hashKind": "xx_hash64",
          "expectedHash": "0123456789abcdef",
          "compressedSize": 8,
          "decompressedSize": 10,
          "rangeStart": null,
          "rangeLength": null
        }],
        "assets": [],
        "deleteFiles": [],
        "createdAt": "2026-08-19T00:00:00Z"
      })
      .to_string(),
    )
    .unwrap();
    let plan = load_persisted_plan(&root, &plan_id).unwrap();
    assert_eq!(plan.schema_version, 2);
    assert_eq!(plan.downloads[0].encoding, PayloadEncoding::LegacyUnspecified);
    std::fs::remove_dir_all(root).unwrap();
  }

  #[test]
  fn reads_v3_plan_without_inventory() {
    let plan_id = uuid::Uuid::new_v4().to_string();
    let root = std::env::temp_dir().join(format!("teyvat-guide-plan-v3-{plan_id}"));
    let directory = root.join("tasks").join(&plan_id);
    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(
      directory.join("plan.json"),
      serde_json::json!({
        "schemaVersion": 3,
        "planId": plan_id,
        "installationId": "installation",
        "sourceScheme": "cn_official",
        "targetScheme": "cn_official",
        "target": "pre_download",
        "sourceTag": "1.0.0",
        "targetTag": "2.0.0",
        "manifestDigest": "a".repeat(64),
        "strategy": "manifest_diff",
        "downloads": [
          {
            "id": "0123456789abcdef",
            "cacheKey": "0123456789abcdef",
            "hashKind": "xx_hash64",
            "expectedHash": "0123456789abcdef",
            "compressedSize": 8,
            "decompressedSize": 10,
            "encoding": "zstd",
            "rangeStart": null,
            "rangeLength": null
          }
        ],
        "assets": [],
        "deleteFiles": [],
        "createdAt": "2026-08-19T00:00:00Z"
      })
      .to_string(),
    )
    .unwrap();
    let plan = load_persisted_plan(&root, &plan_id).unwrap();
    assert_eq!(plan.schema_version, 3);
    assert!(plan.inventory.is_empty());
    assert_eq!(plan.downloads[0].encoding, PayloadEncoding::Zstd);
    std::fs::remove_dir_all(root).unwrap();
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
    assert_eq!(plan.downloads[0].encoding, PayloadEncoding::Zstd);
    assert_eq!(plan.assets.len(), 2);
    assert_eq!(plan.delete_files.len(), 1);
    assert_eq!(
      plan.inventory.iter().map(|file| file.name.as_str()).collect::<Vec<_>>(),
      vec!["modify.bin", "reuse.bin", "same.bin"],
    );
    assert_eq!(plan.assets.iter().filter(|asset| asset.chunks[0].reuse.is_some()).count(), 1);
  }

  #[test]
  fn manifest_diff_rejects_conflicting_or_reserved_target_paths() {
    let hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    let cases = [
      vec![
        asset("file.bin", hash, "1111111111111111", hash),
        asset("FILE.bin", hash, "2222222222222222", hash),
      ],
      vec![
        asset("file", hash, "1111111111111111", hash),
        asset("file/chunk.bin", hash, "2222222222222222", hash),
      ],
      vec![asset(".teyvatguide-update/state", hash, "1111111111111111", hash)],
      vec![asset("config.ini", hash, "1111111111111111", hash)],
    ];
    for target_assets in cases {
      assert!(
        build_manifest_diff(build("1.0.0", Vec::new()), build("2.0.0", target_assets)).is_err()
      );
    }
  }

  #[test]
  fn persisted_inventory_rejects_tampering() {
    let hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    let cases = [
      vec![
        PlanFile { name: "FILE.bin".to_string(), size: 1, md5: hash.to_string() },
        PlanFile { name: "file.bin".to_string(), size: 1, md5: hash.to_string() },
      ],
      vec![
        PlanFile { name: "file".to_string(), size: 1, md5: hash.to_string() },
        PlanFile { name: "file/chunk.bin".to_string(), size: 1, md5: hash.to_string() },
      ],
      vec![PlanFile {
        name: ".teyvatguide-update/state".to_string(),
        size: 1,
        md5: hash.to_string(),
      }],
      vec![PlanFile { name: "config.ini".to_string(), size: 1, md5: hash.to_string() }],
    ];
    for inventory in cases {
      let plan_id = uuid::Uuid::new_v4().to_string();
      assert!(
        validate_persisted_plan(&persisted_manifest_plan(plan_id.clone(), inventory), &plan_id)
          .is_err()
      );
    }
    let plan_id = uuid::Uuid::new_v4().to_string();
    assert!(
      validate_persisted_plan(&persisted_manifest_plan(plan_id.clone(), Vec::new()), &plan_id)
        .is_err()
    );
    let plan_id = uuid::Uuid::new_v4().to_string();
    assert!(
      validate_persisted_plan(
        &persisted_manifest_plan(
          plan_id.clone(),
          vec![PlanFile { name: "file.bin".to_string(), size: 1, md5: "invalid".to_string() }],
        ),
        &plan_id,
      )
      .is_err()
    );
  }

  fn patch_hash(byte: u8) -> String {
    format!("{byte:x}").repeat(32)
  }

  fn patch_info(
    id: &str,
    size: i64,
    hash: &str,
    start: i64,
    length: i64,
    original_size: i64,
    original_hash: &str,
  ) -> PatchInfo {
    PatchInfo {
      id: id.to_string(),
      tag: "2.0.0".to_string(),
      build_id: "build".to_string(),
      patch_file_size: size,
      patches_file_hash: hash.to_string(),
      patch_start_offset: start,
      patch_length: length,
      original_file_name: if original_size == 0 { String::new() } else { "modify.bin".to_string() },
      original_file_size: original_size,
      original_file_hash: original_hash.to_string(),
    }
  }

  fn patch_file(name: &str, size: i64, hash: &str, info: PatchInfo) -> PatchFile {
    PatchFile {
      file_name: name.to_string(),
      file_size: size,
      file_hash: hash.to_string(),
      patches_entries: vec![PatchesEntry { key: "1.0.0".to_string(), patch_info: Some(info) }],
    }
  }

  fn patch_build(files: Vec<PatchFile>) -> DecodedPatchBuild {
    DecodedPatchBuild {
      tag: "2.0.0".to_string(),
      manifests: vec![DecodedPatchManifest {
        matching_field: "game".to_string(),
        manifest_id: "manifest-patch".to_string(),
        manifest_checksum: "0123456789abcdef0123456789abcdef".to_string(),
        diff_download: download_info(),
        data: PatchManifestProto { file_datas: files, delete_files_entries: Vec::new() },
      }],
    }
  }

  #[test]
  fn patch_plan_deduplicates_shared_containers_and_uses_md5() {
    let hash = patch_hash(0xa);
    let original = patch_hash(0xb);
    let added = patch_hash(0xc);
    let parts = build_patch_plan(
      patch_build(vec![
        patch_file(
          "modify.bin",
          8,
          &original,
          patch_info("game.patch", 64, &hash, 0, 16, 4, &patch_hash(0xd)),
        ),
        patch_file("new.bin", 4, &added, patch_info("game.patch", 64, &hash, 16, 8, 0, "")),
        PatchFile {
          file_name: "keep.bin".to_string(),
          file_size: 2,
          file_hash: patch_hash(0xe),
          patches_entries: Vec::new(),
        },
      ]),
      "1.0.0",
    )
    .unwrap();
    assert_eq!(parts.strategy, PackagePlanStrategy::Patch);
    assert_eq!(parts.downloads.len(), 1);
    assert_eq!(parts.assets.len(), 2);
    assert_eq!(parts.inventory.len(), 3);
    assert_eq!(parts.inventory[0].name, "keep.bin");
    assert_eq!(parts.inventory[1].name, "modify.bin");
    assert_eq!(parts.inventory[2].name, "new.bin");
    let download = &parts.downloads[0];
    assert_eq!(download.id, "game.patch");
    assert_eq!(download.hash_kind, PlanDownloadHashKind::Md5);
    assert_eq!(download.expected_hash, hash);
    assert_eq!(download.compressed_size, 64);
    assert!(download.range_start.is_none());
    assert!(download.range_length.is_none());
    assert!(download.cache_key.ends_with(".patch"));
    let plan_id = uuid::Uuid::new_v4().to_string();
    let plan = PersistedPlan {
      schema_version: PLAN_SCHEMA_VERSION,
      plan_id: plan_id.clone(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Main,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: parts.manifest_digest.clone(),
      strategy: parts.strategy,
      downloads: parts.downloads.clone(),
      assets: parts.assets,
      delete_files: parts.delete_files,
      inventory: parts.inventory.clone(),
      created_at: "2026-08-19T00:00:00Z".to_string(),
    };
    assert!(validate_persisted_plan(&plan, &plan_id).is_ok());
  }

  #[test]
  fn overlay_repair_accepts_patch_plan_when_inventory_matches() {
    let hash = patch_hash(0xa);
    let parts = build_patch_plan(
      patch_build(vec![patch_file(
        "new.bin",
        4,
        &patch_hash(0xc),
        patch_info("game.patch", 64, &hash, 16, 8, 0, ""),
      )]),
      "1.0.0",
    )
    .unwrap();
    let plan_id = uuid::Uuid::new_v4().to_string();
    let plan = PersistedPlan {
      schema_version: PLAN_SCHEMA_VERSION,
      plan_id: plan_id.clone(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Main,
      source_tag: "1.0.0".to_string(),
      target_tag: "2.0.0".to_string(),
      manifest_digest: parts.manifest_digest.clone(),
      strategy: parts.strategy,
      downloads: parts.downloads,
      assets: parts.assets,
      delete_files: parts.delete_files,
      inventory: parts.inventory.clone(),
      created_at: "2026-08-19T00:00:00Z".to_string(),
    };
    let overlay = overlay_repair_parts(
      plan,
      PlanParts {
        strategy: PackagePlanStrategy::ManifestDiff,
        manifest_digest: "f".repeat(64),
        downloads: Vec::new(),
        assets: Vec::new(),
        delete_files: Vec::new(),
        inventory: parts.inventory,
      },
    )
    .unwrap();
    assert_eq!(overlay.strategy, PackagePlanStrategy::ManifestDiff);
    assert!(overlay.assets.is_empty());
  }

  #[test]
  fn patch_plan_rejects_conflicting_container_metadata() {
    let result = build_patch_plan(
      patch_build(vec![
        patch_file(
          "a.bin",
          4,
          &patch_hash(0xa),
          patch_info("game.patch", 64, &patch_hash(0xb), 0, 8, 0, ""),
        ),
        patch_file(
          "b.bin",
          4,
          &patch_hash(0xc),
          patch_info("game.patch", 32, &patch_hash(0xd), 0, 8, 0, ""),
        ),
      ]),
      "1.0.0",
    );
    assert!(result.is_err());
  }

  #[test]
  fn cached_patch_container_matches_md5() {
    let bytes = b"patch-container";
    let digest = {
      use md5::Digest;
      let mut hasher = md5::Md5::new();
      hasher.update(bytes);
      format!("{:x}", hasher.finalize())
    };
    let cache =
      std::env::temp_dir().join(format!("teyvat-guide-patch-cache-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&cache).unwrap();
    let cache_key = format!("{digest}.patch");
    std::fs::write(cache.join(&cache_key), bytes).unwrap();
    let download = super::PlanDownload {
      id: "game.patch".to_string(),
      cache_key,
      hash_kind: PlanDownloadHashKind::Md5,
      expected_hash: digest,
      compressed_size: bytes.len() as u64,
      decompressed_size: bytes.len() as u64,
      encoding: PayloadEncoding::Raw,
      url_prefix: "https://example.com/patch".to_string(),
      url_suffix: String::new(),
      range_start: None,
      range_length: None,
    };
    assert!(cached_chunk_matches(&cache, &download));
    let _ = std::fs::remove_dir_all(&cache);
  }

  #[test]
  fn collect_mismatched_files_reports_missing_and_corrupt() {
    let root = std::env::temp_dir().join(format!("teyvat-guide-verify-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&root).unwrap();
    std::fs::write(root.join("keep.bin"), b"keep").unwrap();
    std::fs::write(root.join("bad.bin"), b"xxxx").unwrap();
    let keep_md5 = {
      use md5::Digest;
      format!("{:x}", md5::Md5::digest(b"keep"))
    };
    let inventory = vec![
      PlanFile { name: "keep.bin".to_string(), size: 4, md5: keep_md5.clone() },
      PlanFile { name: "bad.bin".to_string(), size: 4, md5: keep_md5.clone() },
      PlanFile { name: "missing.bin".to_string(), size: 4, md5: keep_md5 },
    ];
    let mismatched = collect_mismatched_files(&inventory, &root).unwrap();
    assert_eq!(mismatched.len(), 2);
    assert_eq!(mismatched[0].name, "bad.bin");
    assert_eq!(mismatched[1].name, "missing.bin");
    let _ = std::fs::remove_dir_all(&root);
  }

  #[test]
  fn integrity_repair_plan_requires_same_version_repair_assets() {
    let md5 = "0123456789abcdef0123456789abcdef".to_string();
    let mut plan = persisted_manifest_plan(
      uuid::Uuid::new_v4().to_string(),
      vec![PlanFile { name: "keep.bin".to_string(), size: 4, md5: md5.clone() }],
    );
    plan.source_tag = "1.0.0".to_string();
    plan.target_tag = "1.0.0".to_string();
    plan.assets = vec![PlanAsset {
      name: "keep.bin".to_string(),
      action: PlanAssetAction::Repair,
      source: None,
      size: 4,
      md5,
      chunks: Vec::new(),
      patch: None,
    }];
    assert!(is_integrity_repair_plan(&plan));
    plan.target_tag = "2.0.0".to_string();
    assert!(!is_integrity_repair_plan(&plan));
  }

  #[test]
  fn overlay_repair_keeps_integrity_inventory_and_replaces_assets() {
    let md5 = "0123456789abcdef0123456789abcdef".to_string();
    let inventory = vec![PlanFile { name: "keep.bin".to_string(), size: 4, md5: md5.clone() }];
    let mut plan = persisted_manifest_plan(uuid::Uuid::new_v4().to_string(), inventory.clone());
    plan.source_tag = "1.0.0".to_string();
    plan.target_tag = "1.0.0".to_string();
    plan.assets = vec![PlanAsset {
      name: "keep.bin".to_string(),
      action: PlanAssetAction::Repair,
      source: None,
      size: 4,
      md5: md5.clone(),
      chunks: Vec::new(),
      patch: None,
    }];
    let overlay = overlay_repair_parts(
      plan,
      PlanParts {
        strategy: PackagePlanStrategy::ManifestDiff,
        manifest_digest: "a".repeat(64),
        downloads: Vec::new(),
        assets: vec![PlanAsset {
          name: "keep.bin".to_string(),
          action: PlanAssetAction::Repair,
          source: None,
          size: 4,
          md5,
          chunks: Vec::new(),
          patch: None,
        }],
        delete_files: Vec::new(),
        inventory,
      },
    )
    .unwrap();
    assert!(is_integrity_repair_plan(&overlay));
    assert_eq!(overlay.assets.len(), 1);
    assert!(matches!(overlay.assets[0].action, PlanAssetAction::Repair));
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
      assert!(plan.downloads.iter().all(|download| {
        download.hash_kind == PlanDownloadHashKind::Md5
          && download.range_start.is_none()
          && download.expected_hash.len() == 32
      }));
    });
  }
}
