//! 资源计划的轻量归属元数据与安全目录识别。
//! @since Beta v0.12.0

use super::model::PackagePlanTarget;
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

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanMetadata {
  schema_version: u32,
  pub(crate) plan_id: String,
  pub(crate) installation_id: String,
  pub(crate) target: PackagePlanTarget,
  pub(crate) created_at: String,
}

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
