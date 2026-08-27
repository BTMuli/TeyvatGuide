//! Windows Defender 排除目录的临时管理与提权执行。
//! 全新安装前将目标目录、临时 spool、暂存目录、下载缓存与任务 journal
//! 加入 Defender 白名单，安装结束后自动移出，避免实时防护扫描造成磁盘 I/O 停滞。

use serde::{Deserialize, Serialize};
use std::{
  fs, io,
  path::{Path, PathBuf},
  process::Command,
};
use uuid::Uuid;

use super::model::PackageTaskState;

const EXCLUSION_REGISTRY_DIR: &str = "defender-exclusions";

/// 全新安装需要临时排除 Windows Defender 扫描的目录集合。
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallDefenderDirs {
  /// 游戏安装目标目录。
  pub(crate) target_root: String,
  /// 安装任务临时 spool 目录。
  pub(crate) spool_root: String,
  /// 安装组装暂存目录；下载期并行写入完整游戏文件。
  #[serde(default)]
  pub(crate) staging_root: String,
  /// 游戏资源下载缓存目录。
  pub(crate) download_root: String,
  /// 当前安装任务 journal 目录。
  #[serde(default)]
  pub(crate) journal_root: String,
}

impl InstallDefenderDirs {
  pub(crate) fn paths(&self) -> Vec<String> {
    [
      self.target_root.as_str(),
      self.spool_root.as_str(),
      self.staging_root.as_str(),
      self.download_root.as_str(),
      self.journal_root.as_str(),
    ]
    .into_iter()
    .filter(|path| !path.is_empty())
    .map(str::to_string)
    .collect()
  }
}

/// 解析全新安装涉及的目标目录、临时 spool 与下载缓存路径。
pub(crate) fn resolve_install_dirs(
  task_root: &Path,
  install_id: &str,
) -> Result<InstallDefenderDirs, String> {
  let draft_id = super::installer::find_draft_id(task_root, install_id)?;
  let draft = super::installer::load_draft(task_root, &draft_id)?;
  let spool_root = Path::new(&draft.library_root).join(format!(
    ".teyvatguide-spool-{}-{}",
    draft.draft_id,
    &draft.marker_nonce[..12]
  ));
  let download_root = super::downloader::prepare_cache_root(task_root)?;
  let journal_root = draft.plan_id.as_deref().map_or_else(
    || task_root.join("tasks"),
    |plan_id| {
      super::journal::journal_path(task_root, plan_id)
        .parent()
        .map_or_else(|| task_root.join("tasks"), Path::to_path_buf)
    },
  );
  Ok(InstallDefenderDirs {
    target_root: draft.game_root,
    spool_root: path_text(&spool_root),
    staging_root: draft.staging_root,
    download_root: path_text(&download_root),
    journal_root: path_text(&journal_root),
  })
}

fn path_text(path: &Path) -> String {
  path.to_string_lossy().into_owned()
}

/// 将待排除目录打印到终端。
pub(crate) fn print_dirs(action: &str, dirs: &InstallDefenderDirs) {
  println!("[defender] {action}");
  println!("[defender]   目标目录：{}", dirs.target_root);
  println!("[defender]   临时 spool：{}", dirs.spool_root);
  println!("[defender]   暂存目录：{}", dirs.staging_root);
  println!("[defender]   下载缓存：{}", dirs.download_root);
  println!("[defender]   任务日志：{}", dirs.journal_root);
}

/// 将待移出目录打印到终端。
pub(crate) fn print_paths(action: &str, paths: &[String]) {
  println!("[defender] {action}");
  for path in paths {
    println!("[defender]   {path}");
  }
}

/// 将全新安装涉及目录加入 Windows Defender 排除列表（UAC 提权）。
pub(crate) fn add_exclusions(paths: &[String]) -> Result<(), String> {
  run_defender_elevated(paths, false)
}

/// 将全新安装涉及目录移出 Windows Defender 排除列表（UAC 提权）。
pub(crate) fn remove_exclusions(paths: &[String]) -> Result<(), String> {
  run_defender_elevated(paths, true)
}

fn run_defender_elevated(paths: &[String], remove: bool) -> Result<(), String> {
  for path in paths {
    validate_exclusion_path(path)?;
  }
  let status_file = std::env::temp_dir().join(format!("tg-defender-{}.txt", Uuid::new_v4()));
  let status_text = ps_quote(&path_text(&status_file));
  let inner = build_inner_script(&status_text, paths, remove);
  let encoded = base64_encode(&utf16le_bytes(&inner));
  let outer = build_outer_script(&status_text, &encoded);
  let output = Command::new("powershell.exe")
    .arg("-NoProfile")
    .arg("-NonInteractive")
    .arg("-ExecutionPolicy")
    .arg("Bypass")
    .arg("-Command")
    .arg(&outer)
    .output()
    .map_err(|error| format!("启动 PowerShell 失败：{error}"))?;
  let _ = fs::remove_file(&status_file);
  let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
  if !output.status.success() {
    let message = if !stderr.is_empty() {
      stderr
    } else if !stdout.is_empty() {
      stdout
    } else {
      "未知错误（可能取消了 UAC 授权）".to_string()
    };
    return Err(message);
  }
  Ok(())
}

fn validate_exclusion_path(path: &str) -> Result<(), String> {
  let value = Path::new(path);
  if !value.is_absolute() {
    return Err(format!("排除路径必须是绝对路径：{path}"));
  }
  if value.components().count() <= 1 {
    return Err(format!("排除路径不能是盘符根目录：{path}"));
  }
  if path.contains('*') || path.contains('?') {
    return Err(format!("排除路径不支持通配符：{path}"));
  }
  Ok(())
}

fn ps_quote(value: &str) -> String {
  format!("'{}'", value.replace('\'', "''"))
}

fn build_inner_script(status_file: &str, paths: &[String], remove: bool) -> String {
  let path_list = paths.iter().map(|path| ps_quote(path)).collect::<Vec<String>>().join(", ");
  let (mutation, verification) = if remove {
    (
      "$present = @($paths | Where-Object { $_ -in $current })\n\
       foreach ($p in $present) { Remove-MpPreference -ExclusionPath $p }",
      "$remaining = @($paths | Where-Object { $_ -in $current })\n\
       if ($remaining.Count -gt 0) { throw ('移除后仍存在排除：' + ($remaining -join '; ')) }",
    )
  } else {
    (
      "foreach ($p in $paths) { Add-MpPreference -ExclusionPath $p }",
      "$missing = @($paths | Where-Object { $_ -notin $current })\n\
       if ($missing.Count -gt 0) { throw ('添加后未生效：' + ($missing -join '; ')) }",
    )
  };
  format!(
    "$ErrorActionPreference = 'Stop'\n\
     $statusFile = {status_file}\n\
     $paths = @({path_list})\n\
     try {{\n\
       $current = @(Get-MpPreference -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ExclusionPath)\n\
       {mutation}\n\
       {verification}\n\
       Set-Content -LiteralPath $statusFile -Value 'ok' -Encoding ASCII\n\
       exit 0\n\
     }} catch {{\n\
       Set-Content -LiteralPath $statusFile -Value ('err: ' + $_.Exception.Message) -Encoding ASCII\n\
       exit 1\n\
     }}"
  )
}

fn build_outer_script(status_file: &str, encoded_command: &str) -> String {
  format!(
    "$ErrorActionPreference = 'Stop'\n\
     $statusFile = {status_file}\n\
     Remove-Item -LiteralPath $statusFile -ErrorAction SilentlyContinue\n\
     try {{\n\
       Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','{encoded_command}') -ErrorAction Stop | Out-Null\n\
     }} catch {{\n\
       Write-Error ('提权启动失败：' + $_.Exception.Message)\n\
       exit 1\n\
     }}\n\
     if (Test-Path -LiteralPath $statusFile) {{\n\
       $status = Get-Content -LiteralPath $statusFile -Raw\n\
       Write-Output $status\n\
       if ($status -eq 'ok') {{ exit 0 }}\n\
       exit 1\n\
     }}\n\
     Write-Error '提权进程未返回执行结果'\n\
     exit 1"
  )
}

fn utf16le_bytes(text: &str) -> Vec<u8> {
  let mut bytes = Vec::with_capacity(text.len() * 2);
  for unit in text.encode_utf16() {
    bytes.extend_from_slice(&unit.to_le_bytes());
  }
  bytes
}

fn base64_encode(data: &[u8]) -> String {
  const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let mut output = String::with_capacity(data.len().div_ceil(3) * 4);
  for chunk in data.chunks(3) {
    let b0 = u32::from(chunk[0]);
    let b1 = chunk.get(1).copied().map(u32::from).unwrap_or(0);
    let b2 = chunk.get(2).copied().map(u32::from).unwrap_or(0);
    let value = (b0 << 16) | (b1 << 8) | b2;
    output.push(char::from(TABLE[((value >> 18) & 63) as usize]));
    output.push(char::from(TABLE[((value >> 12) & 63) as usize]));
    output.push(if chunk.len() > 1 {
      char::from(TABLE[((value >> 6) & 63) as usize])
    } else {
      '='
    });
    output.push(if chunk.len() > 2 { char::from(TABLE[(value & 63) as usize]) } else { '=' });
  }
  output
}

fn registry_dir(task_root: &Path) -> PathBuf {
  task_root.join(EXCLUSION_REGISTRY_DIR)
}

fn registry_path(task_root: &Path, plan_id: &str) -> PathBuf {
  registry_dir(task_root).join(format!("{plan_id}.json"))
}

/// 登记已加入白名单的安装目录，安装结束后据此移出。
pub(crate) fn persist_registry(
  task_root: &Path,
  plan_id: &str,
  dirs: &InstallDefenderDirs,
) -> Result<(), String> {
  let directory = registry_dir(task_root);
  fs::create_dir_all(&directory)
    .map_err(|error| format!("创建 Defender 排除登记目录失败：{error}"))?;
  let content =
    serde_json::to_string_pretty(dirs).map_err(|error| format!("序列化排除登记失败：{error}"))?;
  let temporary = directory.join(format!("{plan_id}.json.tmp"));
  fs::write(&temporary, content).map_err(|error| format!("写入排除登记失败：{error}"))?;
  fs::rename(&temporary, &registry_path(task_root, plan_id))
    .map_err(|error| format!("提交排除登记失败：{error}"))?;
  Ok(())
}

/// 读取指定安装任务的排除登记；不存在或损坏时返回空。
pub(crate) fn load_registry(task_root: &Path, plan_id: &str) -> Option<InstallDefenderDirs> {
  let content = fs::read_to_string(registry_path(task_root, plan_id)).ok()?;
  match serde_json::from_str(&content) {
    Ok(dirs) => Some(dirs),
    Err(error) => {
      log::warn!("[defender][{plan_id}] 读取排除登记失败：{error}");
      None
    }
  }
}

/// 指定安装计划是否已成功登记 Defender 排除。
pub(crate) fn has_registry(task_root: &Path, plan_id: &str) -> bool {
  load_registry(task_root, plan_id).is_some()
}

/// 启动或恢复全新安装前要求已登记 Defender 排除。
pub(crate) fn require_registry(task_root: &Path, plan_id: &str) -> Result<(), String> {
  if has_registry(task_root, plan_id) {
    return Ok(());
  }
  Err("请先将安装目录加入 Windows Defender 排除列表".to_string())
}

/// 删除指定安装任务的排除登记；登记缺失时静默成功。
pub(crate) fn remove_registry(task_root: &Path, plan_id: &str) {
  let path = registry_path(task_root, plan_id);
  if let Err(error) = fs::remove_file(&path) {
    if error.kind() != io::ErrorKind::NotFound {
      log::warn!("[defender][{plan_id}] 删除排除登记失败：{error}");
    }
  }
}

/// 安装任务结束后将临时加入白名单的目录移出，并删除登记。
pub(crate) fn cleanup_install_exclusions(task_root: &Path, plan_id: &str) -> Result<(), String> {
  let Some(dirs) = load_registry(task_root, plan_id) else {
    return Ok(());
  };
  let paths = dirs.paths();
  print_paths("移出 Windows Defender 排除：", &paths);
  remove_exclusions(&paths)?;
  remove_registry(task_root, plan_id);
  Ok(())
}

/// 应用启动时清理已结束或缺失任务遗留的排除登记。
pub(crate) fn sweep_stale_exclusions(task_root: &Path) -> Result<(), String> {
  let directory = registry_dir(task_root);
  let entries = match fs::read_dir(&directory) {
    Ok(entries) => entries,
    Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
    Err(error) => return Err(format!("读取排除登记目录失败：{error}")),
  };
  let mut first_error = None;
  for entry in entries {
    let entry = match entry {
      Ok(entry) => entry,
      Err(error) => {
        log::warn!("[defender] 读取排除登记条目失败：{error}");
        continue;
      }
    };
    let Some(file_name) = entry.file_name().to_str().map(str::to_string) else {
      continue;
    };
    let Some(plan_id) = file_name.strip_suffix(".json").map(str::to_string) else {
      continue;
    };
    let journal_path = super::journal::journal_path(task_root, &plan_id);
    let stale = match super::journal::load(&journal_path) {
      Ok(journal) => matches!(
        journal.state,
        PackageTaskState::Completed | PackageTaskState::Failed | PackageTaskState::Canceled
      ),
      Err(_) => true,
    };
    if !stale {
      continue;
    }
    if let Err(error) = cleanup_install_exclusions(task_root, &plan_id) {
      log::warn!("[defender][{plan_id}] 清理遗留排除失败：{error}");
      first_error.get_or_insert(error);
    }
  }
  match first_error {
    Some(error) => Err(error),
    None => Ok(()),
  }
}

#[cfg(test)]
mod tests {
  use super::InstallDefenderDirs;

  #[test]
  fn paths_skip_empty_optional_dirs() {
    let dirs = InstallDefenderDirs {
      target_root: "D:/Games/Genshin".to_string(),
      spool_root: "D:/Games/.teyvatguide-spool-1".to_string(),
      staging_root: String::new(),
      download_root: "C:/AppData/game-tasks/cache/chunks".to_string(),
      journal_root: String::new(),
    };
    assert_eq!(
      dirs.paths(),
      vec![
        "D:/Games/Genshin".to_string(),
        "D:/Games/.teyvatguide-spool-1".to_string(),
        "C:/AppData/game-tasks/cache/chunks".to_string(),
      ]
    );
  }

  #[test]
  fn require_registry_rejects_missing_plan() {
    let error = super::require_registry(std::path::Path::new("C:/missing-task-root"), "plan-1")
      .expect_err("missing registry is rejected");
    assert!(error.contains("Windows Defender"));
  }

  #[test]
  fn registry_without_new_fields_still_deserializes() {
    let dirs: InstallDefenderDirs =
      serde_json::from_str(r#"{"targetRoot":"D:/g","spoolRoot":"D:/s","downloadRoot":"C:/c"}"#)
        .expect("legacy registry deserializes");
    assert!(dirs.staging_root.is_empty());
    assert!(dirs.journal_root.is_empty());
    assert_eq!(dirs.paths().len(), 3);
  }
}
