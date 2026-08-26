//! 国服官服与国服 B 服同资源家族渠道转换。
//!
//! 评估阶段只写 `switch/<installation-id>/plan.json`。目标渠道存在 SDK 时，执行阶段先把
//! SDK zip 写入 `cache/sdks/<md5>`，安全解压到任务 staging 并按 `sdk_pkg_version` 校验，
//! 再复用写前 journal 提交文件，最后才改 `channel/sub_channel`。
//! @since Beta v0.11.5

use super::{
  committer::{SwitchApplyRequest, SwitchFileStep},
  hoyoplay::{
    ChannelSdkPackage, GameBranches, get_channel_sdk, get_deprecated_files, network_error,
  },
  journal::{CommitStepKind, TaskJournal},
  model::{GameInstallation, InstallationStatus, PackageSwitchSummary, SchemeId},
  path_guard::{
    normalize_manifest_path, prepare_manifest_output_file, resolve_optional_manifest_file,
  },
  planner::load_verify_target,
  scheme::{canonical_channel, opposite_scheme},
};
use chrono::Utc;
use futures_util::TryStreamExt;
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha2Digest, Sha256};
use std::{
  collections::{HashMap, HashSet},
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::atomic::{AtomicBool, Ordering},
  time::{Duration, Instant},
};
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use zip::ZipArchive;

const PLAN_SCHEMA_VERSION: u32 = 1;
const COMMIT_SCHEMA_VERSION: u32 = 1;
const MAX_PLAN_BYTES: usize = 16 * 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
/// 国服 B 服 SDK 含 CEF 语言包，实测约 78 个 zip 条目、71 个 `sdk_pkg_version` 文件。
const MAX_SDK_ZIP_ENTRIES: usize = 512;
const MAX_SDK_PKG_VERSION_BYTES: u64 = 256 * 1024;
const MAX_SDK_PKG_VERSION_FILES: usize = 512;
const ATOMIC_REPLACE_RETRIES: usize = 10;
const ATOMIC_REPLACE_RETRY_INTERVAL: Duration = Duration::from_millis(100);
/// 渠道 SDK 解压硬顶。HoyoPlay `decompressed_size` 可能低于 zip 未压缩总和（B 服 CEF 包约高出 15%）。
const MAX_SDK_DECOMPRESSED_BYTES: u64 = 512 * 1024 * 1024;
const MAX_SDK_DOWNLOAD_ATTEMPTS: usize = 4;
const KNOWN_SDK_FILES: [&str; 4] = [
  "YuanShen_Data/Plugins/PCGameSDK.dll",
  "YuanShen_Data/Plugins/EOSSDK-Win64-Shipping.dll",
  "YuanShen_Data/Plugins/PluginEOSSDK.dll",
  "sdk_pkg_version",
];

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedSwitchPlan {
  schema_version: u32,
  plan_id: String,
  installation_id: String,
  source_scheme: SchemeId,
  target_scheme: SchemeId,
  source_channel: u32,
  source_sub_channel: u32,
  target_channel: u32,
  target_sub_channel: u32,
  sdk: Option<PersistedSdk>,
  /// 兼容已持久化的 v1 计划；来源 SDK 不参与当前换服任务。
  source_sdk: Option<PersistedSdk>,
  delete_files: Vec<String>,
  created_at: String,
}

impl PersistedSwitchPlan {
  pub(crate) fn plan_id(&self) -> &str {
    &self.plan_id
  }

  pub(crate) fn installation_id(&self) -> &str {
    &self.installation_id
  }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedSwitchCommit {
  schema_version: u32,
  plan_id: String,
  installation_id: String,
  digest: String,
  target_channel: u32,
  target_sub_channel: u32,
  files: Vec<PersistedSwitchFile>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedSwitchFile {
  kind: String,
  name: String,
  size: u64,
  md5: String,
  source_size: Option<u64>,
  source_md5: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SdkPkgVersionItem {
  remote_name: String,
  md5: String,
  file_size: u64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedSdk {
  version: String,
  pkg_version_file_name: String,
  md5: String,
  size: u64,
  decompressed_size: u64,
  url: String,
}

/// 生成并持久化渠道转换计划；评估不会修改游戏目录。
pub(crate) async fn create_and_persist_switch_plan(
  installation: &GameInstallation,
  branches: &GameBranches,
  task_root: &Path,
) -> Result<PackageSwitchSummary, String> {
  if installation.status != InstallationStatus::Known {
    return Err("只有渠道状态一致的安装才能评估换服".to_string());
  }
  let source_scheme = installation.scheme_id.ok_or_else(|| "无法识别当前游戏渠道".to_string())?;
  let source_channel = installation.channel.ok_or_else(|| "config.ini 缺少 channel".to_string())?;
  let source_sub_channel =
    installation.sub_channel.ok_or_else(|| "config.ini 缺少 sub_channel".to_string())?;
  let target_scheme = opposite_scheme(source_scheme);
  if source_scheme == target_scheme {
    return Err("当前渠道与目标渠道相同".to_string());
  }
  let (target_channel, target_sub_channel) = canonical_channel(target_scheme);
  let client = super::hoyoplay::create_http_client()?;
  let (target_sdk, deprecated, inventory) = tokio::try_join!(
    get_channel_sdk(&client, target_scheme),
    get_deprecated_files(&client, target_scheme),
    async { load_verify_target(installation, branches).await.map(|(_, inventory)| inventory) },
  )?;
  let game_root = PathBuf::from(&installation.root_path);
  let inventory_names = inventory.into_iter().map(|file| file.name).collect::<HashSet<_>>();
  let delete_files =
    collect_delete_files(&game_root, &deprecated, &inventory_names, target_sdk.is_none())?;
  let cache_hit_bytes =
    target_sdk.as_ref().map(|package| sdk_cache_hit(task_root, package)).unwrap_or(0);
  let download_bytes = target_sdk
    .as_ref()
    .map(|package| package.size.saturating_sub(sdk_cache_hit(task_root, package)))
    .unwrap_or(0);
  let install_bytes = target_sdk.as_ref().map(|package| package.decompressed_size).unwrap_or(0);
  let required_free_bytes = download_bytes
    .checked_add(install_bytes)
    .and_then(|value| value.checked_add(SAFETY_MARGIN_BYTES))
    .ok_or_else(|| "换服所需空间溢出".to_string())?;
  let available_free_bytes = fs2::available_space(&installation.root_path)
    .map_err(|error| format!("读取游戏磁盘剩余空间失败：{error}"))?;
  let plan = PersistedSwitchPlan {
    schema_version: PLAN_SCHEMA_VERSION,
    plan_id: Uuid::new_v4().to_string(),
    installation_id: installation.id.clone(),
    source_scheme,
    target_scheme,
    source_channel,
    source_sub_channel,
    target_channel,
    target_sub_channel,
    sdk: target_sdk.as_ref().map(persisted_sdk),
    source_sdk: None,
    delete_files: delete_files.clone(),
    created_at: Utc::now().to_rfc3339(),
  };
  persist_plan(task_root, &plan)?;
  Ok(PackageSwitchSummary {
    plan_id: plan.plan_id,
    installation_id: plan.installation_id,
    source_scheme,
    target_scheme,
    source_channel,
    source_sub_channel,
    target_channel,
    target_sub_channel,
    sdk_required: target_sdk.is_some(),
    sdk_version: target_sdk.as_ref().map(|package| package.version.clone()),
    download_bytes,
    install_bytes,
    cache_hit_bytes,
    delete_count: delete_files.len(),
    delete_files,
    required_free_bytes,
    available_free_bytes,
    has_sufficient_space: available_free_bytes >= required_free_bytes,
  })
}

/// 按 plan_id 读取已固化的换服评估计划。
///
/// 优先读任务目录中与 journal 绑定的副本，避免安装级 `switch/<id>/plan.json`
/// 被重新评估覆盖后无法恢复或放弃旧任务。
pub(crate) fn load_persisted_switch_plan(
  task_root: &Path,
  plan_id: &str,
) -> Result<PersistedSwitchPlan, String> {
  let task_path = task_root.join("tasks").join(plan_id).join("plan.json");
  if task_path.is_file() {
    let plan = load_plan_file(&task_path)?;
    if plan.plan_id == plan_id {
      return Ok(plan);
    }
  }
  let switch_root = task_root.join("switch");
  let entries = match fs::read_dir(&switch_root) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      return Err("未找到换服计划".to_string());
    }
    Err(error) => return Err(format!("读取换服计划目录失败：{error}")),
  };
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取换服计划条目失败：{error}"))?;
    let path = entry.path().join("plan.json");
    if !path.is_file() {
      continue;
    }
    let plan = load_plan_file(&path)?;
    if plan.plan_id == plan_id {
      return Ok(plan);
    }
  }
  Err("未找到换服计划".to_string())
}

/// 换服任务日志绑定的评估计划摘要。
pub(crate) fn switch_plan_digest(plan: &PersistedSwitchPlan) -> Result<String, String> {
  let bytes = serde_json::to_vec(plan).map_err(|error| format!("序列化换服计划失败：{error}"))?;
  Ok(sha256_bytes(&bytes))
}

/// 下载并解压目标渠道 SDK（若有），生成可提交的写前步骤；不会修改游戏目录。
pub(crate) async fn prepare_switch_commit<F>(
  client: &reqwest::Client,
  installation: &GameInstallation,
  plan: &PersistedSwitchPlan,
  task_root: &Path,
  journal: &mut TaskJournal,
  canceled: &AtomicBool,
  started_at: Instant,
  on_progress: &mut F,
) -> Result<SwitchApplyRequest, String>
where
  F: FnMut(&TaskJournal) -> Result<(), String>,
{
  validate_switch_installation(installation, plan)?;
  let packages = target_sdk_packages(plan);
  for (index, package) in packages.iter().enumerate() {
    let label = format!("下载渠道 SDK {}/{}：{}", index + 1, packages.len(), package.version);
    journal.state = super::model::PackageTaskState::Downloading;
    journal.current_file = Some(label.clone());
    journal.download_current_file = Some(label);
    journal.touch();
    on_progress(journal)?;
    let base_downloaded = journal.downloaded_bytes;
    let mut last_emit = Instant::now() - Duration::from_millis(250);
    download_sdk_zip(client, package, task_root, &plan.plan_id, canceled, &mut |bytes| -> Result<
      (),
      String,
    > {
      journal.downloaded_bytes = base_downloaded.saturating_add(bytes).min(journal.total_bytes);
      let elapsed = started_at.elapsed().as_secs_f64().max(0.001);
      journal.bytes_per_second = (journal.downloaded_bytes as f64 / elapsed) as u64;
      let remaining = journal.total_bytes.saturating_sub(journal.downloaded_bytes);
      journal.eta_seconds =
        (journal.bytes_per_second > 0).then_some(remaining / journal.bytes_per_second);
      journal.touch();
      if last_emit.elapsed() >= Duration::from_millis(250) || bytes == package.size {
        on_progress(journal)?;
        last_emit = Instant::now();
      }
      Ok(())
    })
    .await?;
    journal.downloaded_bytes =
      base_downloaded.saturating_add(package.size).min(journal.total_bytes);
    journal.committed_step = (index + 1).min(journal.total_count);
    // 日志校验要求非 Install 任务 committed_step 与 owned_cache_files 长度一致；
    // 下载推进时同步登记已落盘的 SDK 缓存，避免持久化报「字段无效」。
    journal.owned_cache_files =
      packages.iter().take(index + 1).map(|package| package.md5.clone()).collect();
    journal.touch();
    on_progress(journal)?;
  }
  record_switch_cache(journal, task_root, &packages);
  check_canceled(canceled)?;
  journal.state = super::model::PackageTaskState::Assembling;
  journal.current_file = Some("准备渠道文件：解压并校验 SDK".to_string());
  journal.download_current_file = None;
  journal.assembly_current_file = Some("准备渠道文件：解压并校验 SDK".to_string());
  journal.bytes_per_second = 0;
  journal.eta_seconds = None;
  journal.touch();
  on_progress(journal)?;
  let game_root = PathBuf::from(&installation.root_path);
  let staging_root = task_root.join("tasks").join(&plan.plan_id).join("staging");
  if staging_root.exists() {
    fs::remove_dir_all(&staging_root).map_err(|error| format!("清理换服暂存目录失败：{error}"))?;
  }
  fs::create_dir_all(&staging_root).map_err(|error| format!("创建换服暂存目录失败：{error}"))?;
  let mut staged = HashMap::new();
  if let Some(package) = plan.sdk.as_ref() {
    let zip_path = sdk_cache_path(task_root, &package.md5);
    extract_sdk_zip(&zip_path, &staging_root, sdk_decompress_budget(package.decompressed_size))?;
    staged = verify_staged_sdk(&staging_root, package)?;
  }
  journal.current_file = Some("准备渠道文件：生成提交清单".to_string());
  journal.assembly_current_file = Some("准备渠道文件：生成提交清单".to_string());
  journal.touch();
  on_progress(journal)?;
  let mut files = Vec::new();
  let mut seen = HashSet::new();
  for (name, (size, md5)) in &staged {
    check_canceled(canceled)?;
    if !seen.insert(name.clone()) {
      continue;
    }
    match resolve_optional_manifest_file(&game_root, name)? {
      Some(path) => {
        let (source_size, source_md5) = file_size_and_md5(&path)?;
        if source_size == *size && source_md5.eq_ignore_ascii_case(md5) {
          continue;
        }
        files.push(switch_file("modify", name, *size, md5, Some(source_size), Some(source_md5)));
      }
      None => files.push(switch_file("add", name, *size, md5, None, None)),
    }
  }
  for name in &plan.delete_files {
    if seen.contains(name) {
      continue;
    }
    let Some(path) = resolve_optional_manifest_file(&game_root, name)? else {
      continue;
    };
    let (size, md5) = file_size_and_md5(&path)?;
    files.push(switch_file("delete", name, size, &md5, Some(size), Some(md5.clone())));
  }
  files.sort_by(|left, right| left.name.cmp(&right.name));
  let mut commit = PersistedSwitchCommit {
    schema_version: COMMIT_SCHEMA_VERSION,
    plan_id: plan.plan_id.clone(),
    installation_id: plan.installation_id.clone(),
    digest: String::new(),
    target_channel: plan.target_channel,
    target_sub_channel: plan.target_sub_channel,
    files,
  };
  commit.digest = sha256_bytes(
    &serde_json::to_vec(&digest_payload(&commit))
      .map_err(|error| format!("序列化换服提交计划失败：{error}"))?,
  );
  persist_commit(task_root, &commit)?;
  switch_apply_request(&commit)
}

/// 读取已落盘的换服提交步骤，供恢复与回滚使用。
pub(crate) fn load_switch_commit(
  task_root: &Path,
  plan_id: &str,
  installation_id: &str,
) -> Result<SwitchApplyRequest, String> {
  let path = commit_path(task_root, installation_id);
  if !path.is_file() {
    return Err("换服提交步骤尚未生成，请重新执行换服".to_string());
  }
  let metadata = fs::metadata(&path).map_err(|error| format!("读取换服提交计划失败：{error}"))?;
  if metadata.len() == 0 || metadata.len() > MAX_PLAN_BYTES as u64 {
    return Err("换服提交计划大小无效".to_string());
  }
  let bytes = fs::read(&path).map_err(|error| format!("读取换服提交计划失败：{error}"))?;
  let commit: PersistedSwitchCommit =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析换服提交计划失败：{error}"))?;
  if commit.schema_version != COMMIT_SCHEMA_VERSION
    || commit.plan_id != plan_id
    || commit.installation_id != installation_id
  {
    return Err("换服提交计划与任务日志不匹配".to_string());
  }
  switch_apply_request(&commit)
}

/// 创建换服任务日志；已存在时校验身份后复用。
pub(crate) fn load_or_create_switch_journal(
  task_root: &Path,
  plan: &PersistedSwitchPlan,
) -> Result<TaskJournal, String> {
  let digest = switch_plan_digest(plan)?;
  let path = super::journal::journal_path(task_root, &plan.plan_id);
  if path.exists() {
    let journal = super::journal::load(&path)?;
    if journal.plan_id != plan.plan_id
      || journal.installation_id != plan.installation_id
      || journal.operation != "switch"
      || journal.source_scheme != plan.source_scheme
      || journal.target_scheme != plan.target_scheme
      || journal.manifest_digest != digest
    {
      return Err("换服任务日志与评估计划不匹配".to_string());
    }
    persist_task_switch_plan(task_root, plan)?;
    return Ok(journal);
  }
  let packages = target_sdk_packages(plan);
  let journal = TaskJournal::from_switch(
    plan.plan_id.clone(),
    plan.installation_id.clone(),
    plan.source_scheme,
    plan.target_scheme,
    digest,
    packages.iter().map(|package| package.size).sum(),
    packages.len(),
  );
  persist_task_switch_plan(task_root, plan)?;
  super::journal::persist(task_root, &journal)?;
  Ok(journal)
}

fn collect_delete_files(
  game_root: &Path,
  deprecated: &[String],
  inventory_names: &HashSet<String>,
  remove_known_sdk: bool,
) -> Result<Vec<String>, String> {
  let mut delete_files = Vec::new();
  let mut seen = HashSet::new();
  for name in deprecated {
    push_existing_non_inventory(game_root, name, inventory_names, &mut seen, &mut delete_files)?;
  }
  if remove_known_sdk {
    for name in KNOWN_SDK_FILES {
      push_existing_non_inventory(game_root, name, inventory_names, &mut seen, &mut delete_files)?;
    }
  }
  delete_files.sort();
  Ok(delete_files)
}

fn push_existing_non_inventory(
  game_root: &Path,
  name: &str,
  inventory_names: &HashSet<String>,
  seen: &mut HashSet<String>,
  delete_files: &mut Vec<String>,
) -> Result<(), String> {
  if inventory_names.contains(name) || !seen.insert(name.to_string()) {
    return Ok(());
  }
  if resolve_optional_manifest_file(game_root, name)?.is_some() {
    delete_files.push(name.to_string());
  }
  Ok(())
}

fn persisted_sdk(package: &ChannelSdkPackage) -> PersistedSdk {
  PersistedSdk {
    version: package.version.clone(),
    pkg_version_file_name: package.pkg_version_file_name.clone(),
    md5: package.md5.clone(),
    size: package.size,
    decompressed_size: package.decompressed_size,
    url: package.url.clone(),
  }
}

fn sdk_cache_path(task_root: &Path, md5: &str) -> PathBuf {
  task_root.join("cache/sdks").join(md5)
}

fn sdk_cache_hit(task_root: &Path, package: &ChannelSdkPackage) -> u64 {
  let path = sdk_cache_path(task_root, &package.md5);
  let Ok(metadata) = fs::metadata(&path) else {
    return 0;
  };
  if metadata.len() != package.size {
    return 0;
  }
  match file_md5(&path) {
    Ok(digest) if digest.eq_ignore_ascii_case(&package.md5) => package.size,
    _ => 0,
  }
}

fn file_md5(path: &Path) -> Result<String, String> {
  Ok(file_size_and_md5(path)?.1)
}

fn file_size_and_md5(path: &Path) -> Result<(u64, String), String> {
  let metadata = fs::metadata(path).map_err(|error| format!("读取文件状态失败：{error}"))?;
  let mut file = File::open(path).map_err(|error| format!("打开文件失败：{error}"))?;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; 1024 * 1024];
  loop {
    let read = file.read(&mut buffer).map_err(|error| format!("读取文件失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  Ok((metadata.len(), format!("{:x}", hasher.finalize())))
}

fn load_plan_file(path: &Path) -> Result<PersistedSwitchPlan, String> {
  let metadata = fs::metadata(path).map_err(|error| format!("读取换服计划失败：{error}"))?;
  if metadata.len() == 0 || metadata.len() > MAX_PLAN_BYTES as u64 {
    return Err("换服计划大小无效".to_string());
  }
  let bytes = fs::read(path).map_err(|error| format!("读取换服计划失败：{error}"))?;
  let plan: PersistedSwitchPlan =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析换服计划失败：{error}"))?;
  if plan.schema_version != PLAN_SCHEMA_VERSION
    || Uuid::parse_str(&plan.plan_id).is_err()
    || plan.installation_id.is_empty()
  {
    return Err("换服计划字段无效".to_string());
  }
  Ok(plan)
}

fn validate_switch_installation(
  installation: &GameInstallation,
  plan: &PersistedSwitchPlan,
) -> Result<(), String> {
  if installation.id != plan.installation_id {
    return Err("换服计划与当前安装不匹配".to_string());
  }
  if installation.status != InstallationStatus::Known {
    return Err("只有渠道状态一致的安装才能换服".to_string());
  }
  if installation.scheme_id != Some(plan.source_scheme) {
    return Err("游戏渠道已变化，请重新评估换服".to_string());
  }
  if installation.channel != Some(plan.source_channel)
    || installation.sub_channel != Some(plan.source_sub_channel)
  {
    return Err("config.ini 渠道参数已变化，请重新评估换服".to_string());
  }
  Ok(())
}

fn target_sdk_packages(plan: &PersistedSwitchPlan) -> Vec<PersistedSdk> {
  plan.sdk.iter().cloned().collect()
}

fn record_switch_cache(journal: &mut TaskJournal, task_root: &Path, packages: &[PersistedSdk]) {
  let mut owned = Vec::new();
  let mut downloaded = 0_u64;
  for package in packages {
    owned.push(package.md5.clone());
    downloaded =
      downloaded.saturating_add(sdk_cache_hit(task_root, &channel_sdk_from_persisted(package)));
  }
  journal.owned_cache_files = owned;
  journal.committed_step = journal.owned_cache_files.len();
  journal.planned_steps = packages.len();
  journal.total_count = packages.len();
  journal.total_bytes = packages.iter().map(|package| package.size).sum();
  journal.downloaded_bytes = downloaded.min(journal.total_bytes);
}

fn channel_sdk_from_persisted(package: &PersistedSdk) -> ChannelSdkPackage {
  ChannelSdkPackage {
    version: package.version.clone(),
    pkg_version_file_name: package.pkg_version_file_name.clone(),
    md5: package.md5.clone(),
    size: package.size,
    decompressed_size: package.decompressed_size,
    url: package.url.clone(),
  }
}

async fn download_sdk_zip(
  client: &reqwest::Client,
  package: &PersistedSdk,
  task_root: &Path,
  task_id: &str,
  canceled: &AtomicBool,
  on_progress: &mut impl FnMut(u64) -> Result<(), String>,
) -> Result<(), String> {
  let converted = channel_sdk_from_persisted(package);
  if sdk_cache_hit(task_root, &converted) > 0 {
    on_progress(package.size)?;
    return Ok(());
  }
  let cache_root = task_root.join("cache/sdks");
  fs::create_dir_all(&cache_root).map_err(|error| format!("创建渠道 SDK 缓存目录失败：{error}"))?;
  let target = sdk_cache_path(task_root, &package.md5);
  let partial = cache_root.join(format!("{}.part.{task_id}", package.md5));
  let mut last_error = String::new();
  for attempt in 0..MAX_SDK_DOWNLOAD_ATTEMPTS {
    check_canceled(canceled)?;
    match fs::remove_file(&partial) {
      Ok(()) => {}
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
      Err(error) => return Err(format!("清理渠道 SDK 下载临时文件失败：{error}")),
    }
    match download_sdk_once(client, package, &partial, canceled, on_progress).await {
      Ok(()) => {
        let digest = file_md5(&partial)?;
        if !digest.eq_ignore_ascii_case(&package.md5) {
          let _ = fs::remove_file(&partial);
          last_error = "渠道 SDK 下载后 MD5 不匹配".to_string();
        } else {
          fs::rename(&partial, &target)
            .map_err(|error| format!("提交渠道 SDK 缓存失败：{error}"))?;
          if sdk_cache_hit(task_root, &converted) == 0 {
            let _ = fs::remove_file(&target);
            return Err("渠道 SDK 缓存完整性复验失败".to_string());
          }
          return Ok(());
        }
      }
      Err(error) => last_error = error,
    }
    if attempt + 1 < MAX_SDK_DOWNLOAD_ATTEMPTS {
      tokio::time::sleep(std::time::Duration::from_millis((1_u64 << attempt) * 500)).await;
    }
  }
  let _ = fs::remove_file(&partial);
  Err(format!("渠道 SDK 下载重试后仍失败：{last_error}"))
}

async fn download_sdk_once(
  client: &reqwest::Client,
  package: &PersistedSdk,
  partial: &Path,
  canceled: &AtomicBool,
  on_progress: &mut impl FnMut(u64) -> Result<(), String>,
) -> Result<(), String> {
  let response =
    client.get(&package.url).send().await.map_err(|error| network_error("下载渠道 SDK", &error))?;
  if !response.status().is_success() {
    return Err(format!("下载渠道 SDK 失败：HTTP {}", response.status().as_u16()));
  }
  if response.content_length().is_some_and(|length| length != package.size) {
    return Err("渠道 SDK 响应长度与计划不一致".to_string());
  }
  let mut file = tokio::fs::OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(partial)
    .await
    .map_err(|error| format!("创建渠道 SDK 下载临时文件失败：{error}"))?;
  let mut stream = response.bytes_stream();
  let mut bytes = 0_u64;
  while let Some(chunk) =
    stream.try_next().await.map_err(|error| network_error("读取渠道 SDK", &error))?
  {
    check_canceled(canceled)?;
    bytes = bytes.checked_add(chunk.len() as u64).ok_or_else(|| "渠道 SDK 大小溢出".to_string())?;
    if bytes > package.size {
      return Err("渠道 SDK 超过计划大小".to_string());
    }
    file.write_all(&chunk).await.map_err(|error| format!("写入渠道 SDK 临时文件失败：{error}"))?;
    on_progress(bytes)?;
  }
  if bytes != package.size {
    return Err("渠道 SDK 下载大小与计划不一致".to_string());
  }
  file.flush().await.map_err(|error| format!("刷新渠道 SDK 临时文件失败：{error}"))?;
  Ok(())
}

fn sdk_decompress_budget(declared: u64) -> u64 {
  declared.saturating_mul(2).min(MAX_SDK_DECOMPRESSED_BYTES)
}

fn extract_sdk_zip(
  zip_path: &Path,
  staging_root: &Path,
  max_decompressed: u64,
) -> Result<(), String> {
  let file = File::open(zip_path).map_err(|error| format!("打开渠道 SDK 压缩包失败：{error}"))?;
  let mut archive =
    ZipArchive::new(file).map_err(|error| format!("解析渠道 SDK 压缩包失败：{error}"))?;
  if archive.len() > MAX_SDK_ZIP_ENTRIES {
    return Err("渠道 SDK 压缩包条目数超过安全上限".to_string());
  }
  let mut total = 0_u64;
  for index in 0..archive.len() {
    let mut entry =
      archive.by_index(index).map_err(|error| format!("读取渠道 SDK 压缩条目失败：{error}"))?;
    if entry.is_dir() {
      continue;
    }
    if entry.encrypted() {
      return Err("渠道 SDK 压缩包不能包含加密条目".to_string());
    }
    let name = normalize_manifest_path(entry.name())?;
    let size = entry.size();
    total = total.checked_add(size).ok_or_else(|| "渠道 SDK 解压大小溢出".to_string())?;
    if total > max_decompressed {
      return Err("渠道 SDK 解压大小超过安全上限".to_string());
    }
    let target = prepare_manifest_output_file(staging_root, &name)?;
    if let Some(parent) = target.parent() {
      fs::create_dir_all(parent).map_err(|error| format!("创建渠道 SDK 解压目录失败：{error}"))?;
    }
    let mut output = OpenOptions::new()
      .create_new(true)
      .write(true)
      .open(&target)
      .map_err(|error| format!("创建渠道 SDK 解压文件失败：{error}"))?;
    std::io::copy(&mut entry, &mut output)
      .map_err(|error| format!("解压渠道 SDK 文件失败：{error}"))?;
    output.sync_all().map_err(|error| format!("同步渠道 SDK 解压文件失败：{error}"))?;
  }
  Ok(())
}

fn verify_staged_sdk(
  staging_root: &Path,
  package: &PersistedSdk,
) -> Result<HashMap<String, (u64, String)>, String> {
  let pkg_path = staging_root.join(&package.pkg_version_file_name);
  if !pkg_path.is_file() {
    return Err("渠道 SDK 缺少 sdk_pkg_version".to_string());
  }
  let metadata =
    fs::metadata(&pkg_path).map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  if metadata.len() == 0 || metadata.len() > MAX_SDK_PKG_VERSION_BYTES {
    return Err("sdk_pkg_version 大小无效".to_string());
  }
  let text =
    fs::read_to_string(&pkg_path).map_err(|error| format!("读取 sdk_pkg_version 失败：{error}"))?;
  let mut expected = HashMap::new();
  for line in text.lines() {
    let line = line.trim();
    if line.is_empty() {
      continue;
    }
    let item: SdkPkgVersionItem =
      serde_json::from_str(line).map_err(|error| format!("解析 sdk_pkg_version 失败：{error}"))?;
    let name = normalize_manifest_path(&item.remote_name)?;
    if item.md5.len() != 32 || !item.md5.bytes().all(|byte| byte.is_ascii_hexdigit()) {
      return Err(format!("sdk_pkg_version 包含无效 MD5：{name}"));
    }
    if expected.insert(name.clone(), (item.file_size, item.md5.to_ascii_lowercase())).is_some() {
      return Err(format!("sdk_pkg_version 包含重复路径：{name}"));
    }
    if expected.len() > MAX_SDK_PKG_VERSION_FILES {
      return Err("sdk_pkg_version 文件数量超过安全上限".to_string());
    }
    let Some(path) = resolve_optional_manifest_file(staging_root, &name)? else {
      return Err(format!("渠道 SDK 缺少清单文件：{name}"));
    };
    let (size, md5) = file_size_and_md5(&path)?;
    if size != item.file_size || !md5.eq_ignore_ascii_case(&item.md5) {
      return Err(format!("渠道 SDK 文件与 sdk_pkg_version 不一致：{name}"));
    }
  }
  if expected.is_empty() {
    return Err("sdk_pkg_version 没有可安装文件".to_string());
  }
  let mut staged = expected;
  let pkg_name = normalize_manifest_path(&package.pkg_version_file_name)?;
  if !staged.contains_key(&pkg_name) {
    staged.insert(pkg_name, file_size_and_md5(&pkg_path)?);
  }
  Ok(staged)
}

fn switch_file(
  kind: &str,
  name: &str,
  size: u64,
  md5: &str,
  source_size: Option<u64>,
  source_md5: Option<String>,
) -> PersistedSwitchFile {
  PersistedSwitchFile {
    kind: kind.to_string(),
    name: name.to_string(),
    size,
    md5: md5.to_ascii_lowercase(),
    source_size,
    source_md5: source_md5.map(|value| value.to_ascii_lowercase()),
  }
}

fn digest_payload(commit: &PersistedSwitchCommit) -> PersistedSwitchCommit {
  let mut payload = commit.clone();
  payload.digest.clear();
  payload
}

fn persist_commit(task_root: &Path, commit: &PersistedSwitchCommit) -> Result<(), String> {
  let directory = task_root.join("switch").join(&commit.installation_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建换服提交目录失败：{error}"))?;
  let content = serde_json::to_vec_pretty(commit)
    .map_err(|error| format!("序列化换服提交计划失败：{error}"))?;
  if content.is_empty() || content.len() > MAX_PLAN_BYTES {
    return Err("换服提交计划大小无效".to_string());
  }
  let target = commit_path(task_root, &commit.installation_id);
  let temporary = directory.join("commit.json.tmp");
  match fs::remove_file(&temporary) {
    Ok(()) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("清理旧换服提交计划失败：{error}")),
  }
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建换服提交计划临时文件失败：{error}"))?;
  file
    .write_all(&content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入换服提交计划失败：{error}"))?;
  drop(file);
  atomic_replace(&temporary, &target)
}

fn commit_path(task_root: &Path, installation_id: &str) -> PathBuf {
  task_root.join("switch").join(installation_id).join("commit.json")
}

fn switch_apply_request(commit: &PersistedSwitchCommit) -> Result<SwitchApplyRequest, String> {
  let mut files = Vec::with_capacity(commit.files.len());
  for file in &commit.files {
    let kind = match file.kind.as_str() {
      "add" => CommitStepKind::Add,
      "modify" => CommitStepKind::Modify,
      "delete" => CommitStepKind::Delete,
      _ => return Err(format!("换服提交包含未知步骤：{}", file.name)),
    };
    files.push(SwitchFileStep {
      kind,
      name: file.name.clone(),
      size: file.size,
      md5: file.md5.clone(),
      source_size: file.source_size,
      source_md5: file.source_md5.clone(),
    });
  }
  Ok(SwitchApplyRequest {
    plan_id: commit.plan_id.clone(),
    digest: commit.digest.clone(),
    target_channel: commit.target_channel,
    target_sub_channel: commit.target_sub_channel,
    files,
  })
}

fn sha256_bytes(content: &[u8]) -> String {
  let mut hasher = <Sha256 as Sha2Digest>::new();
  hasher.update(content);
  format!("{:x}", hasher.finalize())
}

fn check_canceled(canceled: &AtomicBool) -> Result<(), String> {
  if canceled.load(Ordering::Acquire) { Err("任务已取消".to_string()) } else { Ok(()) }
}

fn persist_plan(task_root: &Path, plan: &PersistedSwitchPlan) -> Result<(), String> {
  persist_plan_at(&task_root.join("switch").join(&plan.installation_id), plan)?;
  persist_task_switch_plan(task_root, plan)
}

fn persist_task_switch_plan(task_root: &Path, plan: &PersistedSwitchPlan) -> Result<(), String> {
  persist_plan_at(&task_root.join("tasks").join(&plan.plan_id), plan)
}

fn persist_plan_at(directory: &Path, plan: &PersistedSwitchPlan) -> Result<(), String> {
  fs::create_dir_all(directory).map_err(|error| format!("创建换服计划目录失败：{error}"))?;
  let content =
    serde_json::to_vec_pretty(plan).map_err(|error| format!("序列化换服计划失败：{error}"))?;
  if content.is_empty() || content.len() > MAX_PLAN_BYTES {
    return Err("换服计划大小无效".to_string());
  }
  let target = directory.join("plan.json");
  let temporary = directory.join("plan.json.tmp");
  match fs::remove_file(&temporary) {
    Ok(()) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("清理旧换服计划失败：{error}")),
  }
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建换服计划临时文件失败：{error}"))?;
  file
    .write_all(&content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入换服计划失败：{error}"))?;
  drop(file);
  atomic_replace(&temporary, &target)
}

#[cfg(target_os = "windows")]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  use std::os::windows::ffi::OsStrExt;
  use std::thread;
  use windows_sys::Win32::Storage::FileSystem::{
    MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
  };

  // 目标计划/提交文件可能被实时扫描/索引进程瞬时占用（ERROR_ACCESS_DENIED）
  // 或带只读属性；先清理只读，再对可重试错误短暂重试。
  clear_readonly_attribute(target).map_err(|error| format!("清除换服文件只读属性失败：{error}"))?;

  let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let mut last_error = None;
  for attempt in 0..ATOMIC_REPLACE_RETRIES {
    let result = unsafe {
      MoveFileExW(
        source.as_ptr(),
        target.as_ptr(),
        MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
      )
    };
    if result != 0 {
      return Ok(());
    }
    let error = std::io::Error::last_os_error();
    last_error = Some(error);
    let retriable =
      last_error.as_ref().is_some_and(|error| matches!(error.raw_os_error(), Some(5 | 32)));
    if !retriable || attempt + 1 >= ATOMIC_REPLACE_RETRIES {
      break;
    }
    thread::sleep(ATOMIC_REPLACE_RETRY_INTERVAL);
  }
  let message =
    last_error.map(|error| error.to_string()).unwrap_or_else(|| "未知系统错误".to_string());
  Err(format!("提交换服计划失败：{message}"))
}

#[cfg(target_os = "windows")]
fn clear_readonly_attribute(path: &Path) -> std::io::Result<()> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    FILE_ATTRIBUTE_READONLY, GetFileAttributesW, SetFileAttributesW,
  };

  let wide = path.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
  if attributes == u32::MAX {
    let error = std::io::Error::last_os_error();
    return if error.kind() == std::io::ErrorKind::NotFound { Ok(()) } else { Err(error) };
  }
  if attributes & FILE_ATTRIBUTE_READONLY != 0 {
    let result =
      unsafe { SetFileAttributesW(wide.as_ptr(), attributes & !FILE_ATTRIBUTE_READONLY) };
    if result == 0 {
      return Err(std::io::Error::last_os_error());
    }
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("提交换服计划失败：{error}"))
}
