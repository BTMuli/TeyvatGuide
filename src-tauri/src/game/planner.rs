//! 游戏资源差异、空间估算与不可变计划持久化。
//! @since Beta v0.11.5

use super::hoyoplay::get_channel_sdk;
use super::{
  hoyoplay::{GameBranches, create_http_client},
  installation::normalize_audio_languages,
  model::{
    GameInstallation, PackagePlanProgress, PackagePlanStrategy, PackagePlanSummary,
    PackagePlanTarget, SchemeId,
  },
  path_guard::normalize_manifest_path,
  plan_lifecycle,
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
  collections::{HashMap, HashSet},
  fs::{self, File, OpenOptions},
  io::{BufReader, BufWriter, Read, Write},
  path::{Path, PathBuf},
  sync::{LazyLock, Mutex},
  time::UNIX_EPOCH,
};
use tauri::ipc::Channel;
use uuid::Uuid;
use xxhash_rust::xxh64::Xxh64;

const PLAN_SCHEMA_VERSION: u32 = 6;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
const MIN_INSTALL_SPOOL_WINDOW_BYTES: u64 = 256 * 1024 * 1024;
const MIN_INSTALL_CONCURRENCY: usize = 4;
const MAX_INSTALL_CONCURRENCY: usize = 64;
const MAX_PLAN_BYTES: usize = 256 * 1024 * 1024;
const CACHE_VALIDATION_INDEX_FILE: &str = "cache-validation.json";
const MAX_CACHE_VALIDATION_INDEX_BYTES: u64 = 64 * 1024 * 1024;
const PLAN_PROGRESS_TOTAL: u8 = 4;
const MAX_CACHE_SCAN_WORKERS: usize = 8;
const CACHE_SCAN_PROGRESS_BATCH_SIZE: usize = 128;

pub(crate) fn report_plan_progress(
  channel: &Channel<PackagePlanProgress>,
  step: u8,
  message: &str,
) {
  let _ = channel.send(PackagePlanProgress {
    step,
    total: PLAN_PROGRESS_TOTAL,
    message: message.to_string(),
  });
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheValidationRecord {
  size: u64,
  modified_at: u64,
  hash_kind: PlanDownloadHashKind,
  expected_hash: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheValidationIndex {
  #[serde(default)]
  entries: HashMap<String, CacheValidationRecord>,
}

struct CacheValidationState {
  index: CacheValidationIndex,
  dirty: bool,
}

#[derive(Debug, Eq, PartialEq)]
struct SpaceBudget {
  required_free_bytes: u64,
  available_free_bytes: u64,
  cache_required_free_bytes: u64,
  install_required_free_bytes: u64,
  has_sufficient_space: bool,
}

/// 默认全新安装并发数；空间评估与任务执行必须共用同一取值。
pub(crate) fn default_install_concurrency() -> usize {
  std::thread::available_parallelism()
    .map(|parallelism| parallelism.get())
    .unwrap_or(MIN_INSTALL_CONCURRENCY)
    .max(MIN_INSTALL_CONCURRENCY)
    .min(MAX_INSTALL_CONCURRENCY)
}

/// 估算流式安装的峰值私有 spool 窗口。
///
/// 队列最多同时持有两倍并发数的资源工作集，因此取最大的这些工作集，加上固定的
/// 256 MiB 基础窗口。已完成全部对象下载时只保留基础窗口用于恢复与收尾。
pub(crate) fn install_spool_window(
  assets: &[PlanAsset],
  concurrency: usize,
  cache_complete: bool,
) -> u64 {
  if cache_complete {
    return MIN_INSTALL_SPOOL_WINDOW_BYTES;
  }
  let mut asset_worksets = assets
    .iter()
    .map(|asset| {
      let mut seen = std::collections::HashSet::new();
      asset
        .chunks
        .iter()
        .filter(|chunk| chunk.reuse.is_none() && seen.insert(chunk.id.as_str()))
        .fold(0_u64, |total, chunk| total.saturating_add(chunk.compressed_size))
    })
    .collect::<Vec<_>>();
  asset_worksets.sort_unstable_by(|left, right| right.cmp(left));
  asset_worksets
    .into_iter()
    .take(concurrency.max(1).saturating_mul(2))
    .fold(MIN_INSTALL_SPOOL_WINDOW_BYTES, u64::saturating_add)
}

static CACHE_VALIDATION_STATES: LazyLock<Mutex<HashMap<PathBuf, CacheValidationState>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedPlan {
  pub(crate) schema_version: u32,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) source_scheme: SchemeId,
  pub(crate) target_scheme: SchemeId,
  pub(crate) target: PackagePlanTarget,
  #[serde(default)]
  pub(crate) source_tag: Option<String>,
  pub(crate) target_tag: String,
  pub(crate) manifest_digest: String,
  pub(crate) strategy: PackagePlanStrategy,
  pub(crate) downloads: Vec<PlanDownload>,
  pub(crate) assets: Vec<PlanAsset>,
  pub(crate) delete_files: Vec<PlanDelete>,
  pub(crate) inventory: Vec<PlanFile>,
  #[serde(default)]
  pub(crate) install_overlay: Option<InstallOverlay>,
  #[serde(default)]
  pub(crate) audio_selection: Option<PlanAudioSelection>,
  pub(crate) created_at: String,
}

/// 已安装游戏语音包变更计划绑定的源集合与目标集合。
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanAudioSelection {
  pub(crate) source_audio_languages: Vec<String>,
  pub(crate) target_audio_languages: Vec<String>,
}

/// The immutable, trusted-Rust overlay for a fresh installation.
#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallOverlay {
  pub(crate) library_root: String,
  pub(crate) game_root: String,
  pub(crate) staging_root: String,
  #[serde(default)]
  pub(crate) spool_root: String,
  #[serde(default)]
  pub(crate) target_path_sha256: String,
  #[serde(default)]
  pub(crate) library_volume_serial: u64,
  #[serde(default)]
  pub(crate) library_file_id: u64,
  #[serde(default)]
  pub(crate) target_volume_serial: u64,
  #[serde(default)]
  pub(crate) target_file_id: u64,
  pub(crate) marker_nonce: String,
  pub(crate) expected_executable: String,
  pub(crate) channel: u32,
  pub(crate) sub_channel: u32,
  pub(crate) audio_languages: Vec<String>,
  pub(crate) config: String,
  pub(crate) config_sha256: String,
  pub(crate) sdk: Option<InstallSdk>,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallSdk {
  pub(crate) version: String,
  pub(crate) pkg_version_file_name: String,
  pub(crate) md5: String,
  pub(crate) size: u64,
  pub(crate) decompressed_size: u64,
  pub(crate) cache_key: String,
  #[serde(default, skip_serializing)]
  pub(crate) url: String,
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
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PayloadEncoding {
  Raw,
  Zstd,
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
  on_progress: &Channel<PackagePlanProgress>,
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
    PackagePlanTarget::Audio => {
      return Err("语音包变更请使用语音包评估入口".to_string());
    }
    PackagePlanTarget::Switch => {
      return Err("渠道转换请使用换服评估入口".to_string());
    }
    PackagePlanTarget::Install => {
      return Err("全新安装请使用安装计划入口".to_string());
    }
  };
  if source_tag == target_branch.tag {
    return Err("本地版本已与目标版本一致".to_string());
  }
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let client = create_http_client()?;
  report_plan_progress(on_progress, 3, "正在下载并解析资源清单");
  let parts = build_executable_plan(
    &client,
    branches,
    target_branch,
    source_tag,
    &installation.audio_languages,
  )
  .await?;
  report_plan_progress(on_progress, 4, "正在计算缓存、磁盘空间并保存计划");

  persist_plan_parts(
    installation,
    scheme,
    target,
    source_tag,
    &target_branch.tag,
    parts,
    &app_data_dir.join("game-tasks"),
    None,
  )
}

/// 为当前正式版本生成只改变官方语音分类的 manifest-diff 计划。
pub async fn create_and_persist_audio_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  target_audio_languages: Vec<String>,
  app_data_dir: &Path,
  on_progress: &Channel<PackagePlanProgress>,
) -> Result<PackagePlanSummary, String> {
  let source_tag = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法生成语音包计划".to_string())?;
  if source_tag != branches.main.tag {
    return Err("请先将游戏更新到当前正式版本，再管理语音包".to_string());
  }
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let source_audio_languages = normalize_audio_languages(installation.audio_languages.clone())
    .map_err(|_| "未识别到完整的已安装语音包，请先校验游戏完整性".to_string())?;
  let target_audio_languages = normalize_audio_languages(target_audio_languages)?;
  if source_audio_languages == target_audio_languages {
    return Err("语音包选择未发生变化".to_string());
  }
  let selection = PlanAudioSelection { source_audio_languages, target_audio_languages };
  let client = create_http_client()?;
  report_plan_progress(on_progress, 3, "正在下载并解析语音资源清单");
  let parts = build_audio_manifest_plan(&client, &branches.main, &selection).await?;
  if parts.assets.is_empty() && parts.delete_files.is_empty() {
    return Err("所选语音包没有产生可执行的文件变化".to_string());
  }
  report_plan_progress(on_progress, 4, "正在计算缓存、磁盘空间并保存计划");
  persist_plan_parts(
    installation,
    scheme,
    PackagePlanTarget::Audio,
    source_tag,
    source_tag,
    parts,
    &app_data_dir.join("game-tasks"),
    Some(selection),
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
  audio_selection: Option<PlanAudioSelection>,
) -> Result<PackagePlanSummary, String> {
  let cache_root = task_root.join("cache/chunks");
  let cache_hit_bytes = calculate_cache_hits(&cache_root, &parts.downloads);
  fs::create_dir_all(&cache_root).map_err(|error| format!("创建资源缓存目录失败：{error}"))?;
  let missing_download_bytes = parts
    .downloads
    .iter()
    .try_fold(0_u64, |total, item| {
      total.checked_add(item.compressed_size).ok_or_else(|| "计划下载字节数溢出".to_string())
    })?
    .saturating_sub(cache_hit_bytes);
  let download_bytes = parts.downloads.iter().try_fold(0_u64, |total, item| {
    total.checked_add(item.compressed_size).ok_or_else(|| "计划下载字节数溢出".to_string())
  })?;
  let install_bytes = parts.assets.iter().try_fold(0_u64, |total, item| {
    total.checked_add(item.size).ok_or_else(|| "计划安装字节数溢出".to_string())
  })?;
  let delete_bytes = parts.delete_files.iter().try_fold(0_u64, |total, item| {
    total.checked_add(item.size).ok_or_else(|| "计划删除字节数溢出".to_string())
  })?;
  let cache_available_free_bytes = fs2::available_space(&cache_root)
    .map_err(|error| format!("读取资源缓存磁盘剩余空间失败：{error}"))?;
  let install_available_free_bytes = fs2::available_space(&installation.root_path)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  let same_volume = same_volume(&cache_root, Path::new(&installation.root_path));
  let budget = calculate_update_space_budget(
    missing_download_bytes,
    install_bytes,
    cache_available_free_bytes,
    install_available_free_bytes,
    same_volume,
  );
  let plan_id = Uuid::new_v4().to_string();
  let source_audio_languages = audio_selection.as_ref().map_or_else(
    || installation.audio_languages.clone(),
    |value| value.source_audio_languages.clone(),
  );
  let target_audio_languages = audio_selection.as_ref().map_or_else(
    || installation.audio_languages.clone(),
    |value| value.target_audio_languages.clone(),
  );
  let summary = PackagePlanSummary {
    plan_id: plan_id.clone(),
    installation_id: installation.id.clone(),
    target,
    source_tag: Some(source_tag.to_string()),
    target_tag: target_tag.to_string(),
    manifest_digest: parts.manifest_digest.clone(),
    strategy: parts.strategy,
    download_bytes,
    install_bytes,
    delete_bytes,
    cache_hit_bytes,
    required_free_bytes: budget.required_free_bytes,
    available_free_bytes: budget.available_free_bytes,
    has_sufficient_space: budget.has_sufficient_space,
    cache_required_free_bytes: budget.cache_required_free_bytes,
    install_required_free_bytes: budget.install_required_free_bytes,
    cache_available_free_bytes,
    install_available_free_bytes,
    cache_storage_available_free_bytes: cache_available_free_bytes,
    same_volume,
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
    source_audio_languages,
    target_audio_languages,
  };
  let plan = PersistedPlan {
    schema_version: PLAN_SCHEMA_VERSION,
    plan_id: plan_id.clone(),
    installation_id: installation.id.clone(),
    source_scheme: scheme,
    target_scheme: scheme,
    target,
    source_tag: Some(source_tag.to_string()),
    target_tag: target_tag.to_string(),
    manifest_digest: parts.manifest_digest,
    strategy: parts.strategy,
    downloads: parts.downloads,
    assets: parts.assets,
    delete_files: parts.delete_files,
    inventory: parts.inventory,
    install_overlay: None,
    audio_selection,
    created_at: Utc::now().to_rfc3339(),
  };
  persist_new_plan(task_root, &plan)?;
  Ok(summary)
}

/// Create the complete, source-free plan used by a fresh installation.
pub(crate) async fn create_and_persist_install_plan(
  client: &reqwest::Client,
  installation_id: &str,
  scheme: SchemeId,
  audio_languages: &[String],
  mut overlay: InstallOverlay,
  branches: &GameBranches,
  task_root: &Path,
  on_progress: Channel<PackagePlanProgress>,
) -> Result<PackagePlanSummary, String> {
  if branches.main.tag.trim().is_empty() {
    return Err("主分支缺少有效版本号".to_string());
  }
  if audio_languages.is_empty() {
    return Err("至少选择一个语音包".to_string());
  }
  report_plan_progress(&on_progress, 3, "正在下载并解析资源清单与渠道数据");
  let (target, sdk) = futures_util::try_join!(
    get_decoded_build(client, &branches.main, audio_languages),
    get_channel_sdk(client, scheme),
  )?;
  if scheme == SchemeId::CnOfficial && sdk.is_some() {
    return Err("国服官服不应包含渠道 SDK".to_string());
  }
  if scheme == SchemeId::CnBilibili && sdk.is_none() {
    return Err("国服 B 服缺少渠道 SDK".to_string());
  }
  let sdk_file_name = sdk
    .as_ref()
    .map(|package| normalize_manifest_path(&package.pkg_version_file_name))
    .transpose()?;
  overlay.sdk = sdk.as_ref().zip(sdk_file_name.as_ref()).map(|(package, file_name)| InstallSdk {
    version: package.version.clone(),
    pkg_version_file_name: file_name.clone(),
    md5: package.md5.to_ascii_lowercase(),
    size: package.size,
    decompressed_size: package.decompressed_size,
    cache_key: format!("sdk-{}.zip", package.md5.to_ascii_lowercase()),
    url: package.url.clone(),
  });
  let target_tag = branches.main.tag.clone();
  let installation_id = installation_id.to_string();
  let task_root = task_root.to_path_buf();
  let summary_audio_languages = audio_languages.to_vec();
  tauri::async_runtime::spawn_blocking(move || -> Result<PackagePlanSummary, String> {
    let mut parts = build_full_install_plan(target)?;
    if let Some(install_sdk) = overlay.sdk.as_ref() {
      parts_download_push_sdk(&mut parts, install_sdk)?;
    }
    overlay.config_sha256 = sha256_bytes(overlay.config.as_bytes());
    parts.manifest_digest = install_manifest_digest(&parts.manifest_digest, &overlay)?;
    report_plan_progress(&on_progress, 4, "正在计算缓存、磁盘空间并保存计划");
    let plan_id = Uuid::new_v4().to_string();
    let cache_root = task_root.join("cache/chunks");
    let cache_hit_bytes = calculate_cache_hits(&cache_root, &parts.downloads);
    let download_bytes = parts.downloads.iter().try_fold(0_u64, |total, item| {
      total.checked_add(item.compressed_size).ok_or_else(|| "安装计划下载大小溢出".to_string())
    })?;
    let install_bytes = parts
      .assets
      .iter()
      .try_fold(overlay.config.len() as u64, |total, item| {
        total.checked_add(item.size).ok_or_else(|| "安装计划安装大小溢出".to_string())
      })?
      .checked_add(overlay.sdk.as_ref().map_or(0, |sdk| sdk.decompressed_size))
      .ok_or_else(|| "安装计划安装大小溢出".to_string())?;
    let spool_parent = Path::new(&overlay.spool_root).parent().unwrap_or(Path::new("."));
    let cache_available = fs2::available_space(spool_parent)
      .map_err(|error| format!("读取安装任务 spool 磁盘剩余空间失败：{error}"))?;
    let cache_storage_available = fs2::available_space(&task_root)
      .map_err(|error| format!("读取应用缓存磁盘剩余空间失败：{error}"))?;
    let install_parent = Path::new(&overlay.game_root).parent().unwrap_or(Path::new("."));
    let install_available = fs2::available_space(install_parent)
      .map_err(|error| format!("读取安装磁盘剩余空间失败：{error}"))?;
    let spool_window = install_spool_window(&parts.assets, default_install_concurrency(), false);
    let same_volume = same_volume(spool_parent, install_parent);
    let budget = calculate_install_space_budget(
      install_bytes,
      spool_window,
      cache_available,
      install_available,
      same_volume,
    );
    let summary = PackagePlanSummary {
      plan_id: plan_id.clone(),
      installation_id: installation_id.to_string(),
      target: PackagePlanTarget::Install,
      source_tag: None,
      target_tag: target_tag.clone(),
      manifest_digest: parts.manifest_digest.clone(),
      strategy: PackagePlanStrategy::Full,
      download_bytes,
      install_bytes,
      delete_bytes: 0,
      cache_hit_bytes,
      required_free_bytes: budget.required_free_bytes,
      available_free_bytes: budget.available_free_bytes,
      has_sufficient_space: budget.has_sufficient_space,
      cache_required_free_bytes: budget.cache_required_free_bytes,
      install_required_free_bytes: budget.install_required_free_bytes,
      cache_available_free_bytes: cache_available,
      install_available_free_bytes: install_available,
      cache_storage_available_free_bytes: cache_storage_available,
      same_volume,
      download_count: parts.downloads.len(),
      add_count: parts.assets.len(),
      modify_count: 0,
      delete_count: 0,
      source_audio_languages: Vec::new(),
      target_audio_languages: summary_audio_languages,
    };
    let plan = PersistedPlan {
      schema_version: PLAN_SCHEMA_VERSION,
      plan_id: plan_id.clone(),
      installation_id: installation_id.to_string(),
      source_scheme: scheme,
      target_scheme: scheme,
      target: PackagePlanTarget::Install,
      source_tag: None,
      target_tag,
      manifest_digest: parts.manifest_digest,
      strategy: PackagePlanStrategy::Full,
      downloads: parts.downloads,
      assets: parts.assets,
      delete_files: Vec::new(),
      inventory: parts.inventory,
      install_overlay: Some(overlay),
      audio_selection: None,
      created_at: Utc::now().to_rfc3339(),
    };
    persist_new_plan(&task_root, &plan)?;
    Ok(summary)
  })
  .await
  .map_err(|error| format!("等待全新安装计划评估失败：{error}"))?
}

pub(crate) async fn hydrate_and_validate_install_plan(
  installation_id: &str,
  scheme: SchemeId,
  audio_languages: &[String],
  branches: &GameBranches,
  mut plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  if plan.installation_id != installation_id
    || plan.target != PackagePlanTarget::Install
    || plan.strategy != PackagePlanStrategy::Full
    || plan.source_tag.is_some()
    || plan.target_tag != branches.main.tag
  {
    return Err("全新安装计划与当前草稿或主分支不匹配".to_string());
  }
  let mut overlay = plan.install_overlay.clone().ok_or_else(|| "安装计划缺少覆盖层".to_string())?;
  let client = create_http_client()?;
  let target = get_decoded_build(&client, &branches.main, audio_languages).await?;
  let sdk = get_channel_sdk(&client, scheme).await?;
  if (scheme == SchemeId::CnOfficial && sdk.is_some())
    || (scheme == SchemeId::CnBilibili && sdk.is_none())
  {
    return Err("远端渠道 SDK 与安装方案不一致".to_string());
  }
  let sdk_file_name = sdk
    .as_ref()
    .map(|package| normalize_manifest_path(&package.pkg_version_file_name))
    .transpose()?;
  overlay.sdk = sdk.as_ref().zip(sdk_file_name.as_ref()).map(|(package, file_name)| InstallSdk {
    version: package.version.clone(),
    pkg_version_file_name: file_name.clone(),
    md5: package.md5.to_ascii_lowercase(),
    size: package.size,
    decompressed_size: package.decompressed_size,
    cache_key: format!("sdk-{}.zip", package.md5.to_ascii_lowercase()),
    url: package.url.clone(),
  });
  overlay.config_sha256 = sha256_bytes(overlay.config.as_bytes());
  let mut fresh = build_full_install_plan(target)?;
  if let Some(sdk) = overlay.sdk.as_ref() {
    parts_download_push_sdk(&mut fresh, sdk)?;
  }
  fresh.manifest_digest = install_manifest_digest(&fresh.manifest_digest, &overlay)?;
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets)
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || fresh.inventory != plan.inventory
  {
    return Err("远端安装资源清单已变化，请重新评估".to_string());
  }
  plan.downloads = fresh.downloads;
  plan.assets = fresh.assets;
  plan.inventory = fresh.inventory;
  plan.install_overlay = Some(overlay);
  Ok(plan)
}

fn parts_download_push_sdk(parts: &mut PlanParts, sdk: &InstallSdk) -> Result<(), String> {
  let download = PlanDownload {
    id: sdk.cache_key.clone(),
    cache_key: sdk.cache_key.clone(),
    hash_kind: PlanDownloadHashKind::Md5,
    expected_hash: sdk.md5.clone(),
    compressed_size: sdk.size,
    decompressed_size: sdk.size,
    encoding: PayloadEncoding::Raw,
    url_prefix: sdk.url.clone(),
    url_suffix: String::new(),
    range_start: None,
    range_length: None,
  };
  if parts.downloads.iter().any(|item| item.cache_key == download.cache_key) {
    return Err("全新安装 SDK 缓存键重复".to_string());
  }
  parts.downloads.push(download);
  parts.downloads.sort_by(|left, right| left.id.cmp(&right.id));
  Ok(())
}

fn build_full_install_plan(target: DecodedBuild) -> Result<PlanParts, String> {
  let target_assets = collect_assets(&target)?;
  let inventory = collect_inventory(&target_assets)?;
  let target_downloads = collect_category_downloads(&target)?;
  let mut downloads = HashMap::<String, PlanDownload>::new();
  let mut assets = Vec::with_capacity(target_assets.len());
  let mut names = target_assets.keys().cloned().collect::<Vec<_>>();
  names.sort();
  let reusable = HashMap::new();
  for name in names {
    let asset = target_assets[&name];
    let download =
      target_downloads.get(&name).ok_or_else(|| format!("全新安装缺少资源下载信息：{name}"))?;
    assets.push(plan_target_asset(
      name,
      asset,
      PlanAssetAction::Add,
      None,
      download,
      &reusable,
      &mut downloads,
    )?);
  }
  assets.sort_by(|left, right| left.name.cmp(&right.name));
  let mut downloads = downloads.into_values().collect::<Vec<_>>();
  downloads.sort_by(|left, right| left.id.cmp(&right.id));
  Ok(PlanParts {
    strategy: PackagePlanStrategy::Full,
    manifest_digest: manifest_digest(&target),
    downloads,
    assets,
    delete_files: Vec::new(),
    inventory,
  })
}

fn install_manifest_digest(
  manifest_digest: &str,
  overlay: &InstallOverlay,
) -> Result<String, String> {
  let bytes = serde_json::to_vec(&(manifest_digest, overlay))
    .map_err(|error| format!("序列化安装覆盖层失败：{error}"))?;
  Ok(sha256_bytes(&bytes))
}

pub(crate) fn same_volume(left: &Path, right: &Path) -> bool {
  #[cfg(target_os = "windows")]
  {
    use std::path::Component;
    let prefix = |path: &Path| {
      path.components().next().and_then(|component| match component {
        Component::Prefix(prefix) => {
          Some(prefix.as_os_str().to_string_lossy().to_ascii_lowercase())
        }
        _ => None,
      })
    };
    return prefix(left) == prefix(right);
  }
  #[cfg(not(target_os = "windows"))]
  {
    let _ = (left, right);
    false
  }
}

fn calculate_update_space_budget(
  missing_download_bytes: u64,
  install_bytes: u64,
  cache_available_free_bytes: u64,
  install_available_free_bytes: u64,
  same_volume: bool,
) -> SpaceBudget {
  let cache_required_free_bytes = missing_download_bytes.saturating_add(SAFETY_MARGIN_BYTES);
  let install_required_free_bytes = install_bytes.saturating_add(SAFETY_MARGIN_BYTES);
  let required_free_bytes = if same_volume {
    missing_download_bytes.saturating_add(install_bytes).saturating_add(SAFETY_MARGIN_BYTES)
  } else {
    cache_required_free_bytes.max(install_required_free_bytes)
  };
  let available_free_bytes = cache_available_free_bytes.min(install_available_free_bytes);
  let has_sufficient_space = if same_volume {
    available_free_bytes >= required_free_bytes
  } else {
    cache_available_free_bytes >= cache_required_free_bytes
      && install_available_free_bytes >= install_required_free_bytes
  };
  SpaceBudget {
    required_free_bytes,
    available_free_bytes,
    cache_required_free_bytes,
    install_required_free_bytes,
    has_sufficient_space,
  }
}

fn calculate_install_space_budget(
  install_bytes: u64,
  spool_window: u64,
  cache_available_free_bytes: u64,
  install_available_free_bytes: u64,
  same_volume: bool,
) -> SpaceBudget {
  let cache_required_free_bytes = spool_window.saturating_add(SAFETY_MARGIN_BYTES);
  let install_required_free_bytes = install_bytes
    .saturating_add(if same_volume { spool_window } else { 0 })
    .saturating_add(SAFETY_MARGIN_BYTES);
  let required_free_bytes = if same_volume {
    install_required_free_bytes
  } else {
    cache_required_free_bytes.max(install_required_free_bytes)
  };
  let available_free_bytes = if same_volume {
    cache_available_free_bytes.min(install_available_free_bytes)
  } else {
    install_available_free_bytes
  };
  let has_sufficient_space = if same_volume {
    available_free_bytes >= required_free_bytes
  } else {
    cache_available_free_bytes >= cache_required_free_bytes
      && install_available_free_bytes >= install_required_free_bytes
  };
  SpaceBudget {
    required_free_bytes,
    available_free_bytes,
    cache_required_free_bytes,
    install_required_free_bytes,
    has_sufficient_space,
  }
}

fn sha256_bytes(bytes: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(bytes);
  format!("{:x}", hasher.finalize())
}

/// 重新请求当前远端清单，核对计划摘要并补回不会持久化的签名下载字段。
pub(crate) async fn hydrate_and_validate_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  mut plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let source_tag =
    plan.source_tag.as_deref().ok_or_else(|| "全新安装计划不能用于已有游戏更新".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(source_tag)
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if plan.target == PackagePlanTarget::Audio {
    return hydrate_audio_plan(installation, branches, plan).await;
  }
  if is_integrity_repair_plan(&plan) {
    return hydrate_integrity_repair_plan(installation, branches, plan).await;
  }
  let target_branch = match plan.target {
    PackagePlanTarget::Main => &branches.main,
    PackagePlanTarget::PreDownload => {
      branches.pre_download.as_ref().ok_or_else(|| "预下载分支已不可用，请重新评估".to_string())?
    }
    PackagePlanTarget::Audio => unreachable!(),
    PackagePlanTarget::Switch => {
      return Err("渠道转换任务不能作为资源下载计划恢复".to_string());
    }
    PackagePlanTarget::Install => {
      return Err("全新安装计划不能用于已有游戏".to_string());
    }
  };
  if target_branch.tag != plan.target_tag {
    return Err("资源计划目标版本已变化，请重新评估".to_string());
  }
  let client = create_http_client()?;
  let fresh = match plan.strategy {
    PackagePlanStrategy::Patch => {
      let build =
        get_decoded_patch_build(&client, target_branch, source_tag, &installation.audio_languages)
          .await?;
      build_patch_plan(build, source_tag)?
    }
    PackagePlanStrategy::ManifestDiff => {
      build_manifest_plan(
        &client,
        &branches.main.with_tag(source_tag),
        target_branch,
        &installation.audio_languages,
      )
      .await?
    }
    PackagePlanStrategy::Full => {
      return Err("全新安装计划不能用于已有游戏".to_string());
    }
  };
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets)
    || fresh.delete_files != plan.delete_files
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || fresh.inventory != plan.inventory
  {
    return Err("远端资源清单已变化，请重新评估".to_string());
  }
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
  let source_tag =
    plan.source_tag.as_deref().ok_or_else(|| "全新安装计划不能用于已有游戏更新".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(source_tag)
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch) {
    return Err("当前只能应用包含完整目标清单的资源计划".to_string());
  }
  if plan.target == PackagePlanTarget::Audio {
    return hydrate_audio_plan(installation, branches, plan).await;
  }
  if is_integrity_repair_plan(&plan) {
    return hydrate_integrity_repair_plan(installation, branches, plan).await;
  }
  if branches.main.tag != plan.target_tag {
    return Err(match plan.target {
      PackagePlanTarget::PreDownload => "预下载目标尚未成为正式版本，暂时不能应用".to_string(),
      PackagePlanTarget::Main => "正式版本已变化，请重新评估".to_string(),
      PackagePlanTarget::Audio => "正式版本已变化，请重新评估语音包".to_string(),
      PackagePlanTarget::Switch => "渠道转换任务不能作为资源更新应用".to_string(),
      PackagePlanTarget::Install => "全新安装计划不能用于已有游戏".to_string(),
    });
  }
  let client = create_http_client()?;
  let fresh = match plan.strategy {
    PackagePlanStrategy::Patch => {
      let build =
        get_decoded_patch_build(&client, &branches.main, source_tag, &installation.audio_languages)
          .await?;
      build_patch_plan(build, source_tag)?
    }
    PackagePlanStrategy::ManifestDiff => {
      build_manifest_plan(
        &client,
        &branches.main.with_tag(source_tag),
        &branches.main,
        &installation.audio_languages,
      )
      .await?
    }
    PackagePlanStrategy::Full => {
      return Err("全新安装计划不能用于已有游戏".to_string());
    }
  };
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets)
    || fresh.delete_files != plan.delete_files
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || fresh.inventory != plan.inventory
  {
    return Err("正式版本资源清单与计划不一致，请重新评估".to_string());
  }
  plan.downloads = fresh.downloads;
  plan.assets = fresh.assets;
  plan.inventory = fresh.inventory;
  Ok(plan)
}

async fn hydrate_audio_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  mut plan: PersistedPlan,
) -> Result<PersistedPlan, String> {
  if plan.schema_version != PLAN_SCHEMA_VERSION
    || plan.strategy != PackagePlanStrategy::ManifestDiff
    || plan.source_tag.as_deref() != Some(branches.main.tag.as_str())
    || plan.target_tag != branches.main.tag
  {
    return Err("语音包计划版本或正式分支已变化，请重新评估".to_string());
  }
  let selection =
    plan.audio_selection.as_ref().ok_or_else(|| "语音包计划缺少语言选择".to_string())?;
  // 资源准备阶段前移删除后、新增尚未落盘前，磁盘只保留两端共有的语音，
  // 全部替换时甚至可能暂时为空；这里不做严格 normalize（空集不报错），
  // 交给下面的兼容性判定：只要共有语音仍在、且没有计划外的语音出现即可。
  let mut current_audio_languages = installation
    .audio_languages
    .iter()
    .filter(|language| matches!(language.as_str(), "zh-cn" | "en-us" | "ja-jp" | "ko-kr"))
    .cloned()
    .collect::<Vec<_>>();
  current_audio_languages.sort();
  current_audio_languages.dedup();
  let allowed_languages =
    selection.source_audio_languages.iter().chain(selection.target_audio_languages.iter());
  let allowed_set = allowed_languages.collect::<HashSet<_>>();
  let has_unexpected =
    current_audio_languages.iter().any(|language| !allowed_set.contains(language));
  let kept_languages = selection
    .source_audio_languages
    .iter()
    .filter(|language| selection.target_audio_languages.contains(language))
    .collect::<Vec<_>>();
  let kept_missing =
    kept_languages.iter().any(|language| !current_audio_languages.contains(language));
  if has_unexpected || kept_missing {
    return Err("已安装语音包在计划生成后发生变化，请重新评估".to_string());
  }
  let client = create_http_client()?;
  let fresh = build_audio_manifest_plan(&client, &branches.main, selection).await?;
  if fresh.manifest_digest != plan.manifest_digest
    || !assets_match(&fresh.assets, &plan.assets)
    || fresh.delete_files != plan.delete_files
    || !downloads_match(&fresh.downloads, &plan.downloads)
    || fresh.inventory != plan.inventory
  {
    return Err("远端语音资源清单已变化，请重新评估".to_string());
  }
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
  let source_tag =
    plan.source_tag.as_deref().ok_or_else(|| "全新安装计划不能用于资源修复".to_string())?;
  if plan.installation_id != installation.id
    || plan.source_scheme != scheme
    || plan.target_scheme != scheme
    || installation.version.as_deref() != Some(source_tag)
  {
    return Err("资源计划与当前安装状态不匹配，请重新评估".to_string());
  }
  if !matches!(plan.strategy, PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch) {
    return Err("当前只能修复已提交的资源计划".to_string());
  }
  let client = create_http_client()?;
  let tagged_branch;
  let target_branch = if source_tag == plan.target_tag {
    tagged_branch = branches.main.with_tag(&plan.target_tag);
    &tagged_branch
  } else {
    if branches.main.tag != plan.target_tag {
      return Err("正式版本已变化，请重新评估".to_string());
    }
    &branches.main
  };
  let repair_audio_languages = plan.audio_selection.as_ref().map_or_else(
    || installation.audio_languages.as_slice(),
    |selection| selection.target_audio_languages.as_slice(),
  );
  let target = get_decoded_build(&client, target_branch, repair_audio_languages).await?;
  overlay_repair_parts(plan, build_repair_parts(target, files)?)
}

fn overlay_repair_parts(
  mut plan: PersistedPlan,
  parts: PlanParts,
) -> Result<PersistedPlan, String> {
  if parts.inventory != plan.inventory {
    return Err("正式版本资源清单与计划不一致，请重新评估".to_string());
  }
  if plan.target != PackagePlanTarget::Audio
    && plan.strategy == PackagePlanStrategy::ManifestDiff
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
  plan.source_tag.as_deref() == Some(plan.target_tag.as_str())
    && plan.target == PackagePlanTarget::Main
    && plan.strategy == PackagePlanStrategy::ManifestDiff
    && plan.delete_files.is_empty()
    && !plan.assets.is_empty()
    && plan.assets.iter().all(|asset| asset.action == PlanAssetAction::Repair)
}

/// 正式发行版是否开放正式更新与预下载。仅 debug 构建开放。
pub(crate) fn is_debug_game_update_enabled() -> bool {
  cfg!(debug_assertions)
}

/// 计划是否属于尚未对正式版开放的更新/预下载（不含完整性修复）。
pub(crate) fn is_debug_only_update_plan(plan: &PersistedPlan) -> bool {
  match plan.target {
    PackagePlanTarget::PreDownload => true,
    PackagePlanTarget::Main => !is_integrity_repair_plan(plan),
    _ => false,
  }
}

/// 正式发行版拒绝新建正式更新或预下载评估。
pub(crate) fn reject_release_game_update(target: PackagePlanTarget) -> Result<(), String> {
  if is_debug_game_update_enabled()
    || !matches!(target, PackagePlanTarget::Main | PackagePlanTarget::PreDownload)
  {
    return Ok(());
  }
  Err("正式更新与预下载仅在调试版本开放".to_string())
}

/// 正式发行版拒绝启动尚未开放的更新/预下载任务；完整性修复仍可执行。
pub(crate) fn reject_release_game_update_plan(plan: &PersistedPlan) -> Result<(), String> {
  if is_debug_game_update_enabled() || !is_debug_only_update_plan(plan) {
    return Ok(());
  }
  Err("正式更新与预下载仅在调试版本开放".to_string())
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
        && left.encoding == right.encoding
        && left.range_start == right.range_start
        && left.range_length == right.range_length
    })
}

fn assets_match(left: &[PlanAsset], right: &[PlanAsset]) -> bool {
  left.len() == right.len()
    && left.iter().zip(right).all(|(left, right)| {
      left.name == right.name
        && left.action == right.action
        && left.source == right.source
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

async fn build_audio_manifest_plan(
  client: &reqwest::Client,
  branch: &super::hoyoplay::BranchDescriptor,
  selection: &PlanAudioSelection,
) -> Result<PlanParts, String> {
  let (source, target) = futures_util::try_join!(
    get_decoded_build(client, branch, &selection.source_audio_languages),
    get_decoded_build(client, branch, &selection.target_audio_languages),
  )?;
  let manifest_digest = audio_manifest_digest(&source, &target, selection);
  let mut parts = build_manifest_diff(source, target)?;
  parts.manifest_digest = manifest_digest;
  Ok(parts)
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
  let mut assets = HashMap::<String, &Asset>::new();
  for manifest in &build.manifests {
    for asset in &manifest.data.assets {
      let name = normalize_manifest_path(&asset.asset_name)?;
      if let Some(existing) = assets.get(&name) {
        if !assets_equal(existing, asset) {
          return Err(format!("Sophon build 包含元数据冲突的重复资源：{name}"));
        }
        continue;
      }
      assets.insert(name, asset);
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

fn audio_manifest_digest(
  source: &DecodedBuild,
  target: &DecodedBuild,
  selection: &PlanAudioSelection,
) -> String {
  let mut entries = Vec::new();
  entries.extend(source.manifests.iter().map(|manifest| {
    format!(
      "source:{}:{}:{}",
      manifest.matching_field, manifest.manifest_id, manifest.manifest_checksum
    )
  }));
  entries.extend(target.manifests.iter().map(|manifest| {
    format!(
      "target:{}:{}:{}",
      manifest.matching_field, manifest.manifest_id, manifest.manifest_checksum
    )
  }));
  entries.extend(
    selection.source_audio_languages.iter().map(|language| format!("source-language:{language}")),
  );
  entries.extend(
    selection.target_audio_languages.iter().map(|language| format!("target-language:{language}")),
  );
  entries.sort();
  digest_parts(&target.tag, &entries)
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

pub(crate) struct CachedDownloadScan {
  pub(crate) completed_cache_keys: Vec<String>,
  pub(crate) confirmed_bytes: u64,
  pub(crate) missing_bytes: u64,
}

pub(crate) fn scan_cached_downloads(
  cache_root: &Path,
  downloads: &[PlanDownload],
  on_progress: impl FnMut(usize, usize, u64),
) -> Result<CachedDownloadScan, String> {
  scan_cached_downloads_inner(cache_root, downloads, true, on_progress)
}

fn calculate_cache_hits(cache_root: &Path, downloads: &[PlanDownload]) -> u64 {
  scan_cached_downloads_inner(cache_root, downloads, false, |_, _, _| {})
    .map_or(0, |scan| scan.confirmed_bytes)
}

fn scan_cached_downloads_inner(
  cache_root: &Path,
  downloads: &[PlanDownload],
  collect_cache_keys: bool,
  mut on_progress: impl FnMut(usize, usize, u64),
) -> Result<CachedDownloadScan, String> {
  let total_bytes = downloads.iter().try_fold(0_u64, |total, download| {
    total.checked_add(download.compressed_size).ok_or_else(|| "资源缓存对象总大小溢出".to_string())
  })?;
  if downloads.is_empty() {
    on_progress(0, 0, 0);
    return Ok(CachedDownloadScan {
      completed_cache_keys: Vec::new(),
      confirmed_bytes: 0,
      missing_bytes: 0,
    });
  }
  let available = std::thread::available_parallelism().map_or(1, |value| value.get());
  let worker_count = cache_hit_worker_count(downloads.len(), available);
  let chunk_size = downloads.len().div_ceil(worker_count);
  on_progress(0, downloads.len(), 0);
  let (completed_cache_keys, confirmed_bytes) = std::thread::scope(|scope| {
    let (progress_sender, progress_receiver) = std::sync::mpsc::channel();
    let handles = downloads
      .chunks(chunk_size)
      .enumerate()
      .map(|(chunk_index, chunk)| {
        let sender = progress_sender.clone();
        scope.spawn(move || {
          let mut matches = Vec::new();
          let mut batch_count = 0_usize;
          let mut batch_bytes = 0_u64;
          for (index, download) in chunk.iter().enumerate() {
            if cached_chunk_matches(cache_root, download) {
              if collect_cache_keys {
                matches.push((chunk_index * chunk_size + index, download.cache_key.clone()));
              }
              batch_bytes += download.compressed_size;
            }
            batch_count += 1;
            if batch_count == CACHE_SCAN_PROGRESS_BATCH_SIZE {
              let _ = sender.send((batch_count, batch_bytes));
              batch_count = 0;
              batch_bytes = 0;
            }
          }
          if batch_count > 0 {
            let _ = sender.send((batch_count, batch_bytes));
          }
          matches
        })
      })
      .collect::<Vec<_>>();
    drop(progress_sender);

    let mut scanned_objects = 0_usize;
    let mut confirmed_bytes = 0_u64;
    for (batch_count, batch_bytes) in progress_receiver {
      scanned_objects += batch_count;
      confirmed_bytes += batch_bytes;
      on_progress(scanned_objects, downloads.len(), confirmed_bytes);
    }

    let mut completed_cache_keys = Vec::new();
    for handle in handles {
      let mut matches = handle.join().map_err(|_| "资源缓存核对线程异常退出".to_string())?;
      completed_cache_keys.append(&mut matches);
    }
    if scanned_objects != downloads.len() {
      return Err("资源缓存核对未完整结束".to_string());
    }
    completed_cache_keys.sort_unstable_by_key(|(index, _)| *index);
    Ok::<_, String>((completed_cache_keys, confirmed_bytes))
  })?;
  flush_cache_validation_index(cache_root);
  Ok(CachedDownloadScan {
    completed_cache_keys: completed_cache_keys.into_iter().map(|(_, key)| key).collect(),
    confirmed_bytes,
    missing_bytes: total_bytes.saturating_sub(confirmed_bytes),
  })
}

fn cache_hit_worker_count(download_count: usize, available: usize) -> usize {
  if download_count == 0 {
    return 0;
  }
  available.max(1).min(MAX_CACHE_SCAN_WORKERS).min(download_count)
}

pub(crate) fn cached_chunk_matches(cache_root: &Path, download: &PlanDownload) -> bool {
  if download.hash_kind == PlanDownloadHashKind::UnsupportedPatchRange {
    return false;
  }
  let path = cache_root.join(&download.cache_key);
  let Ok(metadata) = fs::symlink_metadata(&path) else {
    return false;
  };
  if !cache_file_metadata_matches(&metadata, download) {
    log::warn!(
      "[game-package] 缓存元数据不匹配：key={} root={} len={} is_file={}",
      download.cache_key,
      cache_root.display(),
      metadata.len(),
      metadata.is_file(),
    );
    forget_cache_validation(cache_root, download);
    return false;
  }
  if cache_validation_matches(cache_root, download, &metadata) {
    return true;
  }
  let matches = cache_file_hash_matches(&path, download);
  if matches {
    remember_cache_validation(cache_root, download, &metadata);
  } else {
    log::warn!(
      "[game-package] 缓存哈希不匹配：key={} root={} len={}",
      download.cache_key,
      cache_root.display(),
      metadata.len(),
    );
    forget_cache_validation(cache_root, download);
  }
  matches
}

pub(crate) async fn cached_chunk_matches_async(cache_root: &Path, download: &PlanDownload) -> bool {
  let cache_root = cache_root.to_path_buf();
  let download = download.clone();
  tauri::async_runtime::spawn_blocking(move || cached_chunk_matches(&cache_root, &download))
    .await
    .unwrap_or(false)
}

/// 校验任意路径下的普通文件是否与计划下载对象一致；不读写缓存校验索引。
///
/// 供安装任务放弃时把任务私有 spool 分片并入共享缓存前复核使用，避免把
/// 未完整下载或损坏的对象当作缓存命中。
pub(crate) fn cache_file_matches(path: &Path, download: &PlanDownload) -> bool {
  if download.hash_kind == PlanDownloadHashKind::UnsupportedPatchRange {
    return false;
  }
  let Ok(metadata) = fs::symlink_metadata(path) else {
    return false;
  };
  cache_file_metadata_matches(&metadata, download) && cache_file_hash_matches(path, download)
}

fn cache_file_metadata_matches(metadata: &fs::Metadata, download: &PlanDownload) -> bool {
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
  true
}

fn cache_file_hash_matches(path: &Path, download: &PlanDownload) -> bool {
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

fn cache_validation_index_path(cache_root: &Path) -> PathBuf {
  cache_root.parent().unwrap_or(cache_root).join(CACHE_VALIDATION_INDEX_FILE)
}

fn load_cache_validation_state(cache_root: &Path) -> CacheValidationState {
  let path = cache_validation_index_path(cache_root);
  let index = fs::metadata(&path)
    .ok()
    .filter(|metadata| metadata.len() > 0 && metadata.len() <= MAX_CACHE_VALIDATION_INDEX_BYTES)
    .and_then(|_| fs::read(path).ok())
    .and_then(|bytes| serde_json::from_slice::<CacheValidationIndex>(&bytes).ok())
    .unwrap_or_default();
  CacheValidationState { index, dirty: false }
}

fn cache_modified_at(metadata: &fs::Metadata) -> Option<u64> {
  metadata.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_nanos().try_into().ok()
}

fn cache_validation_matches(
  cache_root: &Path,
  download: &PlanDownload,
  metadata: &fs::Metadata,
) -> bool {
  let Some(modified_at) = cache_modified_at(metadata) else {
    return false;
  };
  let Ok(mut states) = CACHE_VALIDATION_STATES.lock() else {
    return false;
  };
  let state = states
    .entry(cache_root.to_path_buf())
    .or_insert_with(|| load_cache_validation_state(cache_root));
  state.index.entries.get(&download.cache_key).is_some_and(|record| {
    record.size == metadata.len()
      && record.modified_at == modified_at
      && record.hash_kind == download.hash_kind
      && record.expected_hash.eq_ignore_ascii_case(&download.expected_hash)
  })
}

pub(crate) fn remember_cache_validation(
  cache_root: &Path,
  download: &PlanDownload,
  metadata: &fs::Metadata,
) {
  let Some(modified_at) = cache_modified_at(metadata) else {
    return;
  };
  let Ok(mut states) = CACHE_VALIDATION_STATES.lock() else {
    return;
  };
  let state = states
    .entry(cache_root.to_path_buf())
    .or_insert_with(|| load_cache_validation_state(cache_root));
  state.index.entries.insert(
    download.cache_key.clone(),
    CacheValidationRecord {
      size: metadata.len(),
      modified_at,
      hash_kind: download.hash_kind,
      expected_hash: download.expected_hash.clone(),
    },
  );
  state.dirty = true;
}

fn forget_cache_validation(cache_root: &Path, download: &PlanDownload) {
  let Ok(mut states) = CACHE_VALIDATION_STATES.lock() else {
    return;
  };
  let state = states
    .entry(cache_root.to_path_buf())
    .or_insert_with(|| load_cache_validation_state(cache_root));
  if state.index.entries.remove(&download.cache_key).is_some() {
    state.dirty = true;
  }
}

pub(crate) fn flush_cache_validation_index(cache_root: &Path) {
  let Ok(mut states) = CACHE_VALIDATION_STATES.lock() else {
    return;
  };
  let state = states
    .entry(cache_root.to_path_buf())
    .or_insert_with(|| load_cache_validation_state(cache_root));
  if !state.dirty {
    return;
  }
  let content = match serde_json::to_vec(&state.index) {
    Ok(content) => content,
    Err(error) => {
      log::warn!("[game-package] 序列化缓存校验索引失败：{error}");
      return;
    }
  };
  if content.len() as u64 > MAX_CACHE_VALIDATION_INDEX_BYTES {
    log::warn!("[game-package] 缓存校验索引超过大小上限，暂不持久化");
    return;
  }
  let path = cache_validation_index_path(cache_root);
  if let Err(error) = fs::write(&path, content) {
    log::warn!("[game-package] 写入缓存校验索引失败：{error}");
    return;
  }
  state.dirty = false;
}

pub(crate) fn clear_cache_validation_index(cache_root: &Path) {
  if let Ok(mut states) = CACHE_VALIDATION_STATES.lock() {
    states.remove(cache_root);
  }
  let path = cache_validation_index_path(cache_root);
  if let Err(error) = fs::remove_file(path)
    && error.kind() != std::io::ErrorKind::NotFound
  {
    log::warn!("[game-package] 清理缓存校验索引失败：{error}");
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
  if plan.schema_version != PLAN_SCHEMA_VERSION || plan.plan_id != plan_id {
    return Err("游戏资源计划版本或身份不匹配".to_string());
  }
  let source_tag_valid = plan.source_tag.as_deref().is_some_and(|source_tag| {
    !source_tag.is_empty() && source_tag.len() <= 128 && !source_tag.chars().any(char::is_control)
  });
  let install_plan_valid = plan.target == PackagePlanTarget::Install
    && plan.strategy == PackagePlanStrategy::Full
    && plan.source_tag.is_none()
    && plan.install_overlay.is_some();
  let audio_plan_valid = if plan.target == PackagePlanTarget::Audio {
    plan.schema_version == PLAN_SCHEMA_VERSION
      && plan.strategy == PackagePlanStrategy::ManifestDiff
      && plan.install_overlay.is_none()
      && plan.source_tag.as_deref() == Some(plan.target_tag.as_str())
      && plan.audio_selection.as_ref().is_some_and(|selection| {
        normalize_audio_languages(selection.source_audio_languages.clone())
          .is_ok_and(|languages| languages == selection.source_audio_languages)
          && normalize_audio_languages(selection.target_audio_languages.clone())
            .is_ok_and(|languages| languages == selection.target_audio_languages)
          && selection.source_audio_languages != selection.target_audio_languages
      })
  } else {
    plan.audio_selection.is_none()
  };
  if plan.installation_id.is_empty()
    || (!install_plan_valid && !source_tag_valid)
    || (plan.target == PackagePlanTarget::Install && !install_plan_valid)
    || !audio_plan_valid
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
    || (matches!(
      plan.strategy,
      PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch | PackagePlanStrategy::Full
    ) && plan.inventory.is_empty())
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
      (PlanAssetAction::Modify, None)
      | (PlanAssetAction::Add, Some(_))
      | (PlanAssetAction::Repair, Some(_)) => false,
    };
    if !asset_names.insert(asset.name.as_str())
      || !is_md5(&asset.md5)
      || !source_valid
      || (plan.strategy == PackagePlanStrategy::ManifestDiff && asset.patch.is_some())
      || (plan.strategy == PackagePlanStrategy::Patch && asset.patch.is_none())
      || (plan.strategy == PackagePlanStrategy::Full
        && (asset.action != PlanAssetAction::Add
          || asset.source.is_some()
          || asset.patch.is_some()))
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
  if matches!(
    plan.strategy,
    PackagePlanStrategy::ManifestDiff | PackagePlanStrategy::Patch | PackagePlanStrategy::Full
  ) && plan.assets.iter().any(|asset| {
    inventory
      .get(asset.name.as_str())
      .is_none_or(|file| file.size != asset.size || !file.md5.eq_ignore_ascii_case(&asset.md5))
  }) {
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
      || case_folded == ".teyvatguide-install.marker"
      || case_folded.starts_with(".teyvatguide-install.marker/")
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
  let target = directory.join("plan.json");
  let temporary = directory.join(format!("plan.json.{}.tmp", Uuid::new_v4()));
  let file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建游戏资源计划临时文件失败：{error}"))?;
  let mut writer = BufWriter::with_capacity(256 * 1024, file);
  if let Err(error) = serde_json::to_writer(&mut writer, plan) {
    drop(writer);
    let _ = fs::remove_file(&temporary);
    return Err(format!("序列化游戏资源计划失败：{error}"));
  }
  if let Err(error) = writer.flush() {
    drop(writer);
    let _ = fs::remove_file(&temporary);
    return Err(format!("写入游戏资源计划失败：{error}"));
  }
  let file = match writer.into_inner() {
    Ok(file) => file,
    Err(error) => {
      let message = error.error().to_string();
      drop(error);
      let _ = fs::remove_file(&temporary);
      return Err(format!("写入游戏资源计划失败：{message}"));
    }
  };
  let content_len = match file.metadata() {
    Ok(metadata) => metadata.len(),
    Err(error) => {
      drop(file);
      let _ = fs::remove_file(&temporary);
      return Err(format!("读取游戏资源计划大小失败：{error}"));
    }
  };
  if content_len > MAX_PLAN_BYTES as u64 {
    drop(file);
    let _ = fs::remove_file(&temporary);
    return Err("游戏资源计划超过安全大小上限".to_string());
  }
  if let Err(error) = file.sync_all() {
    drop(file);
    let _ = fs::remove_file(&temporary);
    return Err(format!("同步游戏资源计划失败：{error}"));
  }
  drop(file);
  if let Err(error) = atomic_replace_plan(&temporary, &target) {
    let _ = fs::remove_file(&temporary);
    return Err(error);
  }
  sync_directory(&directory)?;
  Ok(())
}

fn persist_new_plan(task_root: &Path, plan: &PersistedPlan) -> Result<(), String> {
  persist_plan(task_root, &plan.plan_id, plan)?;
  if let Err(error) = plan_lifecycle::persist_metadata(
    task_root,
    &plan.plan_id,
    &plan.installation_id,
    plan.target,
    &plan.created_at,
  ) {
    let _ = fs::remove_dir_all(task_root.join("tasks").join(&plan.plan_id));
    return Err(error);
  }
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
