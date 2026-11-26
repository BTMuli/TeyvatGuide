//! WebDAV 凭据的本机硬件加密存储，不接入数据库、导出或同步快照。
//! @since Beta v0.14.2

use crate::sync_webdav::{parse_directory, validate_password, validate_username};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  fs::{self, File},
  io::{self, Read, Write},
  path::Path,
};
use url::Url;
use zeroize::Zeroizing;

#[cfg(target_os = "macos")]
#[path = "sync_credentials/macos.rs"]
mod hardware;
#[cfg(target_os = "windows")]
#[path = "sync_credentials/windows.rs"]
mod hardware;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod hardware {
  use super::{HardwareError, HardwareResult};

  /// 其他平台没有硬件密码存储后端。
  /// @since Beta v0.14.2
  pub(super) fn is_available() -> bool {
    false
  }

  /// 不降级为软件加密。
  /// @since Beta v0.14.2
  pub(super) fn seal(_: &[u8]) -> HardwareResult<Vec<u8>> {
    Err(HardwareError::Unavailable)
  }

  /// 不尝试使用非硬件密钥解密。
  /// @since Beta v0.14.2
  pub(super) fn open(_: &[u8]) -> HardwareResult<Vec<u8>> {
    Err(HardwareError::Unavailable)
  }

  /// 其他平台不创建密钥。
  /// @since Beta v0.14.2
  pub(super) fn forget() -> HardwareResult<()> {
    Ok(())
  }
}

pub(crate) const FILE_NAME: &str = "record-sync/webdav-credential.json";
const FORMAT_V1: u8 = 1;
const MAX_FILE_BYTES: u64 = 64 * 1024;
const MAX_SEALED_BYTES: usize = 8 * 1024;
const HTTPS_ONLY: &str = "WEBDAV_CREDENTIAL_HTTPS：本机保存的密码仅适用于 HTTPS 目录";
const MISSING: &str = "WEBDAV_CREDENTIAL_MISSING：没有此目录和账号的本机密码，请手动输入";
const READ_FAILED: &str = "WEBDAV_CREDENTIAL_READ：无法解锁本机密码，请重新输入或忘记后重存";
const HARDWARE_UNAVAILABLE: &str = "WEBDAV_CREDENTIAL_HARDWARE：本机硬件保护不可用，请手动输入密码";
const SAVE_FAILED: &str = "WEBDAV_CREDENTIAL_SAVE：未能保存密码，请手动输入或稍后重试";
const FORGET_FILE_FAILED: &str = "WEBDAV_CREDENTIAL_FORGET：无法删除本机密码文件，请重试";
const FORGET_KEY_FAILED: &str =
  "WEBDAV_CREDENTIAL_FORGET_KEY：本机密码已移除；硬件密钥未确认删除，硬件恢复可用后可重试";
pub(crate) const STORAGE_UNAVAILABLE: &str = "WEBDAV_CREDENTIAL_STORAGE：无法访问本机密码存储";

/// 平台层错误不携带密钥、路径或诊断正文。
/// @since Beta v0.14.2
enum HardwareError {
  Unavailable,
  #[cfg(target_os = "windows")]
  Missing,
  #[cfg(any(target_os = "macos", target_os = "windows"))]
  Failed,
}

type HardwareResult<T> = Result<T, HardwareError>;
type CredentialResult<T> = Result<T, &'static str>;

/// 用于界面匹配当前目录和账号的非秘密字段。
/// @since Beta v0.14.2
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CredentialIdentity {
  address: String,
  username: String,
}

/// 有界的磁盘格式。外部元数据不能授权使用密码；硬件密文内部另外校验绑定。
/// @since Beta v0.14.2
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CredentialFile {
  version: u8,
  identity: CredentialIdentity,
  sealed: String,
}

/// 只向主窗口返回状态和目录/用户名，不返回密码、密文或密钥。
/// @since Beta v0.14.2
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialStatus {
  hardware_available: bool,
  has_saved: bool,
  saved: Option<CredentialIdentity>,
}

/// 与 WebDAV 客户端使用同一个解析器，再把作用域限制为 HTTPS。
/// @since Beta v0.14.2
fn https_identity(address: &str, username: &str) -> CredentialResult<Url> {
  let url = parse_directory(address, true)?;
  if url.scheme() != "https" {
    return Err(HTTPS_ONLY);
  }
  validate_username(username)?;
  Ok(url)
}

/// 在硬件密文内同时绑定原始地址、实际解析的完整目录和 Basic 认证用户名。
/// @since Beta v0.14.2
fn identity_digest(url: &Url, address: &str, username: &str) -> [u8; 32] {
  let mut hash = Sha256::new();
  hash.update(b"TeyvatGuide WebDAV password v1\0");
  hash.update(url.as_str().as_bytes());
  hash.update([0]);
  hash.update(address.as_bytes());
  hash.update([0]);
  hash.update(username.as_bytes());
  hash.finalize().into()
}

/// 仅从常规文件读取有界、已识别的信封，不解密。区分缺失与无法读取，后者仍可忘记。
/// @since Beta v0.14.2
fn read_file(path: &Path) -> CredentialResult<Option<CredentialFile>> {
  match fs::symlink_metadata(path) {
    Ok(metadata) if metadata.is_file() && metadata.len() <= MAX_FILE_BYTES => {}
    Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
    _ => return Err(READ_FAILED),
  }
  let mut bytes = Vec::new();
  File::open(path)
    .map_err(|_| READ_FAILED)?
    .take(MAX_FILE_BYTES + 1)
    .read_to_end(&mut bytes)
    .map_err(|_| READ_FAILED)?;
  if bytes.len() as u64 > MAX_FILE_BYTES {
    return Err(READ_FAILED);
  }
  let saved: CredentialFile = serde_json::from_slice(&bytes).map_err(|_| READ_FAILED)?;
  if saved.version != FORMAT_V1
    || saved.sealed.is_empty()
    || saved.sealed.len() > MAX_SEALED_BYTES * 2
    || !saved.sealed.len().is_multiple_of(2)
    || !saved.sealed.bytes().all(|byte| byte.is_ascii_hexdigit())
    || https_identity(&saved.identity.address, &saved.identity.username).is_err()
  {
    return Err(READ_FAILED);
  }
  Ok(Some(saved))
}

/// 查询可用性与已保存或可清理的状态，不接触明文密码。
/// @since Beta v0.14.2
pub(crate) fn status(path: &Path) -> CredentialStatus {
  let hardware_available = hardware::is_available();
  let (has_saved, saved) = match read_file(path) {
    Ok(Some(file)) => (true, Some(file.identity)),
    #[cfg(target_os = "windows")]
    Ok(None) if hardware_available => (hardware::has_retained_key(), None),
    Ok(None) => (false, None),
    Err(_) => (true, None),
  };
  CredentialStatus { hardware_available, has_saved, saved }
}

/// 在同一目录原子替换密文。如果写入失败，保留之前的密码文件。
/// @since Beta v0.14.2
fn write_file(path: &Path, saved: &CredentialFile) -> CredentialResult<()> {
  let directory = path.parent().ok_or(SAVE_FAILED)?;
  let bytes = serde_json::to_vec(saved).map_err(|_| SAVE_FAILED)?;
  if bytes.len() as u64 > MAX_FILE_BYTES {
    return Err(SAVE_FAILED);
  }
  fs::create_dir_all(directory).map_err(|_| SAVE_FAILED)?;
  let mut temporary = tempfile::NamedTempFile::new_in(directory).map_err(|_| SAVE_FAILED)?;
  temporary.write_all(&bytes).map_err(|_| SAVE_FAILED)?;
  temporary.as_file().sync_all().map_err(|_| SAVE_FAILED)?;
  temporary.persist(path).map_err(|_| SAVE_FAILED)?;
  Ok(())
}

/// 仅显式保存时尝试硬件加密；验证一次本机解锁后才替换旧密文。
/// @since Beta v0.14.2
pub(crate) fn save(
  path: &Path,
  address: String,
  username: String,
  password: &str,
) -> CredentialResult<()> {
  let url = https_identity(&address, &username)?;
  validate_password(password)?;
  if password.is_empty() {
    return Err(MISSING);
  }
  let binding = identity_digest(&url, &address, &username);
  let mut plaintext = Zeroizing::new(Vec::with_capacity(binding.len() + password.len()));
  plaintext.extend_from_slice(&binding);
  plaintext.extend_from_slice(password.as_bytes());
  let map_hw_error = |error| {
    if matches!(error, HardwareError::Unavailable) { HARDWARE_UNAVAILABLE } else { SAVE_FAILED }
  };
  let sealed = hardware::seal(&plaintext).map_err(map_hw_error)?;
  if sealed.is_empty() || sealed.len() > MAX_SEALED_BYTES {
    return Err(SAVE_FAILED);
  }
  let verified = Zeroizing::new(hardware::open(&sealed).map_err(map_hw_error)?);
  if *verified != *plaintext {
    return Err(SAVE_FAILED);
  }
  write_file(
    path,
    &CredentialFile {
      version: FORMAT_V1,
      identity: CredentialIdentity { address, username },
      sealed: hex::encode(sealed),
    },
  )
}

/// 只为保存时的 HTTPS 目录和账号解锁；明文仅供 Rust 网络请求使用。
/// @since Beta v0.14.2
pub(crate) fn load(path: &Path, address: &str, username: &str) -> CredentialResult<String> {
  let url = https_identity(address, username)?;
  let file = read_file(path)?.ok_or(MISSING)?;
  if file.identity.address != address || file.identity.username != username {
    return Err(MISSING);
  }
  let sealed = hex::decode(file.sealed).map_err(|_| READ_FAILED)?;
  let plaintext = Zeroizing::new(hardware::open(&sealed).map_err(|error| {
    if matches!(error, HardwareError::Unavailable) { HARDWARE_UNAVAILABLE } else { READ_FAILED }
  })?);
  let binding = identity_digest(&url, address, username);
  let password = plaintext.strip_prefix(binding.as_slice()).ok_or(READ_FAILED)?;
  let password = std::str::from_utf8(password).map_err(|_| READ_FAILED)?;
  if password.is_empty() || validate_password(password).is_err() {
    return Err(READ_FAILED);
  }
  Ok(password.to_owned())
}

/// 先停止保存密码的重用，再尝试删除专用硬件密钥。不存在时可重复调用。
/// @since Beta v0.14.2
pub(crate) fn forget(path: &Path) -> CredentialResult<()> {
  match fs::remove_file(path) {
    Ok(()) => {}
    Err(error) if error.kind() == io::ErrorKind::NotFound => {}
    Err(_) => return Err(FORGET_FILE_FAILED),
  }
  hardware::forget().map_err(|_| FORGET_KEY_FAILED)
}
