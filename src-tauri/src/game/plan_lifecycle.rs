//! 资源计划的轻量归属元数据与安全目录识别。
//! @since Beta v0.13.0

use super::{installer::is_reparse_point, model::PackagePlanTarget, planner::load_persisted_plan};
use chrono::DateTime;
use serde::{Deserialize, Serialize};
use std::{
  fs::{self, OpenOptions},
  io::Write,
  path::Path,
};
use uuid::Uuid;

const PLAN_METADATA_SCHEMA_VERSION: u32 = 1;
const PLAN_METADATA_FILE_NAME: &str = "plan-meta.json";
const MAX_PLAN_METADATA_BYTES: u64 = 16 * 1024;

/// 解析任务归属；优先使用可信元数据，旧任务仅在元数据缺失时回退到计划。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `task_root`: 游戏资源任务根目录。
/// - `task_id`: 任务 ID，同时必须是计划目录名。
///
/// # 返回
/// - `Ok(Some(String))`: 解析到的安装 ID。
/// - `Ok(None)`: 元数据和旧计划均不存在，归属未知。
/// - `Err(String)`: 任务目录、元数据或旧计划不安全/无效。
pub(crate) fn resolve_plan_installation_id(
  task_root: &Path,
  task_id: &str,
) -> Result<Option<String>, String> {
  if Uuid::parse_str(task_id).is_err() {
    return Err("游戏资源任务 ID 无效".to_string());
  }
  let directory = task_root.join("tasks").join(task_id);
  let directory_metadata = match fs::symlink_metadata(&directory) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取游戏资源任务目录失败：{error}")),
  };
  if directory_metadata.file_type().is_symlink()
    || is_reparse_point(&directory_metadata)
    || !directory_metadata.is_dir()
  {
    return Err("游戏资源任务目录不是普通目录".to_string());
  }

  let metadata_path = directory.join(PLAN_METADATA_FILE_NAME);
  match fs::symlink_metadata(&metadata_path) {
    Ok(metadata)
      if metadata.file_type().is_symlink()
        || is_reparse_point(&metadata)
        || !metadata.is_file() =>
    {
      return Err("游戏资源计划元数据不是普通文件".to_string());
    }
    Ok(_) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("读取游戏资源计划元数据失败：{error}")),
  }
  if let Some(metadata) = load_metadata(task_root, task_id)? {
    return Ok(Some(metadata.installation_id));
  }

  let plan_path = directory.join("plan.json");
  let plan_metadata = match fs::symlink_metadata(&plan_path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取游戏资源计划失败：{error}")),
  };
  if plan_metadata.file_type().is_symlink()
    || is_reparse_point(&plan_metadata)
    || !plan_metadata.is_file()
  {
    return Err("游戏资源计划文件不是普通文件".to_string());
  }
  Ok(Some(load_persisted_plan(task_root, task_id)?.installation_id))
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanMetadata {
  schema_version: u32,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) target: PackagePlanTarget,
  pub(crate) created_at: String,
}

/// 将资源计划元数据以临时文件加原子重命名的方式写入任务目录。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `task_root`: 游戏资源任务根目录。
/// - `plan_id`: 计划 ID。
/// - `installation_id`: 安装 ID。
/// - `target`: 计划目标。
/// - `created_at`: 计划创建时间（RFC 3339）。
///
/// # 返回
/// - `Ok(())`: 元数据已写入。
/// - `Err(String)`: 校验、序列化或写入失败的错误描述。
pub(crate) fn persist_metadata(
  task_root: &Path,
  plan_id: &str,
  installation_id: &str,
  target: PackagePlanTarget,
  created_at: &str,
) -> Result<(), String> {
  let metadata = PlanMetadata {
    schema_version: PLAN_METADATA_SCHEMA_VERSION,
    plan_id: plan_id.to_string(),
    installation_id: installation_id.to_string(),
    target,
    created_at: created_at.to_string(),
  };
  validate_metadata(&metadata, plan_id)?;
  let directory = task_root.join("tasks").join(plan_id);
  let directory_metadata = fs::symlink_metadata(&directory)
    .map_err(|error| format!("读取游戏资源计划目录失败：{error}"))?;
  if directory_metadata.file_type().is_symlink() || !directory_metadata.is_dir() {
    return Err("游戏资源计划目录不是普通目录".to_string());
  }
  let content = serde_json::to_vec_pretty(&metadata)
    .map_err(|error| format!("序列化游戏资源计划元数据失败：{error}"))?;
  if content.is_empty() || content.len() as u64 > MAX_PLAN_METADATA_BYTES {
    return Err("游戏资源计划元数据大小无效".to_string());
  }
  let target_path = directory.join(PLAN_METADATA_FILE_NAME);
  let temporary = directory.join(format!("{PLAN_METADATA_FILE_NAME}.{}.tmp", Uuid::new_v4()));
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建游戏资源计划元数据失败：{error}"))?;
  if let Err(error) = file.write_all(&content).and_then(|()| file.sync_all()) {
    drop(file);
    let _ = fs::remove_file(&temporary);
    return Err(format!("写入游戏资源计划元数据失败：{error}"));
  }
  drop(file);
  match fs::rename(&temporary, &target_path) {
    Ok(()) => Ok(()),
    Err(error) => {
      let _ = fs::remove_file(&temporary);
      Err(format!("提交游戏资源计划元数据失败：{error}"))
    }
  }
}

/// 读取并校验指定计划的元数据，不存在时返回 `None`。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `task_root`: 游戏资源任务根目录。
/// - `plan_id`: 计划 ID。
///
/// # 返回
/// - `Ok(Some(PlanMetadata))`: 元数据存在且有效。
/// - `Ok(None)`: 元数据文件不存在。
/// - `Err(String)`: 元数据损坏或读取失败的错误描述。
pub(crate) fn load_metadata(
  task_root: &Path,
  plan_id: &str,
) -> Result<Option<PlanMetadata>, String> {
  let path = task_root.join("tasks").join(plan_id).join(PLAN_METADATA_FILE_NAME);
  let metadata = match fs::symlink_metadata(&path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取游戏资源计划元数据失败：{error}")),
  };
  if metadata.file_type().is_symlink() || !metadata.is_file() {
    return Err("游戏资源计划元数据不是普通文件".to_string());
  }
  if metadata.len() == 0 || metadata.len() > MAX_PLAN_METADATA_BYTES {
    return Err("游戏资源计划元数据大小无效".to_string());
  }
  let content = fs::read(path).map_err(|error| format!("读取游戏资源计划元数据失败：{error}"))?;
  let value: PlanMetadata = serde_json::from_slice(&content)
    .map_err(|error| format!("解析游戏资源计划元数据失败：{error}"))?;
  validate_metadata(&value, plan_id)?;
  Ok(Some(value))
}

/// 判断目录是否为只包含 `plan.json` 与可选元数据的安全计划目录。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `directory`: 待检查的目录。
/// - `task_id`: 任务 ID，必须为合法 UUID。
///
/// # 返回
/// - `Ok(true)`: 目录内容符合安全计划目录。
/// - `Ok(false)`: 目录内容不符合。
/// - `Err(String)`: 读取目录或元数据失败的错误描述。
pub(crate) fn is_safe_plan_only_directory(directory: &Path, task_id: &str) -> Result<bool, String> {
  if Uuid::parse_str(task_id).is_err() {
    return Ok(false);
  }
  let entries =
    fs::read_dir(directory).map_err(|error| format!("读取游戏资源任务目录失败：{error}"))?;
  let mut has_plan = false;
  let mut has_metadata = false;
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取游戏资源任务条目失败：{error}"))?;
    let metadata = fs::symlink_metadata(entry.path())
      .map_err(|error| format!("读取游戏资源任务文件失败：{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
      return Ok(false);
    }
    let file_name = entry.file_name();
    match file_name.to_str() {
      Some("plan.json") if !has_plan && metadata.len() > 0 => has_plan = true,
      Some(PLAN_METADATA_FILE_NAME) if !has_metadata => has_metadata = true,
      _ => return Ok(false),
    }
  }
  if !has_plan {
    return Ok(false);
  }
  if has_metadata {
    load_metadata_from_directory(directory, task_id)?;
  }
  Ok(true)
}

/// 从目录中读取并校验资源计划元数据。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `directory`: 包含元数据文件的目录。
/// - `plan_id`: 计划 ID。
///
/// # 返回
/// - `Ok(PlanMetadata)`: 读取到的有效元数据。
/// - `Err(String)`: 元数据结构无效或读取失败的错误描述。
fn load_metadata_from_directory(directory: &Path, plan_id: &str) -> Result<PlanMetadata, String> {
  let path = directory.join(PLAN_METADATA_FILE_NAME);
  let metadata =
    fs::symlink_metadata(&path).map_err(|error| format!("读取游戏资源计划元数据失败：{error}"))?;
  if metadata.file_type().is_symlink()
    || !metadata.is_file()
    || metadata.len() == 0
    || metadata.len() > MAX_PLAN_METADATA_BYTES
  {
    return Err("游戏资源计划元数据结构无效".to_string());
  }
  let content = fs::read(path).map_err(|error| format!("读取游戏资源计划元数据失败：{error}"))?;
  let value: PlanMetadata = serde_json::from_slice(&content)
    .map_err(|error| format!("解析游戏资源计划元数据失败：{error}"))?;
  validate_metadata(&value, plan_id)?;
  Ok(value)
}

/// 校验资源计划元数据的字段合法性。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `metadata`: 待校验的元数据。
/// - `plan_id`: 计划 ID。
///
/// # 返回
/// - `Ok(())`: 字段合法。
/// - `Err(String)`: 字段非法的错误描述。
fn validate_metadata(metadata: &PlanMetadata, plan_id: &str) -> Result<(), String> {
  if metadata.schema_version != PLAN_METADATA_SCHEMA_VERSION
    || Uuid::parse_str(plan_id).is_err()
    || metadata.plan_id != plan_id
    || metadata.installation_id.trim().is_empty()
    || metadata.installation_id.len() > 128
    || metadata.installation_id.chars().any(char::is_control)
    || DateTime::parse_from_rfc3339(&metadata.created_at).is_err()
  {
    return Err("游戏资源计划元数据字段无效".to_string());
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::super::{
    model::SchemeId,
    planner::{PersistedPlan, PlanFile, persist_validated_plan},
  };
  use super::*;

  /// 验证归属解析优先可信元数据、严格拒绝损坏元数据，并回退旧计划。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn resolve_plan_installation_id_scopes_metadata_and_legacy_plan() {
    let task_root = std::env::temp_dir().join(format!("teyvatguide-lifecycle-{}", Uuid::new_v4()));
    let valid_metadata_id = Uuid::new_v4().to_string();
    let valid_metadata_dir = task_root.join("tasks").join(&valid_metadata_id);
    fs::create_dir_all(&valid_metadata_dir).expect("创建元数据任务目录失败");
    persist_metadata(
      &task_root,
      &valid_metadata_id,
      "other-installation",
      PackagePlanTarget::Main,
      "2026-01-01T00:00:00Z",
    )
    .expect("写入元数据失败");
    assert_eq!(
      resolve_plan_installation_id(&task_root, &valid_metadata_id).expect("读取元数据失败"),
      Some("other-installation".to_string())
    );

    let unknown_id = Uuid::new_v4().to_string();
    fs::create_dir_all(task_root.join("tasks").join(&unknown_id)).expect("创建未知任务目录失败");
    assert_eq!(
      resolve_plan_installation_id(&task_root, &unknown_id).expect("未知归属不应失败"),
      None
    );

    let legacy_id = Uuid::new_v4().to_string();
    let legacy_plan = PersistedPlan {
      schema_version: 7,
      plan_id: legacy_id.clone(),
      installation_id: "legacy-installation".to_string(),
      source_scheme: SchemeId::CnOfficial,
      target_scheme: SchemeId::CnOfficial,
      target: PackagePlanTarget::PreDownload,
      source_tag: Some("1.0.0".to_string()),
      target_tag: "2.0.0".to_string(),
      manifest_digest: "a".repeat(64),
      strategy: super::super::model::PackagePlanStrategy::ManifestDiff,
      downloads: Vec::new(),
      assets: Vec::new(),
      delete_files: Vec::new(),
      inventory: vec![PlanFile {
        name: "target.bin".to_string(),
        size: 1,
        md5: "00000000000000000000000000000000".to_string(),
      }],
      fallback: None,
      install_overlay: None,
      audio_selection: None,
      created_at: "2026-01-01T00:00:00Z".to_string(),
    };
    persist_validated_plan(&task_root, &legacy_plan).expect("写入旧计划失败");
    let _ = fs::remove_file(task_root.join("tasks").join(&legacy_id).join("plan-meta.json"));
    assert_eq!(
      resolve_plan_installation_id(&task_root, &legacy_id).expect("回退旧计划失败"),
      Some("legacy-installation".to_string())
    );

    let corrupt_id = Uuid::new_v4().to_string();
    let corrupt_dir = task_root.join("tasks").join(&corrupt_id);
    fs::create_dir_all(&corrupt_dir).expect("创建损坏元数据目录失败");
    fs::write(corrupt_dir.join("plan-meta.json"), b"not-json").expect("写入损坏元数据失败");
    let corrupt_plan = PersistedPlan { plan_id: corrupt_id.clone(), ..legacy_plan };
    persist_validated_plan(&task_root, &corrupt_plan).expect("写入损坏元数据对应的旧计划失败");
    fs::write(corrupt_dir.join("plan-meta.json"), b"not-json").expect("恢复损坏元数据失败");
    let error =
      resolve_plan_installation_id(&task_root, &corrupt_id).expect_err("损坏元数据不应回退旧计划");
    assert!(error.contains("解析游戏资源计划元数据失败"));

    let _ = fs::remove_dir_all(task_root);
  }

  /// 验证任务目录链接被拒绝；Windows 无创建链接权限时仅跳过该环境测试。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn resolve_plan_installation_id_rejects_linked_task_directory() {
    let task_root =
      std::env::temp_dir().join(format!("teyvatguide-lifecycle-link-{}", Uuid::new_v4()));
    let task_id = Uuid::new_v4().to_string();
    let target = task_root.join("outside");
    let link = task_root.join("tasks").join(&task_id);
    fs::create_dir_all(&target).expect("创建链接目标目录失败");
    fs::create_dir_all(link.parent().expect("链接父目录缺失")).expect("创建链接父目录失败");
    let result = {
      #[cfg(unix)]
      {
        std::os::unix::fs::symlink(&target, &link)
      }
      #[cfg(windows)]
      {
        std::os::windows::fs::symlink_dir(&target, &link)
      }
    };
    if let Err(error) = result {
      eprintln!("跳过链接安全测试，当前环境无法创建目录链接：{error}");
      let _ = fs::remove_dir_all(task_root);
      return;
    }
    let error =
      resolve_plan_installation_id(&task_root, &task_id).expect_err("任务目录链接必须被拒绝");
    assert!(error.contains("普通目录"));
    let _ = fs::remove_dir_all(task_root);
  }
}
