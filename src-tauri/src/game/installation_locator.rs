//! 国服游戏安装候选发现：合并 HoYoPlay 登记与 Unity 日志来源。
//! @since Beta v0.11.5

use super::{
  installation::inspect_executable,
  model::{
    GameInstallation, GameInstallationCandidate, GameInstallationDiscovery,
    InstallationDiscoveryNotice, InstallationDiscoverySource,
  },
};

#[cfg(target_os = "windows")]
use super::model::InstallationStatus;

/// HoYoPlay 登记国服客户端安装路径的注册表白名单键（当前用户）。
#[cfg(target_os = "windows")]
const HOYOPLAY_REGISTRY_KEYS: [&str; 2] =
  [r"Software\miHoYo\HYP\1_1\hk4e_cn", r"Software\miHoYo\HYP\1_1\hk4e_bilibili"];

/// HoYoPlay 登记安装路径使用的注册表值名。
#[cfg(target_os = "windows")]
const HOYOPLAY_PATH_VALUE: &str = "GameInstallPath";

/// 国服客户端可执行文件名。
#[cfg(target_os = "windows")]
const EXECUTABLE_NAME: &str = "YuanShen.exe";

/// Unity 日志单次发现的读取上限；超出时只读取头部与尾部样本。
#[cfg(target_os = "windows")]
const UNITY_LOG_READ_LIMIT: usize = 8 * 1024 * 1024;

/// 汇总各来源候选，经安装检测、按安装 ID 去重合并并稳定排序后返回发现报告。
///
/// 单个来源失败只会记录来源级 notice，不影响其他来源；未发现任何候选属于正常空结果。
pub fn discover_installations(machine_uid: &str) -> GameInstallationDiscovery {
  #[cfg(not(target_os = "windows"))]
  {
    let _ = machine_uid;
    GameInstallationDiscovery { candidates: Vec::new(), notices: Vec::new() }
  }
  #[cfg(target_os = "windows")]
  {
    let started = std::time::Instant::now();
    let mut raw: Vec<(InstallationDiscoverySource, Vec<String>)> = Vec::new();
    let mut notices: Vec<InstallationDiscoveryNotice> = Vec::new();
    collect_hoyoplay_candidates(&mut raw);
    collect_unity_log_candidates(&mut raw, &mut notices);

    let raw_count: usize = raw.iter().map(|(_, paths)| paths.len()).sum();
    let hits: Vec<_> = raw
      .into_iter()
      .flat_map(|(source, paths)| paths.into_iter().map(move |path| (source, path)))
      .filter_map(|(source, path)| {
        inspect_executable(&path, machine_uid).ok().map(|installation| (source, installation))
      })
      .collect();
    let discovery = GameInstallationDiscovery { candidates: merge_candidates(hits), notices };
    log::debug!(
      "游戏安装自动定位完成：原始候选 {raw_count} 个，去重后 {} 个，告警 {:?}，耗时 {:?}",
      discovery.candidates.len(),
      discovery.notices.iter().map(|notice| notice.code.as_str()).collect::<Vec<_>>(),
      started.elapsed()
    );
    discovery
  }
}

#[cfg(target_os = "windows")]
/// 读取 HoYoPlay 白名单注册表键中的安装登记，过滤出仍存在的可执行文件候选。
fn collect_hoyoplay_candidates(raw: &mut Vec<(InstallationDiscoverySource, Vec<String>)>) {
  let paths: Vec<String> = hoyoplay_registry_values()
    .iter()
    .filter_map(|value| to_executable_path(value))
    .filter(|path| is_existing_file(path))
    .collect();
  raw.push((InstallationDiscoverySource::HoyoPlayRegistry, paths));
}

#[cfg(target_os = "windows")]
/// 解析两份 Unity 日志中的最近运行路径；日志被占用等故障只降级为来源级 notice。
fn collect_unity_log_candidates(
  raw: &mut Vec<(InstallationDiscoverySource, Vec<String>)>,
  notices: &mut Vec<InstallationDiscoveryNotice>,
) {
  let source = InstallationDiscoverySource::UnityLog;
  let Some(log_paths) = unity_log_paths() else {
    push_notice(notices, source, "local_low_unavailable");
    raw.push((source, Vec::new()));
    return;
  };
  let mut paths: Vec<String> = Vec::new();
  let mut unreadable = false;
  for log_path in log_paths {
    if !log_path.is_file() {
      continue;
    }
    match read_log_sample(&log_path) {
      Some(content) => paths.extend(
        extract_yuanshen_executables(&content).into_iter().filter(|path| is_existing_file(path)),
      ),
      None => unreadable = true,
    }
  }
  if unreadable {
    push_notice(notices, source, "unity_log_unreadable");
  }
  raw.push((source, paths));
}

#[cfg(target_os = "windows")]
/// 追加去重后的结构化告警；code 只包含稳定错误码，不含本地路径。
fn push_notice(
  notices: &mut Vec<InstallationDiscoveryNotice>,
  source: InstallationDiscoverySource,
  code: &'static str,
) {
  let notice = InstallationDiscoveryNotice { source, code: code.to_string() };
  if !notices
    .iter()
    .any(|existing| existing.source == notice.source && existing.code == notice.code)
  {
    notices.push(notice);
  }
}

#[cfg(target_os = "windows")]
/// 读取 HoYoPlay 固定白名单键下的 `GameInstallPath` 值。
///
/// 键不存在、值类型不符或值为空都属于正常情况，静默跳过而不产生错误。
fn hoyoplay_registry_values() -> Vec<String> {
  use winreg::RegKey;
  use winreg::enums::HKEY_CURRENT_USER;
  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let mut values = Vec::new();
  for subkey in HOYOPLAY_REGISTRY_KEYS {
    let Ok(key) = hkcu.open_subkey(subkey) else {
      continue;
    };
    if let Ok(value) = key.get_value::<String, _>(HOYOPLAY_PATH_VALUE) {
      values.push(value);
    }
  }
  values
}

#[cfg(target_os = "windows")]
/// 通过已知文件夹 API 获取 LocalLow 目录，避免手工拼接 `USERPROFILE`。
fn local_app_data_low() -> Option<std::path::PathBuf> {
  use widestring::U16CString;
  use windows_sys::Win32::System::Com::CoTaskMemFree;
  use windows_sys::Win32::UI::Shell::{FOLDERID_LocalAppDataLow, SHGetKnownFolderPath};
  let mut raw_path: windows_sys::core::PWSTR = std::ptr::null_mut();
  // SAFETY: 返回的系统缓冲区在拷贝完成后立即释放。
  let result = unsafe {
    SHGetKnownFolderPath(&FOLDERID_LocalAppDataLow, 0, std::ptr::null_mut(), &mut raw_path)
  };
  if result != 0 || raw_path.is_null() {
    return None;
  }
  // SAFETY: raw_path 由系统保证以 NUL 结尾。
  unsafe {
    let text = U16CString::from_ptr_str(raw_path).to_string_lossy();
    CoTaskMemFree(raw_path.cast());
    (!text.is_empty()).then(|| std::path::PathBuf::from(text))
  }
}

#[cfg(target_os = "windows")]
/// 返回国服客户端两份 Unity 日志的完整路径。
fn unity_log_paths() -> Option<Vec<std::path::PathBuf>> {
  let mihooyo = local_app_data_low()?.join("miHoYo");
  Some(vec![
    mihooyo.join("原神").join("output_log.txt"),
    mihooyo.join("Genshin Impact").join("output_log.txt"),
  ])
}

#[cfg(target_os = "windows")]
/// 有上限地读取日志内容；日志异常增大时只取头部与尾部样本。
fn read_log_sample(log_path: &std::path::Path) -> Option<String> {
  use std::io::{BufReader, Read, Seek, SeekFrom};
  let file = std::fs::File::open(log_path).ok()?;
  let len = file.metadata().ok()?.len() as usize;
  let mut reader = BufReader::new(file);
  let mut bytes = Vec::new();
  if len <= UNITY_LOG_READ_LIMIT {
    reader.read_to_end(&mut bytes).ok()?;
    return Some(String::from_utf8_lossy(&bytes).into_owned());
  }
  let half = UNITY_LOG_READ_LIMIT / 2;
  (&mut reader).take(half as u64).read_to_end(&mut bytes).ok()?;
  reader.seek(SeekFrom::Start((len - half) as u64)).ok()?;
  reader.take(half as u64).read_to_end(&mut bytes).ok()?;
  Some(String::from_utf8_lossy(&bytes).into_owned())
}

/// 将 HoYoPlay 登记值转换为指向 `YuanShen.exe` 的候选路径。
///
/// 兼容目录值（含结尾分隔符）、已指向可执行文件的值以及正斜杠写法。
#[cfg(target_os = "windows")]
fn to_executable_path(raw_value: &str) -> Option<String> {
  let trimmed = raw_value.trim().trim_matches('"');
  if trimmed.is_empty() {
    return None;
  }
  let normalized = trimmed.replace('/', "\\");
  if normalized.to_ascii_lowercase().ends_with("\\yuanshen.exe") {
    return Some(normalized);
  }
  if normalized.ends_with('\\') {
    return Some(format!("{normalized}{EXECUTABLE_NAME}"));
  }
  Some(format!("{normalized}\\{EXECUTABLE_NAME}"))
}

/// 判断候选路径是否仍指向磁盘上的普通文件；过期登记直接跳过。
#[cfg(target_os = "windows")]
fn is_existing_file(path: &str) -> bool {
  std::path::Path::new(path).is_file()
}

/// 从 Unity 日志内容中按行解析全部 `YuanShen_Data` 同目录的可执行文件候选。
#[cfg(target_os = "windows")]
fn extract_yuanshen_executables(content: &str) -> Vec<String> {
  let mut found: Vec<String> = Vec::new();
  for line in content.lines() {
    let Some(executable) = executable_from_line(line) else {
      continue;
    };
    if found.iter().any(|existing| existing.eq_ignore_ascii_case(&executable)) {
      continue;
    }
    found.push(executable);
  }
  found
}

/// 解析单行日志，恢复 `YuanShen_Data` 同目录的 `YuanShen.exe` 完整路径。
#[cfg(target_os = "windows")]
fn executable_from_line(line: &str) -> Option<String> {
  const NEEDLE: &str = "yuanshen_data";
  let index = line.to_ascii_lowercase().find(NEEDLE)?;
  let directory = directory_from_drive_marker(&line[..index])?;
  Some(format!("{directory}\\{EXECUTABLE_NAME}"))
}

/// 在行前缀中定位最后一个盘符边界，返回归一化为反斜杠分隔的目录段。
///
/// 时间戳中的冒号与 URL 协议前缀不会被视为盘符；目录允许包含中文与空格。
#[cfg(target_os = "windows")]
fn directory_from_drive_marker(prefix: &str) -> Option<String> {
  let bytes = prefix.as_bytes();
  for index in (1..bytes.len()).rev() {
    if bytes[index] != b':' || !bytes[index - 1].is_ascii_alphabetic() {
      continue;
    }
    if !matches!(bytes.get(index + 1), Some(b'\\' | b'/')) {
      continue;
    }
    // 连续分隔符通常是 URL 协议而不是盘符根。
    if matches!(bytes.get(index + 2), Some(b'\\' | b'/')) {
      continue;
    }
    let segment = prefix[index - 1..].replace('/', "\\");
    let trimmed = segment.trim_end_matches('\\');
    return (!trimmed.is_empty()).then(|| trimmed.to_string());
  }
  None
}

/// 按规范化后的安装 ID 合并多来源命中，并按状态、来源优先级与路径稳定排序。
#[cfg(target_os = "windows")]
fn merge_candidates(
  hits: Vec<(InstallationDiscoverySource, GameInstallation)>,
) -> Vec<GameInstallationCandidate> {
  let mut candidates: Vec<GameInstallationCandidate> = Vec::new();
  for (source, installation) in hits {
    if let Some(existing) =
      candidates.iter_mut().find(|candidate| candidate.installation.id == installation.id)
    {
      if !existing.sources.contains(&source) {
        existing.sources.push(source);
        existing.sources.sort_by_key(|item| source_rank(*item));
      }
      continue;
    }
    candidates.push(GameInstallationCandidate { installation, sources: vec![source] });
  }
  candidates.sort_by(|left, right| {
    status_rank(left.installation.status)
      .cmp(&status_rank(right.installation.status))
      .then_with(|| source_rank_of(&left.sources).cmp(&source_rank_of(&right.sources)))
      .then_with(|| {
        left
          .installation
          .executable_path
          .to_lowercase()
          .cmp(&right.installation.executable_path.to_lowercase())
      })
  });
  candidates
}

/// 状态排序权重：可用优先于不一致，不一致优先于不支持。
#[cfg(target_os = "windows")]
fn status_rank(status: InstallationStatus) -> u8 {
  match status {
    InstallationStatus::Known => 0,
    InstallationStatus::Inconsistent => 1,
    InstallationStatus::Unsupported => 2,
  }
}

/// 单个候选的来源排序权重：HoYoPlay 登记命中优先于仅游戏日志命中。
#[cfg(target_os = "windows")]
fn source_rank(source: InstallationDiscoverySource) -> u8 {
  match source {
    InstallationDiscoverySource::HoyoPlayRegistry => 0,
    InstallationDiscoverySource::UnityLog => 1,
  }
}

#[cfg(target_os = "windows")]
fn source_rank_of(sources: &[InstallationDiscoverySource]) -> u8 {
  sources.iter().copied().map(source_rank).min().unwrap_or(u8::MAX)
}
