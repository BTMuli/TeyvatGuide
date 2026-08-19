//! 国服官服与国服 B 服同资源家族渠道转换计划。
//!
//! 本模块只生成并持久化只读计划：SDK 下载与 config 提交尚未执行。
//! 渠道 SDK 按 HoyoPlay 当前包的 MD5 做缓存键：远端 version 变了通常会换 MD5，
//! 旧包不能复用。命中时必须复验压缩包 size/MD5；安装后再按 sdk_pkg_version 核对文件。
//! @since Beta v0.11.5

use super::{
  hoyoplay::{ChannelSdkPackage, GameBranches, get_channel_sdk, get_deprecated_files},
  model::{GameInstallation, InstallationStatus, PackageSwitchSummary, SchemeId},
  path_guard::resolve_optional_manifest_file,
  planner::load_verify_target,
  scheme::{canonical_channel, opposite_scheme},
};
use chrono::Utc;
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use std::{
  collections::HashSet,
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
};
use uuid::Uuid;

const PLAN_SCHEMA_VERSION: u32 = 1;
const MAX_PLAN_BYTES: usize = 16 * 1024 * 1024;
const SAFETY_MARGIN_BYTES: u64 = 1024 * 1024 * 1024;
const KNOWN_SDK_FILES: [&str; 4] = [
  "YuanShen_Data/Plugins/PCGameSDK.dll",
  "YuanShen_Data/Plugins/EOSSDK-Win64-Shipping.dll",
  "YuanShen_Data/Plugins/PluginEOSSDK.dll",
  "sdk_pkg_version",
];

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedSwitchPlan {
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
  source_sdk: Option<PersistedSdk>,
  delete_files: Vec<String>,
  created_at: String,
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
  let (target_sdk, source_sdk, deprecated, inventory) = tokio::try_join!(
    get_channel_sdk(&client, target_scheme),
    get_channel_sdk(&client, source_scheme),
    get_deprecated_files(&client, target_scheme),
    async { load_verify_target(installation, branches).await.map(|(_, inventory)| inventory) },
  )?;
  let game_root = PathBuf::from(&installation.root_path);
  let inventory_names = inventory.into_iter().map(|file| file.name).collect::<HashSet<_>>();
  let delete_files =
    collect_delete_files(&game_root, &deprecated, &inventory_names, target_sdk.is_none())?;
  let cached_sdk = target_sdk.as_ref().or(source_sdk.as_ref());
  let cache_hit_bytes = cached_sdk.map(|package| sdk_cache_hit(task_root, package)).unwrap_or(0);
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
    source_sdk: source_sdk.as_ref().map(persisted_sdk),
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
    sdk_version: target_sdk.as_ref().or(source_sdk.as_ref()).map(|package| package.version.clone()),
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
  let mut file = File::open(path).map_err(|error| format!("打开渠道 SDK 缓存失败：{error}"))?;
  let mut hasher = Md5::new();
  let mut buffer = [0_u8; 1024 * 1024];
  loop {
    let read = file.read(&mut buffer).map_err(|error| format!("读取渠道 SDK 缓存失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  Ok(format!("{:x}", hasher.finalize()))
}

fn persist_plan(task_root: &Path, plan: &PersistedSwitchPlan) -> Result<(), String> {
  let directory = task_root.join("switch").join(&plan.installation_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建换服计划目录失败：{error}"))?;
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
    return Err(format!("提交换服计划失败：{}", std::io::Error::last_os_error()));
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("提交换服计划失败：{error}"))
}

#[cfg(test)]
mod tests {
  use super::{collect_delete_files, sdk_cache_hit};
  use crate::game::hoyoplay::ChannelSdkPackage;
  use std::{collections::HashSet, fs, path::PathBuf};
  use uuid::Uuid;

  struct TempRoot(PathBuf);

  impl TempRoot {
    fn new() -> Self {
      let path = std::env::temp_dir().join(format!("teyvat-guide-switch-{}", Uuid::new_v4()));
      fs::create_dir_all(path.join("YuanShen_Data/Plugins")).unwrap();
      Self(path)
    }
  }

  impl Drop for TempRoot {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  #[test]
  fn skips_deprecated_files_still_in_game_inventory() {
    let root = TempRoot::new();
    fs::write(root.0.join("UnityPlayer.dll"), b"game").unwrap();
    fs::write(root.0.join("YuanShen_Data/Plugins/PCGameSDK.dll"), b"sdk").unwrap();
    let inventory = HashSet::from(["UnityPlayer.dll".to_string()]);
    let deprecated =
      vec!["UnityPlayer.dll".to_string(), "YuanShen_Data/Plugins/PCGameSDK.dll".to_string()];
    let deleted = collect_delete_files(&root.0, &deprecated, &inventory, true).unwrap();
    assert_eq!(deleted, vec!["YuanShen_Data/Plugins/PCGameSDK.dll".to_string()]);
  }

  #[test]
  fn ignores_missing_deprecated_files() {
    let root = TempRoot::new();
    let inventory = HashSet::new();
    let deleted = collect_delete_files(
      &root.0,
      &["YuanShen_Data/Plugins/missing.dll".to_string()],
      &inventory,
      false,
    )
    .unwrap();
    assert!(deleted.is_empty());
  }

  #[test]
  fn sdk_cache_hit_requires_matching_md5() {
    let root = TempRoot::new();
    let bytes = b"sdk!";
    let md5 = {
      use md5::Digest;
      format!("{:x}", md5::Md5::digest(bytes))
    };
    fs::create_dir_all(root.0.join("cache/sdks")).unwrap();
    fs::write(root.0.join("cache/sdks").join(&md5), bytes).unwrap();
    let package = ChannelSdkPackage {
      version: "5.0.4".to_string(),
      pkg_version_file_name: "sdk_pkg_version".to_string(),
      md5: md5.clone(),
      size: bytes.len() as u64,
      decompressed_size: 8,
      url: "https://launcher-webstatic.mihoyo.com/sdk.zip".to_string(),
    };
    assert_eq!(sdk_cache_hit(&root.0, &package), 4);
    fs::write(root.0.join("cache/sdks").join(&md5), b"xxxx").unwrap();
    assert_eq!(sdk_cache_hit(&root.0, &package), 0);
  }
}
