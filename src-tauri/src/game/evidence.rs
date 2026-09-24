//! 游戏安装文件的校验证据与持久化逻辑。
//! @since Beta v0.12.4

use super::{
  installer::{directory_identity, path_occupied},
  model::PackagePlanTarget,
  path_guard::{
    normalize_manifest_path, prepare_manifest_output_file, resolve_optional_manifest_file,
  },
  planner::{PersistedPlan, PlanAsset},
};
use md5::Digest as Md5Digest;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::{
  collections::{BTreeMap, HashSet},
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::atomic::{AtomicBool, Ordering},
  time::UNIX_EPOCH,
};

pub(crate) const EVIDENCE_SCHEMA_VERSION: u32 = 1;
const MAX_EVIDENCE_FILE_BYTES: u64 = 256 * 1024;
const TARGET_EVIDENCE_SCHEMA_VERSION: u32 = 1;

/// One verified file in the staging tree.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FileEvidence {
  pub(crate) schema_version: u32,
  pub(crate) plan_id: String,
  pub(crate) manifest_digest: String,
  /// Canonical relative path inside the staging tree (always `/` separators).
  pub(crate) path: String,
  pub(crate) expected_size: u64,
  pub(crate) expected_md5: String,
  pub(crate) actual_size: u64,
  pub(crate) actual_md5: String,
  pub(crate) staging_volume_serial: u64,
  pub(crate) staging_file_id: u64,
  pub(crate) file_volume_serial: u64,
  pub(crate) file_file_id: u64,
  /// File metadata last-write-time in nanoseconds since the Unix epoch.
  pub(crate) last_write_time_ns: u64,
}

/// 游戏目录中已存在目标文件的元数据快照。
///
/// 该类型故意不暴露字段：调用方只能把由 [`snapshot_target_file`] 返回的快照交给
/// [`persist_target_evidence_from_hash`]，不能伪造路径或文件身份。
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct TargetFileSnapshot {
  path: PathBuf,
  relative_path: String,
  target_volume_serial: u64,
  target_file_id: u64,
  file_identity: Option<(u64, u64)>,
  size: u64,
  last_write_time_ns: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct TargetFileEvidence {
  schema_version: u32,
  plan_identity_sha256: String,
  plan_id: String,
  installation_id: String,
  manifest_digest: String,
  asset_index: usize,
  path: String,
  expected_size: u64,
  expected_md5: String,
  actual_size: u64,
  actual_md5: String,
  target_volume_serial: u64,
  target_file_id: u64,
  file_volume_serial: Option<u64>,
  file_file_id: Option<u64>,
  last_write_time_ns: u64,
}

/// 证据目录：`<task_root>/tasks/<plan_id>/install-evidence`。
pub(crate) fn evidence_dir(task_root: &Path, plan_id: &str) -> PathBuf {
  task_root.join("tasks").join(plan_id).join("install-evidence")
}

/// 构造主资源证据文件的路径。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `dir`: 证据目录。
/// - `index`: 资源游标。
///
/// # 返回
/// 主资源证据文件路径。
fn asset_evidence_path(dir: &Path, index: usize) -> PathBuf {
  dir.join(format!("a-{index:06}.json"))
}

/// 构造附加文件证据文件的路径（按路径 SHA-256 前缀命名）。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `dir`: 证据目录。
/// - `path`: 附加文件的规范相对路径。
///
/// # 返回
/// 附加文件证据文件路径。
fn additional_evidence_path(dir: &Path, path: &str) -> PathBuf {
  let mut hasher = Sha256::new();
  hasher.update(path.as_bytes());
  let digest = hasher.finalize();
  let mut name = String::with_capacity(2 + 32);
  name.push_str("f-");
  for byte in digest.iter().take(16) {
    name.push_str(&format!("{byte:02x}"));
  }
  name.push_str(".json");
  dir.join(name)
}

/// 采集并持久化一个主资源的逐文件证据。
///
/// 调用方必须保证 `actual_md5` 已在组装/复检中与 `asset.md5` 核对一致；本函数只做身份与
/// 元数据采集，不重新读取文件内容。
pub(crate) fn capture_and_persist_asset_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  asset_index: usize,
  staging_root: &Path,
) -> Result<FileEvidence, String> {
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let output = prepare_manifest_output_file(staging_root, &asset.name)?;
  let metadata = fs::symlink_metadata(&output)
    .map_err(|error| format!("读取组装资源证据失败：{}：{error}", asset.name))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err(format!("组装资源证据不是普通文件：{}", asset.name));
  }
  if metadata.len() != asset.size {
    return Err(format!("组装资源证据长度不符：{}", asset.name));
  }
  let evidence =
    capture_evidence(plan, &asset.name, asset.size, &asset.md5, staging_root, &output, &metadata)?;
  persist_evidence(task_root, plan, asset_index, &evidence)?;
  Ok(evidence)
}

/// 采集并持久化附加文件（config.ini、SDK 解压文件）的逐文件证据。
pub(crate) fn capture_and_persist_additional_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  staging_root: &Path,
  path: &str,
  size: u64,
  md5: &str,
) -> Result<FileEvidence, String> {
  let canonical = super::path_guard::normalize_manifest_path(path)?;
  let output = prepare_manifest_output_file(staging_root, &canonical)?;
  let metadata = fs::symlink_metadata(&output)
    .map_err(|error| format!("读取附加文件证据失败：{}：{error}", canonical))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err(format!("附加文件证据不是普通文件：{canonical}"));
  }
  if metadata.len() != size {
    return Err(format!("附加文件证据长度不符：{canonical}"));
  }
  let evidence = capture_evidence(plan, &canonical, size, md5, staging_root, &output, &metadata)?;
  persist_additional_evidence(task_root, plan, &evidence)?;
  Ok(evidence)
}

/// 采集单条文件的身份与元数据证据，不读取文件内容。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `plan`: 当前资源计划。
/// - `canonical_path`: 规范相对路径。
/// - `expected_size`: 预期字节数。
/// - `expected_md5`: 预期 MD5。
/// - `staging_root`: staging 根目录。
/// - `output`: 实际输出文件路径。
/// - `metadata`: 文件元数据。
///
/// # 返回
/// - `Ok(FileEvidence)`: 采集到的证据。
/// - `Err(String)`: 读取身份或时间失败的错误描述。
fn capture_evidence(
  plan: &PersistedPlan,
  canonical_path: &str,
  expected_size: u64,
  expected_md5: &str,
  staging_root: &Path,
  output: &Path,
  metadata: &fs::Metadata,
) -> Result<FileEvidence, String> {
  let (staging_volume_serial, staging_file_id) =
    directory_identity(staging_root).map_err(|error| format!("读取暂存目录身份失败：{error}"))?;
  let (file_volume_serial, file_file_id) = file_identity(output)
    .map_err(|error| format!("读取文件身份失败：{canonical_path}：{error}"))?
    .unwrap_or((0, 0));
  let last_write_time_ns = metadata
    .modified()
    .ok()
    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
    .and_then(|duration| u64::try_from(duration.as_nanos()).ok())
    .ok_or_else(|| format!("读取文件写入时间失败：{canonical_path}"))?;
  Ok(FileEvidence {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    plan_id: plan.plan_id.clone(),
    manifest_digest: plan.manifest_digest.clone(),
    path: canonical_path.to_string(),
    expected_size,
    expected_md5: expected_md5.to_ascii_lowercase(),
    actual_size: metadata.len(),
    actual_md5: expected_md5.to_ascii_lowercase(),
    staging_volume_serial,
    staging_file_id,
    file_volume_serial,
    file_file_id,
    last_write_time_ns,
  })
}

/// 原子写入单条证据；先同步文件，再同步父目录。
fn persist_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  index: usize,
  evidence: &FileEvidence,
) -> Result<(), String> {
  let dir = evidence_dir(task_root, &plan.plan_id);
  let path = asset_evidence_path(&dir, index);
  atomic_write_synced(&path, evidence)?;
  Ok(())
}

/// 持久化附加文件证据。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `task_root`: 任务根目录。
/// - `plan`: 当前资源计划。
/// - `evidence`: 待写入的证据。
///
/// # 返回
/// - `Ok(())`: 证据已写入。
/// - `Err(String)`: 写入失败的错误描述。
fn persist_additional_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  evidence: &FileEvidence,
) -> Result<(), String> {
  let dir = evidence_dir(task_root, &plan.plan_id);
  let path = additional_evidence_path(&dir, &evidence.path);
  atomic_write_synced(&path, evidence)?;
  Ok(())
}

/// 通过临时文件加原子重命名写入证据，并同步文件与目录。
///
/// @since Beta v0.12.4
///
/// # 参数
/// - `path`: 目标证据文件路径。
/// - `evidence`: 待写入的证据。
///
/// # 返回
/// - `Ok(())`: 写入成功。
/// - `Err(String)`: 创建、写入或重命名失败的错误描述。
fn atomic_write_synced<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
  let parent = path.parent().ok_or_else(|| "证据路径缺少父目录".to_string())?;
  fs::create_dir_all(parent).map_err(|error| format!("创建证据目录失败：{error}"))?;
  let bytes = serde_json::to_vec(value).map_err(|error| format!("序列化证据失败：{error}"))?;
  if bytes.len() as u64 > MAX_EVIDENCE_FILE_BYTES {
    return Err("证据文件超过大小上限".to_string());
  }
  let temporary = parent.join(format!(
    ".{}.tmp-{}",
    path.file_name().unwrap_or_default().to_string_lossy(),
    uuid::Uuid::new_v4()
  ));
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建证据临时文件失败：{error}"))?;
  let result = (|| -> Result<(), String> {
    file.write_all(&bytes).map_err(|error| format!("写入证据临时文件失败：{error}"))?;
    file.sync_all().map_err(|error| format!("同步证据临时文件失败：{error}"))?;
    drop(file);
    fs::rename(&temporary, path).map_err(|error| format!("提交证据文件失败：{error}"))?;
    sync_directory(parent)?;
    Ok(())
  })();
  if result.is_err() {
    let _ = fs::remove_file(&temporary);
  }
  result
}

/// 同步证据目录；Windows 下无需额外操作。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `directory`: 待同步的目录。
///
/// # 返回
/// - `Ok(())`: 同步成功。
/// - `Err(String)`: 同步失败的错误描述（非 Windows）。
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
      .map_err(|error| format!("同步证据目录失败：{error}"))
  }
}

/// 读取主资源游标处的单条证据；不存在时返回 `Ok(None)`。
pub(crate) fn load_asset_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  index: usize,
) -> Result<Option<FileEvidence>, String> {
  let path = asset_evidence_path(&evidence_dir(task_root, &plan.plan_id), index);
  load_evidence_file(&path)
}

/// 提交后复验：计划与证据一致，且目标目录里仍是同一文件身份（不读内容）。
///
/// 同盘 rename 后 FileId 不变；对不上时由调用方回退整文件哈希。
pub(crate) fn published_asset_matches_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  index: usize,
  published_root: &Path,
) -> bool {
  let Some(asset) = plan.assets.get(index) else {
    return false;
  };
  let Ok(Some(evidence)) = load_asset_evidence(task_root, plan, index) else {
    return false;
  };
  evidence.plan_id == plan.plan_id
    && evidence.manifest_digest == plan.manifest_digest
    && evidence.path == asset.name
    && evidence.expected_size == asset.size
    && evidence.expected_md5.eq_ignore_ascii_case(&asset.md5)
    && evidence.actual_size == asset.size
    && evidence.actual_md5.eq_ignore_ascii_case(&asset.md5)
    && file_matches_evidence(published_root, &evidence).unwrap_or(false)
}

/// 删除一个主资源的证据，使后续恢复和进度重建不再把该资源视为已完成。
pub(crate) fn invalidate_asset_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  index: usize,
) -> Result<(), String> {
  if index >= plan.assets.len() {
    return Err("安装资源游标越界".to_string());
  }
  let dir = evidence_dir(task_root, &plan.plan_id);
  let path = asset_evidence_path(&dir, index);
  let metadata = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
    Err(error) => return Err(format!("读取待失效证据失败：{error}")),
  };
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("待失效证据不是安全的普通文件".to_string());
  }
  fs::remove_file(&path).map_err(|error| format!("删除失效证据失败：{error}"))?;
  sync_directory(&dir)
}

/// 返回当前仍与计划、暂存目录身份和文件元数据一致的主资源索引。
pub(crate) fn trusted_asset_indices(
  task_root: &Path,
  plan: &PersistedPlan,
  staging_root: &Path,
) -> Result<HashSet<usize>, String> {
  let staging_identity = directory_identity(staging_root)?;
  if plan.assets.is_empty() {
    return Ok(HashSet::new());
  }
  let available = std::thread::available_parallelism().map_or(1, |value| value.get());
  let worker_count = available.max(1).min(plan.assets.len());
  let chunk_size = plan.assets.len().div_ceil(worker_count);
  std::thread::scope(|scope| {
    let handles = plan
      .assets
      .chunks(chunk_size)
      .enumerate()
      .map(|(chunk_index, chunk)| {
        scope.spawn(move || {
          let mut trusted = Vec::new();
          for (offset, asset) in chunk.iter().enumerate() {
            let index = chunk_index * chunk_size + offset;
            if asset_evidence_matches(
              task_root,
              plan,
              staging_root,
              &staging_identity,
              index,
              asset,
            ) {
              trusted.push(index);
            }
          }
          trusted
        })
      })
      .collect::<Vec<_>>();
    let mut trusted = HashSet::new();
    for handle in handles {
      let result = handle.join().map_err(|_| "资源证据核对线程异常退出".to_string())?;
      trusted.extend(result);
    }
    Ok::<_, String>(trusted)
  })
}

/// 单条主资源证据复验：计划身份、文件元数据与暂存目录身份均一致才算可信。
fn asset_evidence_matches(
  task_root: &Path,
  plan: &PersistedPlan,
  staging_root: &Path,
  staging_identity: &(u64, u64),
  index: usize,
  asset: &PlanAsset,
) -> bool {
  let Ok(Some(evidence)) = load_asset_evidence(task_root, plan, index) else {
    return false;
  };
  evidence.plan_id == plan.plan_id
    && evidence.manifest_digest == plan.manifest_digest
    && evidence.path == asset.name
    && evidence.expected_size == asset.size
    && evidence.expected_md5.eq_ignore_ascii_case(&asset.md5)
    && evidence.actual_size == asset.size
    && evidence.actual_md5.eq_ignore_ascii_case(&asset.md5)
    && evidence.staging_volume_serial == staging_identity.0
    && evidence.staging_file_id == staging_identity.1
    && file_matches_evidence(staging_root, &evidence).unwrap_or(false)
}

/// 读取单条证据文件，不存在时返回 `None`。
///
/// @since Beta v0.12.1
///
/// # 参数
/// - `path`: 证据文件路径。
///
/// # 返回
/// - `Ok(Some(FileEvidence))`: 证据有效。
/// - `Ok(None)`: 文件不存在。
/// - `Err(String)`: 文件结构或大小非法的错误描述。
fn load_evidence_file(path: &Path) -> Result<Option<FileEvidence>, String> {
  if !path_occupied(path)? {
    return Ok(None);
  }
  let metadata =
    fs::symlink_metadata(path).map_err(|error| format!("读取证据状态失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("证据文件不是安全的普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_EVIDENCE_FILE_BYTES {
    return Err("证据文件大小无效".to_string());
  }
  let bytes = fs::read(path).map_err(|error| format!("读取证据文件失败：{error}"))?;
  let evidence: FileEvidence =
    serde_json::from_slice(&bytes).map_err(|error| format!("解析证据文件失败：{error}"))?;
  if evidence.schema_version != EVIDENCE_SCHEMA_VERSION {
    return Err(format!("证据 schema 版本不受支持：{}", evidence.schema_version));
  }
  Ok(Some(evidence))
}

/// 读取证据目录中的全部证据，按规范相对路径排序返回。
///
/// 无法解析、schema 失配或身份失配的单条证据按“缺失”处理（调用方回退内容校验），
/// 不阻塞安装；证据整体摘要仍用于 marker 绑定与发布后复验。
pub(crate) fn load_evidence_set(
  task_root: &Path,
  plan: &PersistedPlan,
) -> Result<BTreeMap<String, FileEvidence>, String> {
  let dir = evidence_dir(task_root, &plan.plan_id);
  let mut entries = BTreeMap::new();
  let read_dir = match fs::read_dir(&dir) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(entries),
    Err(error) => return Err(format!("读取证据目录失败：{error}")),
  };
  for entry in read_dir {
    let entry = entry.map_err(|error| format!("读取证据目录条目失败：{error}"))?;
    let path = entry.path();
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
      return Err("证据目录包含无法识别的条目".to_string());
    };
    if !name.ends_with(".json") {
      continue;
    }
    let Ok(Some(evidence)) = load_evidence_file(&path) else {
      continue;
    };
    if evidence.plan_id != plan.plan_id || evidence.manifest_digest != plan.manifest_digest {
      continue;
    }
    entries.insert(evidence.path.clone(), evidence);
  }
  Ok(entries)
}

/// 证据集合摘要：按规范路径排序，绑定内容摘要与文件身份。
pub(crate) fn evidence_digest(entries: &BTreeMap<String, FileEvidence>) -> String {
  let mut hasher = Sha256::new();
  for (path, evidence) in entries {
    hasher.update(path.as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.actual_size.to_string().as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.actual_md5.as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.file_volume_serial.to_string().as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.file_file_id.to_string().as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.staging_volume_serial.to_string().as_bytes());
    hasher.update([0_u8]);
    hasher.update(evidence.staging_file_id.to_string().as_bytes());
    hasher.update(b"\n");
  }
  hex::encode(hasher.finalize())
}

/// 判断当前文件是否与证据一致（身份/大小/写入时间），不读取内容。
pub(crate) fn file_matches_evidence(root: &Path, evidence: &FileEvidence) -> Result<bool, String> {
  let path = root.join(&evidence.path);
  let metadata = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
    Err(error) => return Err(format!("读取证据复验文件失败：{}：{error}", evidence.path)),
  };
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Ok(false);
  }
  let last_write_time_ns = metadata
    .modified()
    .ok()
    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
    .and_then(|duration| u64::try_from(duration.as_nanos()).ok());
  let identity = file_identity(&path)?;
  let identity_matches = identity.is_some_and(|(volume_serial, file_id)| {
    volume_serial == evidence.file_volume_serial && file_id == evidence.file_file_id
  });
  Ok(
    metadata.len() == evidence.actual_size
      && last_write_time_ns == Some(evidence.last_write_time_ns)
      && identity_matches,
  )
}

/// 读取文件的 Windows Volume Serial + FileId。
///
/// 非 Windows 平台返回 `Ok(None)`，调用方必须回退到内容校验。
pub(crate) fn file_identity(path: &Path) -> Result<Option<(u64, u64)>, String> {
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
      BY_HANDLE_FILE_INFORMATION, GetFileInformationByHandle,
    };
    let file = File::open(path).map_err(|error| format!("打开文件身份失败：{error}"))?;
    let mut info = std::mem::MaybeUninit::<BY_HANDLE_FILE_INFORMATION>::zeroed();
    let result = unsafe { GetFileInformationByHandle(file.as_raw_handle(), info.as_mut_ptr()) };
    if result == 0 {
      return Err(format!("读取文件身份失败：{}", std::io::Error::last_os_error()));
    }
    let info = unsafe { info.assume_init() };
    let file_id = ((u64::from(info.nFileIndexHigh)) << 32) | u64::from(info.nFileIndexLow);
    Ok(Some((u64::from(info.dwVolumeSerialNumber), file_id)))
  }
  #[cfg(not(target_os = "windows"))]
  {
    let _ = path;
    Ok(None)
  }
}

/// 游戏目录目标证据目录：`<task_root>/tasks/<plan_id>/target-evidence`。
fn target_evidence_dir(task_root: &Path, plan_id: &str) -> PathBuf {
  task_root.join("tasks").join(plan_id).join("target-evidence")
}

/// 构造一个游戏目录目标证据文件路径。
fn target_evidence_path(task_root: &Path, plan: &PersistedPlan, index: usize) -> PathBuf {
  target_evidence_dir(task_root, &plan.plan_id).join(format!("a-{index:06}.json"))
}

/// 目标证据仅允许用于带完整 source-free fallback 的主资源更新。
fn validate_target_evidence_plan(plan: &PersistedPlan) -> Result<(), String> {
  if !matches!(plan.target, PackagePlanTarget::Main) || plan.fallback.is_none() {
    return Err("目标文件证据仅支持带回退计划的主资源更新".to_string());
  }
  if plan.plan_id.is_empty()
    || !plan.plan_id.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
  {
    return Err("资源计划 ID 不是安全的路径组件".to_string());
  }
  let fallback = plan.fallback.as_ref().expect("fallback 已由上方校验");
  if fallback.assets.len() != plan.assets.len() {
    return Err("回退计划资源数量与主计划不一致".to_string());
  }
  Ok(())
}

/// 返回并校验一个资源在计划中的规范相对路径。
fn target_asset_path(asset: &PlanAsset) -> Result<String, String> {
  let normalized = normalize_manifest_path(&asset.name)?;
  if normalized != asset.name {
    return Err(format!("资源路径不是规范相对路径：{}", asset.name));
  }
  Ok(normalized)
}

/// 返回目标文件的写入时间（纳秒）。
fn modified_time_ns(metadata: &fs::Metadata, path: &str) -> Result<u64, String> {
  metadata
    .modified()
    .ok()
    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
    .and_then(|duration| u64::try_from(duration.as_nanos()).ok())
    .ok_or_else(|| format!("读取目标文件写入时间失败：{path}"))
}

/// 读取目录身份，同时拒绝无法绑定的全零身份。
fn target_directory_identity(path: &Path) -> Result<(u64, u64), String> {
  let identity = directory_identity(path)?;
  if identity == (0, 0) {
    return Err("游戏目录身份不可用".to_string());
  }
  Ok(identity)
}

/// 读取文件身份；文件在竞态中消失时按“目标不存在”处理。
fn target_file_identity(path: &Path) -> Result<Option<(u64, u64)>, String> {
  match file_identity(path) {
    Ok(identity) => {
      if identity.is_some_and(|(volume_serial, file_id)| volume_serial == 0 || file_id == 0) {
        return Err("目标文件身份不可用".to_string());
      }
      Ok(identity)
    }
    Err(_error) if !path_occupied(path)? => Ok(None),
    Err(error) => Err(error),
  }
}

/// 仅采集目标文件元数据，不读取文件内容。
///
/// 该快照用于 patch 源哈希已经由组装器计算完成时的证据落盘，因此不能携带任何未经
/// 调用方核对的内容摘要。
pub(crate) fn snapshot_target_file(
  plan: &PersistedPlan,
  asset_index: usize,
  game_root: &Path,
) -> Result<Option<TargetFileSnapshot>, String> {
  validate_target_evidence_plan(plan)?;
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let relative_path = target_asset_path(asset)?;
  let target_identity = target_directory_identity(game_root)?;
  let Some(path) = resolve_optional_manifest_file(game_root, &relative_path)? else {
    return Ok(None);
  };
  let metadata = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取目标文件失败：{relative_path}：{error}")),
  };
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err(format!("目标文件不是安全的普通文件：{relative_path}"));
  }
  if metadata.len() != asset.size {
    return Ok(None);
  }
  let file_identity = target_file_identity(&path)?;
  let metadata_after_identity = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取目标文件失败：{relative_path}：{error}")),
  };
  if metadata_after_identity.file_type().is_symlink() || !metadata_after_identity.is_file() {
    return Err(format!("目标文件不是安全的普通文件：{relative_path}"));
  }
  if metadata_after_identity.len() != asset.size {
    return Ok(None);
  }
  let last_write_time_ns = modified_time_ns(&metadata_after_identity, &relative_path)?;
  let current_target_identity = target_directory_identity(game_root)?;
  if current_target_identity != target_identity {
    return Err("采集目标文件时游戏目录身份发生变化".to_string());
  }
  Ok(Some(TargetFileSnapshot {
    path,
    relative_path,
    target_volume_serial: target_identity.0,
    target_file_id: target_identity.1,
    file_identity,
    size: metadata_after_identity.len(),
    last_write_time_ns,
  }))
}

/// 计算目标文件的真实 MD5；文件在读取期间缺失、长度变化或提前 EOF 时返回 `None`。
fn hash_target_file(
  snapshot: &TargetFileSnapshot,
  canceled: &AtomicBool,
) -> Result<Option<String>, String> {
  if canceled.load(Ordering::Acquire) {
    return Err("目标文件校验已取消".to_string());
  }
  let mut file = match File::open(&snapshot.path) {
    Ok(file) => file,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取目标文件内容失败：{}：{error}", snapshot.relative_path)),
  };
  let mut remaining = snapshot.size;
  let mut hasher = md5::Md5::new();
  let mut buffer = vec![0_u8; 128 * 1024];
  while remaining > 0 {
    if canceled.load(Ordering::Acquire) {
      return Err("目标文件校验已取消".to_string());
    }
    let maximum = usize::try_from(remaining.min(buffer.len() as u64))
      .map_err(|_| "目标文件大小无法表示".to_string())?;
    let read = file
      .read(&mut buffer[..maximum])
      .map_err(|error| format!("读取目标文件内容失败：{}：{error}", snapshot.relative_path))?;
    if read == 0 {
      return Ok(None);
    }
    hasher.update(&buffer[..read]);
    remaining -= read as u64;
  }
  let mut extra = [0_u8; 1];
  let extra_read = file
    .read(&mut extra)
    .map_err(|error| format!("复核目标文件长度失败：{}：{error}", snapshot.relative_path))?;
  if extra_read != 0 {
    return Ok(None);
  }
  Ok(Some(hex::encode(hasher.finalize())))
}

/// 校验两个目标快照是否描述同一个文件状态。
fn same_target_snapshot(left: &TargetFileSnapshot, right: &TargetFileSnapshot) -> bool {
  left == right
}

/// 校验目标证据中绑定的计划、资源与文件身份。
fn target_evidence_matches_plan(
  plan: &PersistedPlan,
  index: usize,
  evidence: &TargetFileEvidence,
  plan_identity_sha256: &str,
) -> bool {
  let Some(asset) = plan.assets.get(index) else {
    return false;
  };
  target_asset_path(asset).ok().is_some_and(|path| {
    evidence.schema_version == TARGET_EVIDENCE_SCHEMA_VERSION
      && evidence.plan_identity_sha256.eq_ignore_ascii_case(plan_identity_sha256)
      && evidence.plan_id == plan.plan_id
      && evidence.installation_id == plan.installation_id
      && evidence.manifest_digest == plan.manifest_digest
      && evidence.asset_index == index
      && evidence.path == path
      && evidence.expected_size == asset.size
      && evidence.expected_md5.eq_ignore_ascii_case(&asset.md5)
      && evidence.actual_size == asset.size
      && evidence.actual_md5.eq_ignore_ascii_case(&asset.md5)
      && evidence.file_volume_serial.is_some() == evidence.file_file_id.is_some()
      && evidence
        .file_volume_serial
        .zip(evidence.file_file_id)
        .is_none_or(|(volume_serial, file_id)| volume_serial != 0 && file_id != 0)
  })
}

/// 校验目标快照与证据中的元数据和身份是否一致。
fn target_snapshot_matches_evidence(
  snapshot: &TargetFileSnapshot,
  evidence: &TargetFileEvidence,
) -> bool {
  snapshot.relative_path == evidence.path
    && snapshot.size == evidence.actual_size
    && snapshot.target_volume_serial == evidence.target_volume_serial
    && snapshot.target_file_id == evidence.target_file_id
    && snapshot.last_write_time_ns == evidence.last_write_time_ns
    && snapshot.file_identity.map(|(volume_serial, _)| volume_serial) == evidence.file_volume_serial
    && snapshot.file_identity.map(|(_, file_id)| file_id) == evidence.file_file_id
}

/// 读取一条游戏目录目标证据；缺失或格式不受信任时按“无证据”处理。
fn load_target_evidence_path(path: &Path) -> Result<Option<TargetFileEvidence>, String> {
  if !path_occupied(&path)? {
    return Ok(None);
  }
  let metadata =
    fs::symlink_metadata(&path).map_err(|error| format!("读取目标证据状态失败：{error}"))?;
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("目标证据文件不是安全的普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_EVIDENCE_FILE_BYTES {
    return Ok(None);
  }
  let bytes = fs::read(&path).map_err(|error| format!("读取目标证据文件失败：{error}"))?;
  let evidence = match serde_json::from_slice::<TargetFileEvidence>(&bytes) {
    Ok(evidence) => evidence,
    Err(_) => return Ok(None),
  };
  if evidence.schema_version != TARGET_EVIDENCE_SCHEMA_VERSION {
    return Ok(None);
  }
  Ok(Some(evidence))
}

/// 使用真实目标内容校验已有目标证据；已有证据永远不能只凭元数据恢复。
fn target_evidence_matches_loaded(
  plan: &PersistedPlan,
  asset_index: usize,
  game_root: &Path,
  evidence: &TargetFileEvidence,
  plan_identity_sha256: &str,
  canceled: &AtomicBool,
) -> Result<bool, String> {
  if !target_evidence_matches_plan(plan, asset_index, evidence, plan_identity_sha256) {
    return Ok(false);
  }
  let Some(snapshot) = snapshot_target_file(plan, asset_index, game_root)? else {
    return Ok(false);
  };
  if !target_snapshot_matches_evidence(&snapshot, evidence) {
    return Ok(false);
  }
  let Some(actual_md5) = hash_target_file(&snapshot, canceled)? else {
    return Ok(false);
  };
  if !actual_md5.eq_ignore_ascii_case(&evidence.expected_md5) {
    return Ok(false);
  }
  let Some(after) = snapshot_target_file(plan, asset_index, game_root)? else {
    return Ok(false);
  };
  if !same_target_snapshot(&snapshot, &after) {
    return Ok(false);
  }
  Ok(true)
}

/// 重新读取并校验游戏目录中的目标文件，匹配后才持久化独立证据。
pub(crate) fn verify_and_persist_target_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  asset_index: usize,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<bool, String> {
  validate_target_evidence_plan(plan)?;
  let Some(snapshot) = snapshot_target_file(plan, asset_index, game_root)? else {
    return Ok(false);
  };
  let Some(actual_md5) = hash_target_file(&snapshot, canceled)? else {
    return Ok(false);
  };
  persist_target_evidence_from_hash(task_root, plan, asset_index, game_root, &snapshot, &actual_md5)
}

/// 使用调用方已经真实计算出的目标 MD5 落盘证据；本函数不会重新读取文件内容。
pub(crate) fn persist_target_evidence_from_hash(
  task_root: &Path,
  plan: &PersistedPlan,
  asset_index: usize,
  game_root: &Path,
  snapshot: &TargetFileSnapshot,
  actual_md5: &str,
) -> Result<bool, String> {
  validate_target_evidence_plan(plan)?;
  let asset = plan.assets.get(asset_index).ok_or_else(|| "安装资源游标越界".to_string())?;
  let relative_path = target_asset_path(asset)?;
  if snapshot.relative_path != relative_path
    || snapshot.size != asset.size
    || !actual_md5.eq_ignore_ascii_case(&asset.md5)
  {
    return Ok(false);
  }
  let Some(current) = snapshot_target_file(plan, asset_index, game_root)? else {
    return Ok(false);
  };
  if !same_target_snapshot(snapshot, &current) {
    return Ok(false);
  }
  let evidence = TargetFileEvidence {
    schema_version: TARGET_EVIDENCE_SCHEMA_VERSION,
    plan_identity_sha256: plan_identity_sha256(plan)?,
    plan_id: plan.plan_id.clone(),
    installation_id: plan.installation_id.clone(),
    manifest_digest: plan.manifest_digest.clone(),
    asset_index,
    path: relative_path,
    expected_size: asset.size,
    expected_md5: asset.md5.to_ascii_lowercase(),
    actual_size: snapshot.size,
    actual_md5: asset.md5.to_ascii_lowercase(),
    target_volume_serial: snapshot.target_volume_serial,
    target_file_id: snapshot.target_file_id,
    file_volume_serial: snapshot.file_identity.map(|(volume_serial, _)| volume_serial),
    file_file_id: snapshot.file_identity.map(|(_, file_id)| file_id),
    last_write_time_ns: snapshot.last_write_time_ns,
  };
  atomic_write_synced(&target_evidence_path(task_root, plan, asset_index), &evidence)?;
  Ok(true)
}

/// 删除一个游戏目录目标证据，使后续恢复不再跳过该目标文件。
pub(crate) fn invalidate_target_evidence(
  task_root: &Path,
  plan: &PersistedPlan,
  asset_index: usize,
) -> Result<(), String> {
  validate_target_evidence_plan(plan)?;
  if asset_index >= plan.assets.len() {
    return Err("安装资源游标越界".to_string());
  }
  let path = target_evidence_path(task_root, plan, asset_index);
  let metadata = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
    Err(error) => return Err(format!("读取待失效目标证据失败：{error}")),
  };
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("待失效目标证据不是安全的普通文件".to_string());
  }
  fs::remove_file(&path).map_err(|error| format!("删除失效目标证据失败：{error}"))?;
  if let Some(directory) = path.parent() {
    sync_directory(directory)?;
  }
  Ok(())
}

/// 返回当前仍通过真实内容校验的目标文件索引。
///
/// 只有已经存在目标证据旁路文件的资源才会读取游戏文件内容；没有证据的资源只检查旁路
/// 文件是否存在，不会触发全量游戏目录哈希扫描。
pub(crate) fn trusted_target_asset_indices(
  task_root: &Path,
  plan: &PersistedPlan,
  game_root: &Path,
  canceled: &AtomicBool,
) -> Result<HashSet<usize>, String> {
  if !matches!(plan.target, PackagePlanTarget::Main) || plan.fallback.is_none() {
    return Ok(HashSet::new());
  }
  validate_target_evidence_plan(plan)?;
  let mut candidates = Vec::new();
  let directory = target_evidence_dir(task_root, &plan.plan_id);
  let directory_metadata = match fs::symlink_metadata(&directory) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      return Ok(HashSet::new());
    }
    Err(error) => return Err(format!("读取目标证据目录失败：{error}")),
  };
  if directory_metadata.file_type().is_symlink() || !directory_metadata.is_dir() {
    return Err("目标证据目录不是安全的普通目录".to_string());
  }
  for entry in fs::read_dir(&directory).map_err(|error| format!("读取目标证据目录失败：{error}"))?
  {
    if canceled.load(Ordering::Acquire) {
      return Err("目标文件校验已取消".to_string());
    }
    let entry = entry.map_err(|error| format!("读取目标证据目录条目失败：{error}"))?;
    let path = entry.path();
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
      continue;
    };
    let Some(index) = name
      .strip_prefix("a-")
      .and_then(|value| value.strip_suffix(".json"))
      .and_then(|value| value.parse::<usize>().ok())
    else {
      continue;
    };
    if index >= plan.assets.len() || name != format!("a-{index:06}.json") {
      continue;
    }
    if let Some(evidence) = load_target_evidence_path(&path)? {
      candidates.push((index, evidence));
    }
  }
  if candidates.is_empty() {
    return Ok(HashSet::new());
  }
  let plan_identity_sha256 = plan_identity_sha256(plan)?;
  let available = std::thread::available_parallelism().map_or(1, |value| value.get());
  // 这里会读取整文件，不能照搬只做元数据检查的 staging 证据并发数。
  let worker_count = available.clamp(1, 4).min(candidates.len());
  let chunk_size = candidates.len().div_ceil(worker_count);
  std::thread::scope(|scope| {
    let handles = candidates.chunks(chunk_size).map(|chunk| {
      let plan_identity_sha256 = &plan_identity_sha256;
      scope.spawn(move || {
        let mut trusted = Vec::new();
        for (index, evidence) in chunk {
          if target_evidence_matches_loaded(
            plan,
            *index,
            game_root,
            evidence,
            &plan_identity_sha256,
            canceled,
          )? {
            trusted.push(*index);
          }
        }
        Ok::<_, String>(trusted)
      })
    });
    let mut handles = handles.collect::<Vec<_>>();
    let mut trusted = HashSet::new();
    for handle in handles.drain(..) {
      let result = handle.join().map_err(|_| "目标证据核对线程异常退出".to_string())??;
      trusted.extend(result);
    }
    Ok::<_, String>(trusted)
  })
}

/// 计算持久化证据绑定的资源计划 SHA-256。
fn plan_identity_sha256(plan: &PersistedPlan) -> Result<String, String> {
  // 完整计划的合法性由 planner 校验；旁路证据只需绑定计划身份与目标内容，不能因
  // 下载拓扑、资产数组或 inventory 的规模而在每个资源上重复序列化整个计划。
  let identity = (
    plan.schema_version,
    plan.installation_id.as_str(),
    plan.source_scheme,
    plan.target_scheme,
    plan.target,
    plan.strategy,
    plan.source_tag.as_deref(),
    plan.target_tag.as_str(),
    plan.manifest_digest.as_str(),
  );
  let bytes =
    serde_json::to_vec(&identity).map_err(|error| format!("序列化资源计划身份失败：{error}"))?;
  let mut hasher = Sha256::new();
  hasher.update(bytes);
  Ok(hex::encode(hasher.finalize()))
}
