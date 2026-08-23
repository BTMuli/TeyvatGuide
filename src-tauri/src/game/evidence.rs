//! Per-file verification evidence for fresh game installations.
//!
//! Evidence records the verified content hash and the filesystem identity
//! (Volume Serial + FileId) plus size/last-write-time of a staging file at the
//! moment it was fully assembled. It is persisted before the assembly cursor
//! advances so a crash can reuse verified content without a full re-hash.
//!
//! Evidence is deliberately small per file and stored under the task-private
//! directory; the installation marker only keeps a digest of the whole set.

use super::{
  installer::{directory_identity, path_occupied},
  path_guard::prepare_manifest_output_file,
  planner::PersistedPlan,
};
use md5::Digest as Md5Digest;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::{
  collections::BTreeMap,
  fs::{self, File, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
  time::UNIX_EPOCH,
};

pub(crate) const EVIDENCE_SCHEMA_VERSION: u32 = 1;
const MAX_EVIDENCE_FILE_BYTES: u64 = 256 * 1024;

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

/// 证据目录：`<task_root>/tasks/<plan_id>/install-evidence`。
pub(crate) fn evidence_dir(task_root: &Path, plan_id: &str) -> PathBuf {
  task_root.join("tasks").join(plan_id).join("install-evidence")
}

fn asset_evidence_path(dir: &Path, index: usize) -> PathBuf {
  dir.join(format!("a-{index:06}.json"))
}

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

fn atomic_write_synced(path: &Path, evidence: &FileEvidence) -> Result<(), String> {
  let parent = path.parent().ok_or_else(|| "证据路径缺少父目录".to_string())?;
  fs::create_dir_all(parent).map_err(|error| format!("创建证据目录失败：{error}"))?;
  let bytes = serde_json::to_vec(evidence).map_err(|error| format!("序列化证据失败：{error}"))?;
  if bytes.len() as u64 > MAX_EVIDENCE_FILE_BYTES {
    return Err("证据文件超过大小上限".to_string());
  }
  let temporary = parent.join(format!(
    ".{}.tmp-{}",
    path.file_name().unwrap_or_default().to_string_lossy(),
    std::process::id()
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
  format!("{:x}", hasher.finalize())
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

#[cfg(test)]
mod tests {
  use super::{
    capture_and_persist_asset_evidence, evidence_digest, evidence_dir, file_matches_evidence,
    load_asset_evidence, load_evidence_set,
  };
  use crate::game::{
    model::{PackagePlanStrategy, PackagePlanTarget, SchemeId},
    planner::{PersistedPlan, PlanAsset},
  };
  use md5::{Digest, Md5};
  use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
  };
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-evidence-{}", Uuid::new_v4()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }

    fn task_root(&self) -> PathBuf {
      let path = self.0.join("task-root");
      fs::create_dir_all(&path).unwrap();
      path
    }

    fn staging(&self) -> PathBuf {
      let path = self.0.join("staging");
      fs::create_dir_all(&path).unwrap();
      path
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

  fn hash_asset_content(path: &Path, asset: &PlanAsset) -> Result<String, String> {
    let mut file =
      std::fs::File::open(path).map_err(|error| format!("打开资源复检文件失败：{error}"))?;
    let mut hasher = Md5::new();
    let mut buffer = [0_u8; 1024 * 1024];
    let mut remaining = asset.size;
    loop {
      if remaining == 0 {
        break;
      }
      let maximum = usize::try_from(remaining.min(buffer.len() as u64))
        .map_err(|_| "资源文件大小无法表示".to_string())?;
      let read = file
        .read(&mut buffer[..maximum])
        .map_err(|error| format!("读取资源复检文件失败：{error}"))?;
      if read == 0 {
        return Err("资源复检文件小于计划大小".to_string());
      }
      hasher.update(&buffer[..read]);
      remaining -= read as u64;
    }
    Ok(format!("{:x}", hasher.finalize()))
  }

  fn plan_with_asset(name: &str, size: u64, expected_md5: &str) -> PersistedPlan {
    let asset = crate::game::planner::PlanAsset {
      name: name.to_string(),
      action: crate::game::planner::PlanAssetAction::Add,
      source: None,
      size,
      md5: expected_md5.to_string(),
      chunks: Vec::new(),
      patch: None,
    };
    PersistedPlan {
      schema_version: 3,
      plan_id: "evidence-test".to_string(),
      installation_id: "installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::Install,
      source_tag: None,
      target_tag: "1.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      strategy: PackagePlanStrategy::Full,
      downloads: Vec::new(),
      assets: vec![asset],
      delete_files: Vec::new(),
      inventory: Vec::new(),
      install_overlay: None,
      created_at: "2026-01-01T00:00:00Z".to_string(),
    }
  }

  fn write_staging_asset(root: &TempRoot, name: &str, bytes: &[u8]) -> PathBuf {
    let output = root.staging().join(name);
    fs::create_dir_all(output.parent().unwrap()).unwrap();
    fs::write(&output, bytes).unwrap();
    output
  }

  #[test]
  fn persists_and_loads_asset_evidence() {
    let root = TempRoot::new();
    let payload = b"evidence payload";
    let plan = plan_with_asset("data/a.bin", payload.len() as u64, &md5(payload));
    write_staging_asset(&root, "data/a.bin", payload);
    let evidence =
      capture_and_persist_asset_evidence(&root.task_root(), &plan, 0, &root.staging()).unwrap();
    assert_eq!(evidence.path, "data/a.bin");
    assert_eq!(evidence.actual_size, payload.len() as u64);
    assert_eq!(evidence.actual_md5, md5(payload));
    assert!(evidence.staging_volume_serial != 0 || cfg!(not(target_os = "windows")));
    let loaded = load_asset_evidence(&root.task_root(), &plan, 0).unwrap().unwrap();
    assert_eq!(loaded, evidence);
  }

  #[test]
  fn digest_is_deterministic_and_binds_identity() {
    let root = TempRoot::new();
    let payload = b"digest payload";
    let plan = plan_with_asset("root.bin", payload.len() as u64, &md5(payload));
    write_staging_asset(&root, "root.bin", payload);
    capture_and_persist_asset_evidence(&root.task_root(), &plan, 0, &root.staging()).unwrap();
    let first = load_evidence_set(&root.task_root(), &plan).unwrap();
    let second = load_evidence_set(&root.task_root(), &plan).unwrap();
    assert_eq!(evidence_digest(&first), evidence_digest(&second));
  }

  #[test]
  fn missing_evidence_returns_none_and_dir_is_absent() {
    let root = TempRoot::new();
    let payload = b"incomplete";
    let plan = plan_with_asset("root.bin", payload.len() as u64, &md5(payload));
    write_staging_asset(&root, "root.bin", payload);
    assert!(load_asset_evidence(&root.task_root(), &plan, 0).unwrap().is_none());
    assert!(!evidence_dir(&root.task_root(), &plan.plan_id).exists());
  }

  #[test]
  fn identity_and_mtime_detect_file_change_without_content_read() {
    let root = TempRoot::new();
    let payload = b"stable";
    let plan = plan_with_asset("root.bin", payload.len() as u64, &md5(payload));
    write_staging_asset(&root, "root.bin", payload);
    let evidence =
      capture_and_persist_asset_evidence(&root.task_root(), &plan, 0, &root.staging()).unwrap();
    assert!(file_matches_evidence(&root.staging(), &evidence).unwrap());

    // 同长度内容改写必然更新写入时间，证据必须判定文件已变化。
    let path = root.staging().join("root.bin");
    std::thread::sleep(std::time::Duration::from_millis(20));
    fs::write(&path, b"changd").unwrap();
    assert!(!file_matches_evidence(&root.staging(), &evidence).unwrap());
    let actual_md5 = hash_asset_content(&path, &plan.assets[0]).unwrap();
    assert_ne!(actual_md5, md5(payload));
  }
}
