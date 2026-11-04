//! Windows Defender 排除目录的临时管理与提权执行。
//! 安装与正式更新前将目标目录、暂存目录、下载缓存与任务 journal
//! 临时加入 Defender 排除，任务结束后自动移出，避免实时防护扫描造成磁盘 I/O 停滞。
//! @since Beta v0.13.0

use serde::{Deserialize, Serialize};
use std::{
  collections::HashSet,
  fs, io,
  path::{Path, PathBuf},
  sync::{Mutex, MutexGuard, OnceLock},
};
use uuid::Uuid;

const EXCLUSION_REGISTRY_DIR: &str = "defender-exclusions";

mod powershell;
pub(crate) use self::powershell::DefenderMutationReceipt;

/// 安装与正式更新需要临时排除 Windows Defender 扫描的目录集合。
/// @since Beta v0.13.0
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

/// Defender 排除登记的生命周期状态。
///
/// @since Beta v0.13.0
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum DefenderRegistryState {
  /// 旧版仅保存目录集合的登记；清理时不能推断任何路径归本次安装所有。
  #[default]
  Legacy,
  /// 已写入登记但尚未收到完整的 Defender 操作回执。
  Pending,
  /// 所有本次安装拥有的排除路径均已确认存在。
  Active,
  /// 清理操作未能确认所有拥有路径均已移除。
  CleanupRequired,
}

/// 将安装目录集合与本次安装实际拥有的 Defender 排除路径合并保存。
///
/// 旧版 JSON 没有新增字段时通过 `serde(default)` 读取为 `Legacy`，并且
/// `owned_paths` 为空，从而只允许继续安装而不会猜测并移除系统排除。
///
/// @since Beta v0.13.0
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallDefenderRegistry {
  #[serde(flatten)]
  pub(crate) dirs: InstallDefenderDirs,
  #[serde(default)]
  pub(crate) owned_paths: Vec<String>,
  #[serde(default)]
  pub(crate) state: DefenderRegistryState,
}

impl InstallDefenderDirs {
  /// 返回所有已配置目录的规范化 Windows 路径。
  ///
  /// @since Beta v0.12.0
  ///
  /// # 返回
  /// 去空并统一为反斜杠分隔的目录路径列表。
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
    .map(normalize_windows_path)
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
    target_root: normalize_windows_path(&draft.game_root),
    spool_root: path_text(&spool_root),
    staging_root: normalize_windows_path(&draft.staging_root),
    download_root: path_text(&download_root),
    journal_root: path_text(&journal_root),
  })
}

/// 解析正式更新涉及的游戏事务、下载缓存与任务 journal 目录。
///
/// Main 更新没有安装 spool；事务根目录覆盖其边下载边组装写入的 incoming、backup 与 config。
///
/// @since Beta v0.13.0
pub(crate) fn resolve_package_dirs(
  task_root: &Path,
  plan_id: &str,
  game_root: &Path,
) -> Result<InstallDefenderDirs, String> {
  Uuid::parse_str(plan_id).map_err(|_| "资源计划 ID 无效：必须是 UUID".to_string())?;
  let transaction_root = super::committer::transaction_root(game_root).join(plan_id);
  let download_root = super::downloader::prepare_cache_root(task_root)?;
  let journal_root = super::journal::journal_path(task_root, plan_id)
    .parent()
    .map_or_else(|| task_root.join("tasks"), Path::to_path_buf);
  Ok(InstallDefenderDirs {
    target_root: normalize_windows_path(&game_root.to_string_lossy()),
    spool_root: String::new(),
    staging_root: path_text(&transaction_root),
    download_root: path_text(&download_root),
    journal_root: path_text(&journal_root),
  })
}

/// 将路径转换为规范化 Windows 字符串。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 待转换的路径。
///
/// # 返回
/// 规范化后的字符串。
fn path_text(path: &Path) -> String {
  normalize_windows_path(&path.to_string_lossy())
}

/// 将路径中的正斜杠替换为反斜杠。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 待转换的路径。
///
/// # 返回
/// 反斜杠分隔的路径。
fn normalize_windows_path(path: &str) -> String {
  path.replace('/', "\\")
}

/// 生成用于比较排除路径的规范化小写键。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 待规范化的路径。
///
/// # 返回
/// 去除末尾分隔符并小写后的键。
fn normalize_exclusion_key(path: &str) -> String {
  normalize_windows_path(path).trim_end_matches('\\').to_ascii_lowercase()
}

/// 过滤出未被其它登记保留的可移除排除路径。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `paths`: 待检查的路径列表。
/// - `retained`: 仍需保留的路径键集合。
///
/// # 返回
/// 可安全移除的路径列表。
fn removable_exclusion_paths(paths: &[String], retained: &HashSet<String>) -> Vec<String> {
  paths.iter().filter(|path| !retained.contains(&normalize_exclusion_key(path))).cloned().collect()
}

/// 返回当前登记拥有且仍被其它登记完整目录集合引用的路径。
///
/// @since Beta v0.13.0
fn retained_owned_paths(paths: &[String], retained: &HashSet<String>) -> Vec<String> {
  paths.iter().filter(|path| retained.contains(&normalize_exclusion_key(path))).cloned().collect()
}

/// 合并清理后仍能确认存在的拥有路径，不恢复本轮候选旧登记。
///
/// @since Beta v0.13.0
fn remaining_owned_paths(
  dirs: &InstallDefenderDirs,
  retained_owned: &[String],
  receipt_owned_present: &[String],
) -> Result<Vec<String>, String> {
  let mut remaining = retained_owned.to_vec();
  remaining.extend(receipt_owned_present.iter().cloned());
  normalize_registry_owned_paths(dirs, &remaining)
}

static EXCLUSION_MUTATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

/// 串行化本进程内的 Defender 登记与清理，避免两个计划交错读取排除快照。
///
/// @since Beta v0.13.0
pub(crate) fn lock_exclusion_mutation() -> Result<MutexGuard<'static, ()>, String> {
  EXCLUSION_MUTATION_LOCK
    .get_or_init(|| Mutex::new(()))
    .lock()
    .map_err(|_| "Defender 排除变更锁已损坏".to_string())
}

/// 规范化并校验本次安装拥有的排除路径，确保它们来自安装目录集合。
///
/// @since Beta v0.13.0
pub(crate) fn normalize_registry_owned_paths(
  dirs: &InstallDefenderDirs,
  owned_paths: &[String],
) -> Result<Vec<String>, String> {
  let allowed =
    dirs.paths().into_iter().map(|path| normalize_exclusion_key(&path)).collect::<HashSet<_>>();
  let mut seen = HashSet::new();
  let mut normalized = Vec::new();
  for path in owned_paths {
    let key = normalize_exclusion_key(path);
    if key.is_empty() || !allowed.contains(&key) {
      return Err(format!("Defender 登记拥有路径不属于安装目录集合：{path}"));
    }
    if seen.insert(key.clone()) {
      normalized.push(key);
    }
  }
  Ok(normalized)
}

/// 校验并规范化持久化的 Defender 登记。
///
/// @since Beta v0.13.0
fn validate_registry(
  mut registry: InstallDefenderRegistry,
) -> Result<InstallDefenderRegistry, String> {
  if registry.state == DefenderRegistryState::Legacy && !registry.owned_paths.is_empty() {
    return Err("legacy Defender 登记包含未知拥有路径，拒绝猜测清理范围".to_string());
  }
  registry.owned_paths = normalize_registry_owned_paths(&registry.dirs, &registry.owned_paths)?;
  Ok(registry)
}

/// 校验其它登记并返回其需要保护的完整目录集合；任何读取失败都 fail-closed。
///
/// @since Beta v0.13.0
pub(crate) fn validate_other_registries(task_root: &Path, plan_id: &str) -> Result<(), String> {
  other_registry_path_keys(task_root, plan_id).map(|_| ())
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
///
/// @since Beta v0.13.0
pub(crate) fn add_exclusions(paths: &[String]) -> DefenderMutationReceipt {
  self::powershell::add_exclusions(paths)
}

/// 按目录清单登记并加入一次 Defender 排除，复用于安装与正式更新。
///
/// @since Beta v0.13.0
pub(crate) fn add_registered_exclusions(
  task_root: &Path,
  plan_id: &str,
  dirs: &InstallDefenderDirs,
) -> Result<Vec<String>, String> {
  let _guard = lock_exclusion_mutation()?;
  print_dirs("添加 Windows Defender 排除：", dirs);
  let previous = load_registry(task_root, plan_id)?;
  let previous_owned = previous.map_or_else(Vec::new, |registry| registry.owned_paths);
  // 在任何 Defender 变更前验证其它登记；损坏登记不能被忽略，否则可能误删共享排除。
  validate_other_registries(task_root, plan_id)?;
  let paths = dirs.paths();

  // 先写 pending，提权回执不完整时也保留登记，避免误删或丢失本轮所有权。
  persist_registry(task_root, plan_id, dirs, &previous_owned, DefenderRegistryState::Pending)?;
  let receipt = add_exclusions(&paths);
  let mut known_owned = previous_owned;
  if receipt.is_complete() {
    known_owned.extend(receipt.owned_present.iter().cloned());
    // 在提升为 active 前先保存拥有路径 checkpoint；即使后续状态写入失败也不能丢账。
    persist_registry(task_root, plan_id, dirs, &known_owned, DefenderRegistryState::Pending)?;
  }
  if receipt.is_success() {
    persist_registry(task_root, plan_id, dirs, &known_owned, DefenderRegistryState::Active)?;
    return Ok(paths);
  }

  let state = if receipt.is_complete() && !known_owned.is_empty() {
    DefenderRegistryState::CleanupRequired
  } else {
    DefenderRegistryState::Pending
  };
  if let Err(persist_error) = persist_registry(task_root, plan_id, dirs, &known_owned, state) {
    return Err(format!(
      "{}；保存 Defender 登记失败：{persist_error}",
      receipt.error_message("添加")
    ));
  }
  Err(receipt.error_message("添加"))
}

/// 将全新安装涉及目录移出 Windows Defender 排除列表（UAC 提权）。
///
/// @since Beta v0.13.0
pub(crate) fn remove_exclusions(paths: &[String]) -> DefenderMutationReceipt {
  self::powershell::remove_exclusions(paths)
}

/// 返回 Defender 排除登记目录路径。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `task_root`: 任务根目录。
///
/// # 返回
/// 登记目录路径。
fn registry_dir(task_root: &Path) -> PathBuf {
  task_root.join(EXCLUSION_REGISTRY_DIR)
}

/// 返回指定计划的 Defender 排除登记文件路径。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `task_root`: 任务根目录。
/// - `plan_id`: 计划 ID。
///
/// # 返回
/// 登记文件路径。
fn registry_path(task_root: &Path, plan_id: &str) -> PathBuf {
  registry_dir(task_root).join(format!("{plan_id}.json"))
}

/// 原子替换 Defender 登记文件，允许 pending/active/cleanup_required 状态安全更新。
///
/// @since Beta v0.13.0
fn replace_registry_file(temporary: &Path, target: &Path) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
      MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
    };
    let source = temporary.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
    if unsafe {
      MoveFileExW(
        source.as_ptr(),
        target.as_ptr(),
        MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
      )
    } == 0
    {
      return Err(format!("提交 Defender 排除登记失败：{}", std::io::Error::last_os_error()));
    }
    return Ok(());
  }
  #[cfg(not(target_os = "windows"))]
  fs::rename(temporary, target).map_err(|error| format!("提交 Defender 排除登记失败：{error}"))
}

/// 登记已加入白名单的安装目录及本次安装实际拥有的排除路径。
///
/// @since Beta v0.13.0
pub(crate) fn persist_registry(
  task_root: &Path,
  plan_id: &str,
  dirs: &InstallDefenderDirs,
  owned_paths: &[String],
  state: DefenderRegistryState,
) -> Result<(), String> {
  let registry = validate_registry(InstallDefenderRegistry {
    dirs: dirs.clone(),
    owned_paths: owned_paths.to_vec(),
    state,
  })?;
  let directory = registry_dir(task_root);
  fs::create_dir_all(&directory)
    .map_err(|error| format!("创建 Defender 排除登记目录失败：{error}"))?;
  let content = serde_json::to_string_pretty(&registry)
    .map_err(|error| format!("序列化排除登记失败：{error}"))?;
  let temporary = directory.join(format!("{plan_id}.json.tmp"));
  fs::write(&temporary, content).map_err(|error| format!("写入排除登记失败：{error}"))?;
  if let Err(error) = replace_registry_file(&temporary, &registry_path(task_root, plan_id)) {
    let _ = fs::remove_file(&temporary);
    return Err(error);
  }
  Ok(())
}

/// 读取并校验指定安装任务的排除登记；损坏或不完整时返回错误，避免猜测清理范围。
///
/// @since Beta v0.13.0
pub(crate) fn load_registry(
  task_root: &Path,
  plan_id: &str,
) -> Result<Option<InstallDefenderRegistry>, String> {
  let path = registry_path(task_root, plan_id);
  let content = match fs::read_to_string(&path) {
    Ok(content) => content,
    Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
    Err(error) => return Err(format!("读取 Defender 排除登记失败：{error}")),
  };
  let registry = serde_json::from_str::<InstallDefenderRegistry>(&content)
    .map_err(|error| format!("解析 Defender 排除登记失败：{error}"))?;
  validate_registry(registry)
    .map(Some)
    .map_err(|error| format!("校验 Defender 排除登记失败：{error}"))
}

/// 指定安装计划是否已成功登记 Defender 排除。
///
/// @since Beta v0.13.0
pub(crate) fn has_registry(task_root: &Path, plan_id: &str) -> bool {
  load_registry(task_root, plan_id).ok().flatten().is_some_and(|registry| {
    matches!(registry.state, DefenderRegistryState::Legacy | DefenderRegistryState::Active)
  })
}

/// 启动或恢复全新安装前要求已登记 Defender 排除。
///
/// @since Beta v0.13.0
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

/// 安装任务结束后仅移除本次拥有的排除，并按回执保留未完成清理登记。
///
/// @since Beta v0.13.0
pub(crate) fn cleanup_install_exclusions(task_root: &Path, plan_id: &str) -> Result<(), String> {
  let _guard = lock_exclusion_mutation()?;
  let Some(registry) = load_registry(task_root, plan_id)? else {
    return Ok(());
  };
  if registry.state == DefenderRegistryState::Legacy {
    // 旧登记没有所有权信息，只能删除登记本身，不能移除任何系统排除。
    remove_registry(task_root, plan_id);
    return Ok(());
  }

  let retained = other_registry_path_keys(task_root, plan_id)?;
  let retained_owned = retained_owned_paths(&registry.owned_paths, &retained);
  let paths = removable_exclusion_paths(&registry.owned_paths, &retained);
  if paths.is_empty() {
    if !retained_owned.is_empty() {
      persist_registry(
        task_root,
        plan_id,
        &registry.dirs,
        &retained_owned,
        DefenderRegistryState::CleanupRequired,
      )?;
      return Err(format!(
        "仍有 {} 个排除路径由其它安装登记引用，已保留 cleanup_required 登记",
        retained_owned.len()
      ));
    }
    if registry.state == DefenderRegistryState::Pending {
      return Err("Defender 排除登记仍在 pending，缺少可安全清理的拥有路径".to_string());
    }
    remove_registry(task_root, plan_id);
    return Ok(());
  }

  // 先原子记录仍被其它登记引用的路径；若 checkpoint 失败，不能执行系统移除。
  persist_registry(
    task_root,
    plan_id,
    &registry.dirs,
    &retained_owned,
    DefenderRegistryState::CleanupRequired,
  )
  .map_err(|error| format!("保存 Defender 清理 checkpoint 失败，未执行系统移除：{error}"))?;

  print_paths("移出 Windows Defender 排除：", &paths);
  let receipt = remove_exclusions(&paths);
  if !receipt.is_complete() {
    return Err(receipt.error_message("移除"));
  }

  let remaining = remaining_owned_paths(&registry.dirs, &retained_owned, &receipt.owned_present)?;
  if remaining.is_empty() {
    // 回执确认候选路径均不存在，且没有共享拥有路径需要继续登记。
    remove_registry(task_root, plan_id);
    return Ok(());
  }

  // 完整回执只允许保存仍被确认存在的路径；候选旧 ownership 不得恢复。
  persist_registry(
    task_root,
    plan_id,
    &registry.dirs,
    &remaining,
    DefenderRegistryState::CleanupRequired,
  )?;
  if receipt.owned_present.is_empty() {
    return Err(format!(
      "仍有 {} 个排除路径由其它安装登记引用，已保留 cleanup_required 登记",
      retained_owned.len()
    ));
  }
  Err(receipt.error_message("移除"))
}

/// 收集其它计划登记中仍需保留的排除路径键。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `task_root`: 任务根目录。
/// - `except_plan_id`: 需要排除的计划 ID。
///
/// # 返回
/// 其它计划保留的路径键集合。
fn other_registry_path_keys(
  task_root: &Path,
  except_plan_id: &str,
) -> Result<HashSet<String>, String> {
  let entries = match fs::read_dir(registry_dir(task_root)) {
    Ok(entries) => entries,
    Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(HashSet::new()),
    Err(error) => return Err(format!("读取其它 Defender 排除登记失败：{error}")),
  };
  let mut keys = HashSet::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("读取其它 Defender 排除登记条目失败：{error}"))?;
    let file_name = entry
      .file_name()
      .to_str()
      .map(str::to_string)
      .ok_or_else(|| "其它 Defender 排除登记文件名不是有效 UTF-8".to_string())?;
    let Some(plan_id) = file_name.strip_suffix(".json") else {
      continue;
    };
    if plan_id == except_plan_id {
      continue;
    }
    let registry = load_registry(task_root, plan_id)?
      .ok_or_else(|| format!("其它 Defender 排除登记在扫描期间消失：{plan_id}"))?;
    keys.extend(retained_registry_path_keys(&registry));
  }
  Ok(keys)
}

/// 返回登记所引用的完整目录集合，用于并发清理时 fail-closed 保留共享路径。
///
/// @since Beta v0.13.0
fn retained_registry_path_keys(registry: &InstallDefenderRegistry) -> HashSet<String> {
  registry.dirs.paths().into_iter().map(|path| normalize_exclusion_key(&path)).collect()
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
      Ok(journal) => journal.state.is_history_terminal(),
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
  use super::{
    DefenderRegistryState, InstallDefenderDirs, InstallDefenderRegistry,
    normalize_registry_owned_paths, remaining_owned_paths, removable_exclusion_paths,
    resolve_package_dirs, retained_owned_paths, retained_registry_path_keys, validate_registry,
  };
  use std::{collections::HashSet, fs, path::Path};
  use uuid::Uuid;

  /// 构造纯内存测试用的安装目录集合。
  ///
  /// @since Beta v0.13.0
  fn test_dirs() -> InstallDefenderDirs {
    InstallDefenderDirs {
      target_root: "C:\\Game".to_string(),
      spool_root: "C:\\Library\\spool".to_string(),
      staging_root: String::new(),
      download_root: "C:\\Cache".to_string(),
      journal_root: "C:\\Tasks".to_string(),
    }
  }

  /// 验证 Main 更新目录解析只覆盖可信计划的事务根、下载缓存与 journal。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn package_dirs_resolve_main_update_paths() {
    let task_root = std::env::temp_dir().join(format!("teyvatguide-defender-{}", Uuid::new_v4()));
    let game_root = task_root.join("game");
    let plan_id = Uuid::new_v4().to_string();
    let dirs = resolve_package_dirs(&task_root, &plan_id, &game_root).unwrap();
    let normalized_task_root = task_root.to_string_lossy().replace('/', "\\");
    let normalized_game_root = game_root.to_string_lossy().replace('/', "\\");
    assert_eq!(dirs.target_root, normalized_game_root);
    assert!(dirs.spool_root.is_empty());
    assert_eq!(
      dirs.staging_root,
      format!("{normalized_game_root}\\.teyvatguide-update\\{plan_id}")
    );
    assert_eq!(dirs.download_root, format!("{normalized_task_root}\\cache\\chunks"));
    assert_eq!(dirs.journal_root, format!("{normalized_task_root}\\tasks\\{plan_id}"));
    assert_eq!(task_root.parent(), Some(std::env::temp_dir().as_path()));
    assert!(task_root.file_name().unwrap().to_string_lossy().starts_with("teyvatguide-defender-"));
    let _ = fs::remove_dir_all(task_root);
  }

  /// 验证目录解析在计划 ID 不是 UUID 时 fail-closed。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn package_dirs_reject_invalid_plan_id() {
    let error =
      resolve_package_dirs(Path::new("C:\\Tasks"), "plan-a", Path::new("C:\\Game")).unwrap_err();
    assert!(error.contains("资源计划 ID 无效"));
  }

  /// 验证旧版登记缺少新增字段时保持 legacy 且不产生拥有路径。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn legacy_registry_defaults_to_empty_ownership() {
    let content = r#"{
      "targetRoot": "C:\\Game",
      "spoolRoot": "C:\\Library\\spool",
      "downloadRoot": "C:\\Cache"
    }"#;
    let registry = serde_json::from_str::<InstallDefenderRegistry>(content)
      .and_then(|registry| serde_json::to_value(validate_registry(registry).unwrap()))
      .unwrap();
    assert_eq!(registry["state"], "legacy");
    assert_eq!(registry["ownedPaths"], serde_json::json!([]));
    assert!(registry.get("targetRoot").is_some());
    assert!(registry.get("dirs").is_none());
  }

  /// 验证拥有路径规范化、去重和目录子集约束。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn owned_paths_are_normalized_deduplicated_and_subset_checked() {
    let dirs = test_dirs();
    let owned = normalize_registry_owned_paths(
      &dirs,
      &["C:/Game/".to_string(), "c:\\GAME".to_string(), "C:\\Cache".to_string()],
    )
    .unwrap();
    assert_eq!(owned, vec!["c:\\game", "c:\\cache"]);
    assert!(normalize_registry_owned_paths(&dirs, &["C:\\Other".to_string()]).is_err());
  }

  /// 验证 legacy 登记不会接受无法证明来源的拥有路径。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn legacy_registry_with_owned_paths_is_rejected() {
    let registry = InstallDefenderRegistry {
      dirs: test_dirs(),
      owned_paths: vec!["C:\\Game".to_string()],
      state: DefenderRegistryState::Legacy,
    };
    assert!(validate_registry(registry).is_err());
  }

  /// 验证共享路径不会被当前登记的清理候选选中。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn cleanup_keeps_paths_referenced_by_other_registry() {
    let paths = vec!["C:\\Game".to_string(), "C:\\Cache".to_string()];
    let retained = HashSet::from(["c:\\game".to_string()]);
    assert_eq!(removable_exclusion_paths(&paths, &retained), vec!["C:\\Cache"]);
  }

  /// 验证共享 owned 与本次可移除候选被明确分离。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn cleanup_retains_shared_owned_paths_and_removes_only_unique_candidates() {
    let owned = vec!["C:\\Game".to_string(), "C:\\Cache".to_string(), "C:\\Tasks".to_string()];
    let retained = HashSet::from(["c:\\game".to_string(), "c:\\tasks".to_string()]);
    assert_eq!(
      retained_owned_paths(&owned, &retained),
      vec!["C:\\Game".to_string(), "C:\\Tasks".to_string()]
    );
    assert_eq!(removable_exclusion_paths(&owned, &retained), vec!["C:\\Cache"]);
  }

  /// 验证完整但部分清理回执只恢复仍确认存在的路径，不恢复候选旧 ownership。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn cleanup_remaining_owned_paths_excludes_deleted_or_unconfirmed_candidates() {
    let dirs = test_dirs();
    let remaining =
      remaining_owned_paths(&dirs, &["C:\\Game".to_string()], &["C:\\Cache".to_string()]).unwrap();
    assert_eq!(remaining, vec!["c:\\game".to_string(), "c:\\cache".to_string()]);
    assert!(!remaining.contains(&"c:\\tasks".to_string()));
  }

  /// 验证其它登记即使是 legacy 也保留完整目录集合，不猜测其 owned_paths。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn other_registry_retention_uses_full_dirs_for_legacy() {
    let registry = InstallDefenderRegistry {
      dirs: test_dirs(),
      owned_paths: Vec::new(),
      state: DefenderRegistryState::Legacy,
    };
    let retained = retained_registry_path_keys(&registry);
    assert!(retained.contains("c:\\game"));
    assert!(retained.contains("c:\\cache"));
    assert!(retained.contains("c:\\tasks"));
  }
}
