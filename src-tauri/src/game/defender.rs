//! Windows Defender 排除目录的临时管理与提权执行。
//! 全新安装前将目标目录、临时 spool、暂存目录、下载缓存与任务 journal
//! 加入 Defender 白名单，安装结束后自动移出，避免实时防护扫描造成磁盘 I/O 停滞。
//! @since Beta v0.13.0

use serde::{Deserialize, Serialize};
use std::{
  collections::HashSet,
  fs, io,
  path::{Path, PathBuf},
  process::Command,
  sync::{Mutex, MutexGuard, OnceLock},
};
use uuid::Uuid;

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

/// 一次 Defender 提权变更的结构化回执。
///
/// `owned_present` 与 `owned_missing` 只描述本次操作可确认归属的路径，
/// `requested_missing` 描述全部请求路径的缺失情况；回执不完整时调用方必须保留
/// pending 登记，不能猜测新增路径。
///
/// @since Beta v0.13.0
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DefenderMutationReceipt {
  #[serde(default)]
  pub(crate) schema_version: u32,
  #[serde(default, deserialize_with = "deserialize_string_vec")]
  pub(crate) owned_present: Vec<String>,
  #[serde(default, deserialize_with = "deserialize_string_vec")]
  pub(crate) owned_missing: Vec<String>,
  #[serde(default, deserialize_with = "deserialize_string_vec")]
  pub(crate) requested_missing: Vec<String>,
  #[serde(default, deserialize_with = "deserialize_optional_string")]
  pub(crate) error: Option<String>,
  #[serde(default, deserialize_with = "deserialize_optional_string")]
  pub(crate) compensation_error: Option<String>,
  #[serde(default)]
  pub(crate) complete: bool,
}

impl DefenderMutationReceipt {
  /// 判断回执结构是否完整且来自当前协议版本。
  ///
  /// @since Beta v0.13.0
  pub(crate) fn is_complete(&self) -> bool {
    self.schema_version == 1 && self.complete
  }

  /// 判断回执是否足以将登记提升为 active。
  ///
  /// @since Beta v0.13.0
  pub(crate) fn is_success(&self) -> bool {
    self.is_complete()
      && self.error.is_none()
      && self.compensation_error.is_none()
      && self.owned_missing.is_empty()
      && self.requested_missing.is_empty()
  }

  /// 返回可直接展示给调用方的失败说明。
  ///
  /// @since Beta v0.13.0
  pub(crate) fn error_message(&self, operation: &str) -> String {
    let mut parts = Vec::new();
    if let Some(error) = &self.error {
      parts.push(error.clone());
    }
    if let Some(error) = &self.compensation_error {
      parts.push(format!("补偿清理失败：{error}"));
    }
    if operation == "移除" && !self.owned_present.is_empty() {
      parts.push(format!("移除后仍有 {} 个排除路径存在", self.owned_present.len()));
    } else if operation != "移除" && !self.owned_missing.is_empty() {
      parts.push(format!("{operation} 后仍有 {} 个排除路径未确认", self.owned_missing.len()));
    }
    if !self.requested_missing.is_empty() {
      parts.push(format!("请求的 {} 个排除路径未确认", self.requested_missing.len()));
    }
    if !self.is_complete() {
      parts.push("未收到完整的 Defender 操作回执，已保留待处理登记".to_string());
    }
    if parts.is_empty() {
      parts.push(format!("{operation} Defender 排除失败"));
    }
    parts.join("；")
  }
}

/// 为 PowerShell 兼容地读取单值或数组形式的字符串字段。
///
/// @since Beta v0.13.0
fn deserialize_string_vec<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
  D: serde::Deserializer<'de>,
{
  let value = Option::<serde_json::Value>::deserialize(deserializer)?;
  match value {
    None | Some(serde_json::Value::Null) => Ok(Vec::new()),
    Some(serde_json::Value::String(value)) => Ok(vec![value]),
    Some(serde_json::Value::Array(values)) => values
      .into_iter()
      .map(|value| {
        value
          .as_str()
          .map(str::to_string)
          .ok_or_else(|| serde::de::Error::custom("字符串数组包含非字符串值"))
      })
      .collect(),
    Some(_) => Err(serde::de::Error::custom("字段必须是字符串或字符串数组")),
  }
}

/// 将历史协议中的空错误字符串兼容为无错误；PowerShell 成功回执应输出 null。
///
/// @since Beta v0.13.0
fn deserialize_optional_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
  D: serde::Deserializer<'de>,
{
  let value = Option::<String>::deserialize(deserializer)?;
  Ok(value.filter(|value| !value.is_empty()))
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
  run_defender_elevated(paths, false)
}

/// 将全新安装涉及目录移出 Windows Defender 排除列表（UAC 提权）。
///
/// @since Beta v0.13.0
pub(crate) fn remove_exclusions(paths: &[String]) -> DefenderMutationReceipt {
  run_defender_elevated(paths, true)
}

/// 通过 PowerShell UAC 提权执行 Defender 排除的添加或移除。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `paths`: 待处理的目录路径。
/// - `remove`: `true` 表示移除，`false` 表示添加。
///
/// # 返回
/// 无论提权进程成功、失败或回执不完整，都返回结构化结果；调用方据此决定是否
/// 保留 pending/cleanup_required 登记。
///
/// @since Beta v0.13.0
fn run_defender_elevated(paths: &[String], remove: bool) -> DefenderMutationReceipt {
  let paths = paths.iter().map(|path| normalize_windows_path(path)).collect::<Vec<String>>();
  for path in &paths {
    if let Err(error) = validate_exclusion_path(path) {
      return DefenderMutationReceipt { error: Some(error), ..Default::default() };
    }
  }
  let status_file = std::env::temp_dir().join(format!("tg-defender-{}.txt", Uuid::new_v4()));
  let status_text = ps_quote(&path_text(&status_file));
  let inner = build_inner_script(&status_text, &paths, remove);
  let encoded = base64_encode(&utf16le_bytes(&inner));
  let outer = build_outer_script(&status_text, &encoded);
  // 外层脚本也走 -EncodedCommand：直接传 -Command 时，PowerShell 报错会把整段
  // 可读脚本回显到 stderr，导致日志文件被大段脚本污染。
  let outer_encoded = base64_encode(&utf16le_bytes(&outer));
  let output = match Command::new("powershell.exe")
    .arg("-NoProfile")
    .arg("-NonInteractive")
    .arg("-ExecutionPolicy")
    .arg("Bypass")
    .arg("-EncodedCommand")
    .arg(&outer_encoded)
    .output()
  {
    Ok(output) => output,
    Err(error) => {
      return DefenderMutationReceipt {
        error: Some(format!("启动 PowerShell 失败：{error}")),
        ..Default::default()
      };
    }
  };
  let status = read_status_file(&status_file);
  let _ = fs::remove_file(&status_file);
  if let Some(status) = status {
    match serde_json::from_str::<DefenderMutationReceipt>(&status) {
      Ok(receipt) => return receipt,
      Err(error) => {
        return DefenderMutationReceipt {
          error: Some(format!("解析 Defender 操作回执失败：{error}")),
          ..Default::default()
        };
      }
    }
  }
  let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
  let message = if !stderr.is_empty() {
    sanitize_powershell_error(&stderr)
  } else if !stdout.is_empty() {
    sanitize_powershell_error(&stdout)
  } else if !output.status.success() {
    "未知错误（可能取消了 UAC 授权）".to_string()
  } else {
    "提权进程未返回 Defender 操作回执".to_string()
  };
  DefenderMutationReceipt { error: Some(message), ..Default::default() }
}

/// 将 PowerShell 报错压缩为单行短消息，避免把整段脚本或调用栈写入日志。
fn sanitize_powershell_error(text: &str) -> String {
  const MAX_LOG_CHARS: usize = 400;
  let compact = text.split_whitespace().collect::<Vec<_>>().join(" ");
  let mut capped = String::new();
  for ch in compact.chars().take(MAX_LOG_CHARS) {
    capped.push(ch);
  }
  if compact.chars().count() > MAX_LOG_CHARS {
    capped.push('…');
  }
  capped
}

/// 读取 PowerShell 状态文件内容，空内容返回 `None`。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 状态文件路径。
///
/// # 返回
/// 去除首尾空白后的状态文本。
fn read_status_file(path: &Path) -> Option<String> {
  let bytes = fs::read(path).ok()?;
  let text = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
    String::from_utf8_lossy(&bytes[3..])
  } else {
    String::from_utf8_lossy(&bytes)
  };
  let text = text.trim();
  if text.is_empty() { None } else { Some(text.to_string()) }
}

/// 校验排除路径为不含通配符的绝对非盘根路径。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `path`: 待校验的路径。
///
/// # 返回
/// - `Ok(())`: 路径合法。
/// - `Err(String)`: 路径非法的错误描述。
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

/// 将字符串转换为 PowerShell 单引号字符串。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `value`: 待引用的字符串。
///
/// # 返回
/// PowerShell 单引号字符串。
fn ps_quote(value: &str) -> String {
  format!("'{}'", value.replace('\'', "''"))
}

/// 构造执行 Defender 排除增删的内层 PowerShell 脚本。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `status_file`: 状态文件路径。
/// - `paths`: 待处理的目录路径。
/// - `remove`: 是否为移除操作。
///
/// # 返回
/// 内层脚本文本。
fn build_inner_script(status_file: &str, paths: &[String], remove: bool) -> String {
  let path_list = paths
    .iter()
    .map(|path| ps_quote(&normalize_windows_path(path)))
    .collect::<Vec<String>>()
    .join(", ");
  let mutation = if remove {
    r#"
$wanted = @($paths | ForEach-Object { Normalize-ExclusionPath $_ } | Select-Object -Unique)
$toRemove = @($wanted | Where-Object { $_ -in $original })
foreach ($p in $toRemove) { Remove-MpPreference -ExclusionPath $p }
$current = @(Read-ExclusionPaths)
$ownedPresent = @($wanted | Where-Object { $_ -in $current })
$ownedMissing = @($wanted | Where-Object { $_ -notin $current })
$requestedMissing = @()
"#
  } else {
    r#"
$toAdd = @($paths | ForEach-Object { Normalize-ExclusionPath $_ } | Where-Object { $_ -notin $original } | Select-Object -Unique)
$addedThisRound = @()
foreach ($p in $toAdd) {
  Add-MpPreference -ExclusionPath $p
  $addedThisRound += $p
}
$current = @(Read-ExclusionPaths)
$ownedPresent = @($toAdd | Where-Object { $_ -in $current })
$ownedMissing = @($toAdd | Where-Object { $_ -notin $current })
$requestedMissing = @($paths | ForEach-Object { Normalize-ExclusionPath $_ } | Where-Object { $_ -notin $current } | Select-Object -Unique)
"#
  };
  let compensation = if remove {
    r#"
$current = @(Read-ExclusionPaths)
$ownedPresent = @($wanted | Where-Object { $_ -in $current })
$ownedMissing = @($wanted | Where-Object { $_ -notin $current })
$requestedMissing = @()
"#
  } else {
    r#"
try {
  $current = @(Read-ExclusionPaths)
} catch {
  $compensationErrors += $_.Exception.Message
}
foreach ($p in $addedThisRound) {
  try {
    Remove-MpPreference -ExclusionPath $p
  } catch {
    $compensationErrors += $_.Exception.Message
  }
}
$current = @(Read-ExclusionPaths)
$ownedPresent = @($toAdd | Where-Object { $_ -in $current })
$ownedMissing = @($toAdd | Where-Object { $_ -notin $current })
$requestedMissing = @($paths | ForEach-Object { Normalize-ExclusionPath $_ } | Where-Object { $_ -notin $current } | Select-Object -Unique)
"#
  };
  let final_check = if remove {
    "if ($complete -and $errorMessage -eq $null -and $compensationErrors.Count -eq 0) {"
  } else {
    "if ($complete -and $errorMessage -eq $null -and $compensationErrors.Count -eq 0 -and $requestedMissing.Count -eq 0) {"
  };
  let template = r#"$ErrorActionPreference = 'Stop'
$statusFile = __STATUS_FILE__
$paths = @(__PATH_LIST__)

function Normalize-ExclusionPath([string]$p) {
  $n = (($p.Replace('/', '\')).TrimEnd('\'))
  try { $n = [System.IO.Path]::GetFullPath($n) } catch {}
  return $n.ToLowerInvariant()
}

function Read-ExclusionEntries {
  return @(Get-MpPreference -ErrorAction Stop | Select-Object -ExpandProperty ExclusionPath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Read-ExclusionPaths {
  return @(Read-ExclusionEntries | ForEach-Object { Normalize-ExclusionPath $_ })
}

function Write-Receipt([bool]$complete, [object[]]$present, [object[]]$missing, [object[]]$requestedMissing, $error, $compensationError) {
  $payload = [ordered]@{
    schemaVersion = 1
    complete = $complete
    ownedPresent = @($present)
    ownedMissing = @($missing)
    requestedMissing = @($requestedMissing)
    error = $error
    compensationError = $compensationError
  }
  $utf8 = New-Object System.Text.UTF8Encoding $true
  [System.IO.File]::WriteAllText($statusFile, ($payload | ConvertTo-Json -Compress -Depth 4), $utf8)
}

$original = @()
$toAdd = @()
$addedThisRound = @()
$wanted = @()
$ownedPresent = @()
$ownedMissing = @()
$requestedMissing = @()
$compensationErrors = @()
$errorMessage = $null
$complete = $false
try {
  $original = @(Read-ExclusionPaths)
  __MUTATION__
  $complete = $true
} catch {
  $errorMessage = $_.Exception.Message
  try {
    __COMPENSATION__
    $complete = $true
  } catch {
    $compensationErrors += $_.Exception.Message
    $complete = $false
  }
}

$compensationError = if ($compensationErrors.Count -gt 0) { $compensationErrors -join '; ' } else { $null }
__MISSING_CHECK__
Write-Receipt $complete $ownedPresent $ownedMissing $requestedMissing $errorMessage $compensationError
__FINAL_CHECK__
  exit 0
}
exit 1
"#;
  template
    .replace("__STATUS_FILE__", status_file)
    .replace("__PATH_LIST__", &path_list)
    .replace("__MUTATION__", mutation)
    .replace("__COMPENSATION__", compensation)
    .replace(
      "__MISSING_CHECK__",
      if remove {
        ""
      } else {
        "if ($errorMessage -eq $null -and $requestedMissing.Count -gt 0) {\n  $errorMessage = '请求的排除路径未全部确认'\n}"
      },
    )
    .replace("__FINAL_CHECK__", final_check)
}

/// 构造负责 UAC 提权启动内层脚本的外层 PowerShell 脚本。
///
/// @since Beta v0.13.0
///
/// # 参数
/// - `status_file`: 状态文件路径。
/// - `encoded_command`: 已编码的内层命令。
///
/// # 返回
/// 外层脚本文本。
fn build_outer_script(status_file: &str, encoded_command: &str) -> String {
  r#"$ErrorActionPreference = 'Stop'
$statusFile = __STATUS_FILE__
Remove-Item -LiteralPath $statusFile -ErrorAction Ignore
try {
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','__ENCODED_COMMAND__') -ErrorAction Stop | Out-Null
} catch {
  Write-Error ('提权启动失败：' + $_.Exception.Message)
  exit 1
}
if (Test-Path -LiteralPath $statusFile) {
  $status = [System.IO.File]::ReadAllText($statusFile).Trim()
  Write-Output $status
  exit 0
}
Write-Error '提权进程未返回执行结果'
exit 1
"#
    .replace("__STATUS_FILE__", status_file)
    .replace("__ENCODED_COMMAND__", encoded_command)
}

/// 将文本编码为 UTF-16LE 字节。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `text`: 待编码的文本。
///
/// # 返回
/// UTF-16LE 字节向量。
fn utf16le_bytes(text: &str) -> Vec<u8> {
  let mut bytes = Vec::with_capacity(text.len() * 2);
  for unit in text.encode_utf16() {
    bytes.extend_from_slice(&unit.to_le_bytes());
  }
  bytes
}

/// 使用标准 Base64 编码字节数据。
///
/// @since Beta v0.12.0
///
/// # 参数
/// - `data`: 待编码的字节。
///
/// # 返回
/// Base64 字符串。
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
  use super::*;

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

  /// 验证部分失败回执不能提升为 active 且保留补偿错误。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn partial_receipt_is_not_active_and_keeps_compensation_error() {
    let receipt = serde_json::from_str::<DefenderMutationReceipt>(
      r#"{
        "schemaVersion": 1,
        "complete": true,
        "ownedPresent": ["c:\\game"],
        "ownedMissing": ["c:\\cache"],
        "requestedMissing": ["c:\\cache", "c:\\tasks"],
        "error": "添加失败",
        "compensationError": "移除失败"
      }"#,
    )
    .unwrap();
    assert!(!receipt.is_success());
    let message = receipt.error_message("添加");
    assert!(message.contains("添加失败"));
    assert!(message.contains("补偿清理失败"));
    assert!(message.contains("1 个排除路径未确认"));
    assert!(message.contains("请求的 2 个排除路径未确认"));
  }

  /// 验证预先存在但后来缺失的请求路径也不能将登记提升为 active。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn requested_missing_blocks_active_even_without_owned_missing() {
    let receipt = DefenderMutationReceipt {
      schema_version: 1,
      complete: true,
      requested_missing: vec!["c:\\game".to_string()],
      ..Default::default()
    };
    assert!(!receipt.is_success());
  }

  /// 验证 PowerShell 旧版成功回执的空字符串错误字段仍表示无错误。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn empty_error_strings_are_compatible_with_success_receipts() {
    let receipt = serde_json::from_str::<DefenderMutationReceipt>(
      r#"{
        "schemaVersion": 1,
        "complete": true,
        "ownedPresent": [],
        "ownedMissing": [],
        "requestedMissing": [],
        "error": "",
        "compensationError": ""
      }"#,
    )
    .unwrap();
    assert!(receipt.error.is_none());
    assert!(receipt.compensation_error.is_none());
    assert!(receipt.is_success());
  }

  /// 验证不完整回执保持 pending 安全语义。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn incomplete_receipt_defaults_to_pending_safe_state() {
    let receipt =
      serde_json::from_str::<DefenderMutationReceipt>(r#"{"error":"UAC 取消"}"#).unwrap();
    assert!(!receipt.complete);
    assert!(!receipt.is_success());
    assert!(receipt.error_message("添加").contains("保留待处理登记"));
  }

  /// 只执行内层生成脚本；三个同名本地函数完全替代系统 cmdlet，所有变更仅在内存中。
  /// @since Beta v0.13.0
  #[cfg(target_os = "windows")]
  fn run_memory_mock_script(paths: &[&str]) -> DefenderMutationReceipt {
    let status =
      std::env::temp_dir().join(format!("teyvatguide-defender-mock-{}.json", Uuid::new_v4()));
    let mocks = r#"
$script:Exclusions = @('c:\tg-unit-existing')
function Get-MpPreference {
  [CmdletBinding()] param()
  [pscustomobject]@{ ExclusionPath = $script:Exclusions }
}
function Add-MpPreference {
  [CmdletBinding()] param([string]$ExclusionPath)
  if ($ExclusionPath -eq 'c:\tg-unit-fail') { throw 'mock add failure' }
  $script:Exclusions += $ExclusionPath
}
function Remove-MpPreference {
  [CmdletBinding()] param([string]$ExclusionPath)
  if ($ExclusionPath -ne 'c:\tg-unit-new') { throw 'attempted to remove an unowned path' }
  $script:Exclusions = @($script:Exclusions | Where-Object { $_ -ne $ExclusionPath })
}
"#;
    let paths = paths.iter().map(|path| path.to_string()).collect::<Vec<_>>();
    let script =
      format!("{mocks}\n{}", build_inner_script(&ps_quote(&path_text(&status)), &paths, false));
    let output = Command::new("powershell.exe")
      .args(["-NoProfile", "-NonInteractive", "-EncodedCommand"])
      .arg(base64_encode(&utf16le_bytes(&script)))
      .output()
      .expect("启动纯内存 PowerShell 测试失败");
    let content = read_status_file(&status);
    let _ = fs::remove_file(&status);
    let content = content
      .unwrap_or_else(|| panic!("内存脚本未输出回执：{}", String::from_utf8_lossy(&output.stderr)));
    serde_json::from_str(&content).expect("生成脚本回执不符合 Rust 协议")
  }

  /// 实际执行生成脚本并验证已有排除保护、成功回执及部分失败补偿。
  /// @since Beta v0.13.0
  #[cfg(target_os = "windows")]
  #[test]
  fn generated_script_preserves_ownership_and_reports_real_json() {
    let success = run_memory_mock_script(&["C:\\tg-unit-existing", "C:\\tg-unit-new"]);
    assert!(success.is_success(), "{}", success.error_message("添加"));
    assert_eq!(success.owned_present, vec!["c:\\tg-unit-new"]);
    assert!(success.error.is_none());
    assert!(success.compensation_error.is_none());

    let failed =
      run_memory_mock_script(&["C:\\tg-unit-existing", "C:\\tg-unit-new", "C:\\tg-unit-fail"]);
    assert!(failed.is_complete());
    assert!(!failed.is_success());
    assert!(failed.error.as_deref().is_some_and(|error| error.contains("mock add failure")));
    assert!(failed.compensation_error.is_none());
    assert!(failed.owned_present.is_empty());
    assert!(failed.requested_missing.contains(&"c:\\tg-unit-new".to_string()));
  }
}
