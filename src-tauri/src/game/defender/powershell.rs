//! Windows Defender PowerShell/UAC 边界与结构化回执协议。
//!
//! 登记、路径所有权和清理策略保留在父模块；本模块只负责系统命令、脚本、编码与回执。
//! @since Beta v0.13.0

use serde::{Deserialize, Serialize};
use std::{fs, path::Path, process::Command};
use uuid::Uuid;

use super::{normalize_windows_path, path_text};

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

/// 将全新安装涉及目录加入 Windows Defender 排除列表（UAC 提权）。
///
/// @since Beta v0.13.0
pub(super) fn add_exclusions(paths: &[String]) -> DefenderMutationReceipt {
  run_defender_elevated(paths, false)
}

/// 将全新安装涉及目录移出 Windows Defender 排除列表（UAC 提权）。
///
/// @since Beta v0.13.0
pub(super) fn remove_exclusions(paths: &[String]) -> DefenderMutationReceipt {
  run_defender_elevated(paths, true)
}

/// 通过 PowerShell UAC 提权执行 Defender 排除的添加或移除。
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
///
/// @since Beta v0.13.0
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
/// @since Beta v0.13.0
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
/// @since Beta v0.13.0
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
/// @since Beta v0.13.0
fn ps_quote(value: &str) -> String {
  format!("'{}'", value.replace('\'', "''"))
}

/// 构造执行 Defender 排除增删的内层 PowerShell 脚本。
///
/// @since Beta v0.13.0
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
/// @since Beta v0.13.0
fn utf16le_bytes(text: &str) -> Vec<u8> {
  let mut bytes = Vec::with_capacity(text.len() * 2);
  for unit in text.encode_utf16() {
    bytes.extend_from_slice(&unit.to_le_bytes());
  }
  bytes
}

/// 使用标准 Base64 编码字节数据。
///
/// @since Beta v0.13.0
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

#[cfg(test)]
mod tests {
  use super::{
    DefenderMutationReceipt, base64_encode, build_inner_script, ps_quote, read_status_file,
    utf16le_bytes,
  };
  #[cfg(target_os = "windows")]
  use std::{fs, process::Command};
  #[cfg(target_os = "windows")]
  use uuid::Uuid;

  #[cfg(target_os = "windows")]
  use super::super::path_text;

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
