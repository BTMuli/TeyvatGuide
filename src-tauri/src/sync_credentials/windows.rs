//! Windows 当前用户的 TPM 2.0 WebDAV 凭据密封。仅使用平台加密提供程序，不回退到软件密钥。
//! @since Beta v0.14.2

use super::{HardwareError, HardwareResult};
use ring::{
  aead::{self, Aad, LessSafeKey, Nonce, UnboundKey},
  rand::{SecureRandom, SystemRandom},
};
use std::{mem, ptr};
use windows_sys::{
  Win32::{
    Foundation::{
      NTE_BAD_KEYSET, NTE_DEVICE_NOT_READY, NTE_EXISTS, NTE_NOT_FOUND, NTE_NOT_SUPPORTED,
      NTE_SILENT_CONTEXT,
    },
    Security::Cryptography::{
      BCRYPT_OAEP_PADDING_INFO, BCRYPT_SHA256_ALGORITHM, MS_PLATFORM_KEY_STORAGE_PROVIDER,
      NCRYPT_ALLOW_DECRYPT_FLAG, NCRYPT_EXPORT_POLICY_PROPERTY, NCRYPT_HANDLE,
      NCRYPT_IMPL_HARDWARE_FLAG, NCRYPT_IMPL_SOFTWARE_FLAG, NCRYPT_IMPL_TYPE_PROPERTY,
      NCRYPT_KEY_TYPE_PROPERTY, NCRYPT_KEY_USAGE_PROPERTY, NCRYPT_LENGTH_PROPERTY,
      NCRYPT_MACHINE_KEY_FLAG, NCRYPT_PAD_OAEP_FLAG, NCRYPT_RSA_ALGORITHM, NCRYPT_SILENT_FLAG,
      NCryptCreatePersistedKey, NCryptDecrypt, NCryptDeleteKey, NCryptEncrypt, NCryptFinalizeKey,
      NCryptFreeObject, NCryptGetProperty, NCryptIsAlgSupported, NCryptOpenKey,
      NCryptOpenStorageProvider, NCryptSetProperty,
    },
    System::TpmBaseServices::{TPM_DEVICE_INFO, TPM_VERSION_20, Tbsi_GetDeviceInfo},
  },
  core::PCWSTR,
  w,
};
use zeroize::Zeroizing;

const KEY_NAME: PCWSTR = w!("TeyvatGuide.RecordSync.WebDavPassword.TPM.v1");
const RSA_KEY_BITS: u32 = 2048;
const WRAPPED_KEY_BYTES: usize = RSA_KEY_BITS as usize / 8;
const DATA_KEY_BYTES: usize = 32;
const MAX_PLAINTEXT_BYTES: usize = 4128;
const MAX_CIPHERTEXT_BYTES: usize = 8192;
const MAGIC: &[u8; 8] = b"TGTpmV1\0";
const WRAPPED_KEY_OFFSET: usize = MAGIC.len() + aead::NONCE_LEN;
const HEADER_BYTES: usize = WRAPPED_KEY_OFFSET + WRAPPED_KEY_BYTES;
const TAG_BYTES: usize = 16;
const OAEP_FLAGS: u32 = NCRYPT_PAD_OAEP_FLAG | NCRYPT_SILENT_FLAG;

/// 独占有效的 CNG 提供程序或密钥句柄。
/// @since Beta v0.14.2
struct Handle(NCRYPT_HANDLE);

impl Drop for Handle {
  /// 释放句柄；成功删除密钥时 CNG 已经释放它。
  /// @since Beta v0.14.2
  fn drop(&mut self) {
    if self.0 != 0 {
      // SAFETY: 非零句柄由本类型独占，来自成功的 CNG 打开或创建调用。
      unsafe { NCryptFreeObject(self.0) };
    }
  }
}

/// 只返回脱敏分类，而不是平台错误、密钥或凭据内容。
/// @since Beta v0.14.2
fn check_status(status: i32) -> HardwareResult<()> {
  match status {
    0 => Ok(()),
    NTE_DEVICE_NOT_READY | NTE_NOT_SUPPORTED | NTE_SILENT_CONTEXT => {
      Err(HardwareError::Unavailable)
    }
    _ => Err(HardwareError::Failed),
  }
}

/// 从活跃的 CNG 对象读取一个固定长度的 DWORD 属性。
/// @since Beta v0.14.2
fn property(handle: &Handle, name: PCWSTR) -> HardwareResult<u32> {
  let mut value = 0u32;
  let mut written = 0u32;
  // SAFETY: name 是调用者传入的静态空字符结尾名称，输出缓冲区有一个 DWORD 的空间。
  let status = unsafe {
    NCryptGetProperty(
      handle.0,
      name,
      ptr::from_mut(&mut value).cast(),
      mem::size_of::<u32>() as u32,
      &mut written,
      0,
    )
  };
  check_status(status)?;
  if written as usize != mem::size_of::<u32>() {
    return Err(HardwareError::Failed);
  }
  Ok(value)
}

/// 为尚未完成创建的密钥设置内置 DWORD 属性。
/// @since Beta v0.14.2
fn set_key_property(key: &Handle, name: PCWSTR, value: u32) -> HardwareResult<()> {
  let bytes = value.to_le_bytes();
  // SAFETY: name 是静态 CNG 属性名，bytes 是可读且大小正确的缓冲区。
  check_status(unsafe {
    NCryptSetProperty(key.0, name, bytes.as_ptr(), bytes.len() as u32, NCRYPT_SILENT_FLAG)
  })
}

/// 打开提供程序前检查 TPM 2.0，不初始化设备或请求管理员权限。
/// @since Beta v0.14.2
fn provider() -> HardwareResult<Handle> {
  let mut info = TPM_DEVICE_INFO { structVersion: TPM_VERSION_20, ..Default::default() };
  // SAFETY: TBS 只向正确对齐且大小为四个 DWORD 的结构写入设备信息。
  let device_status =
    unsafe { Tbsi_GetDeviceInfo(mem::size_of_val(&info) as u32, ptr::from_mut(&mut info).cast()) };
  if device_status != 0 || info.tpmVersion != TPM_VERSION_20 {
    return Err(HardwareError::Unavailable);
  }

  let mut provider = 0;
  // SAFETY: 指定固定的非空内置提供程序名称，provider 是可写句柄槽。
  let status =
    unsafe { NCryptOpenStorageProvider(&mut provider, MS_PLATFORM_KEY_STORAGE_PROVIDER, 0) };
  if status != 0 || provider == 0 {
    return Err(HardwareError::Unavailable);
  }
  let provider = Handle(provider);
  let flags =
    property(&provider, NCRYPT_IMPL_TYPE_PROPERTY).map_err(|_| HardwareError::Unavailable)?;
  if flags & (NCRYPT_IMPL_HARDWARE_FLAG | NCRYPT_IMPL_SOFTWARE_FLAG) != NCRYPT_IMPL_HARDWARE_FLAG {
    return Err(HardwareError::Unavailable);
  }
  Ok(provider)
}

/// 只探测 TPM 2.0 平台提供程序及 RSA 能力，不创建密钥。
/// @since Beta v0.14.2
pub(super) fn is_available() -> bool {
  let Ok(provider) = provider() else { return false };
  // SAFETY: provider 在调用期间有效；算法名称为固定的静态常量。
  unsafe { NCryptIsAlgSupported(provider.0, NCRYPT_RSA_ALGORITHM, 0) == 0 }
}

/// 密码文件已删除但专用密钥仍在时，允许用户再次尝试清理。
/// @since Beta v0.14.2
pub(super) fn has_retained_key() -> bool {
  provider()
    .is_ok_and(|provider| matches!(existing_key(&provider), Ok(_) | Err(HardwareError::Failed)))
}

/// 打开固定名称的当前用户密钥，绝不回退到计算机密钥。
/// @since Beta v0.14.2
fn existing_key(provider: &Handle) -> HardwareResult<Handle> {
  let mut key = 0;
  // SAFETY: provider 在调用期间有效；KEY_NAME 静态、以空字符结尾，key 为可写句柄槽。
  let status = unsafe { NCryptOpenKey(provider.0, &mut key, KEY_NAME, 0, NCRYPT_SILENT_FLAG) };
  if matches!(status, NTE_BAD_KEYSET | NTE_NOT_FOUND) {
    return Err(HardwareError::Missing);
  }
  check_status(status)?;
  if key == 0 {
    return Err(HardwareError::Failed);
  }
  Ok(Handle(key))
}

/// 在使用前校验用户范围、不可导出、位数和解密用途。
/// @since Beta v0.14.2
fn verify_key(key: &Handle) -> HardwareResult<()> {
  if property(key, NCRYPT_KEY_TYPE_PROPERTY)? & NCRYPT_MACHINE_KEY_FLAG != 0
    || property(key, NCRYPT_EXPORT_POLICY_PROPERTY)? != 0
    || property(key, NCRYPT_LENGTH_PROPERTY)? != RSA_KEY_BITS
    || property(key, NCRYPT_KEY_USAGE_PROPERTY)? & NCRYPT_ALLOW_DECRYPT_FLAG == 0
  {
    return Err(HardwareError::Failed);
  }
  Ok(())
}

/// 仅保存时可创建密钥；不设置覆盖、迁移、导出或计算机范围标志。
/// @since Beta v0.14.2
fn key_for_saving(provider: &Handle) -> HardwareResult<Handle> {
  match existing_key(provider) {
    Ok(key) => {
      verify_key(&key)?;
      return Ok(key);
    }
    Err(HardwareError::Missing) => {}
    Err(error) => return Err(error),
  }

  let mut key = 0;
  // SAFETY: provider 在调用期间有效；算法和名称为静态字符串，key 为可写句柄槽。
  let status =
    unsafe { NCryptCreatePersistedKey(provider.0, &mut key, NCRYPT_RSA_ALGORITHM, KEY_NAME, 0, 0) };
  if status == NTE_EXISTS {
    let key = existing_key(provider)?;
    verify_key(&key)?;
    return Ok(key);
  }
  check_status(status)?;
  if key == 0 {
    return Err(HardwareError::Failed);
  }
  let key = Handle(key);
  set_key_property(&key, NCRYPT_LENGTH_PROPERTY, RSA_KEY_BITS)?;
  set_key_property(&key, NCRYPT_KEY_USAGE_PROPERTY, NCRYPT_ALLOW_DECRYPT_FLAG)?;
  // SAFETY: key 来自成功的 NCryptCreatePersistedKey，在完成创建前由本函数独占。
  check_status(unsafe { NCryptFinalizeKey(key.0, NCRYPT_SILENT_FLAG) })?;
  // 平台提供程序默认不允许导出；显式校验，不设置其导出或归档属性。
  if let Err(error) = verify_key(&key) {
    let _ = delete_key(key);
    return Err(error);
  }
  Ok(key)
}

/// 只删除已经打开的应用密钥，不创建新密钥。
/// @since Beta v0.14.2
fn delete_key(mut key: Handle) -> HardwareResult<()> {
  // SAFETY: 此句柄独占且有效；仅当删除成功时 CNG 接管释放。
  check_status(unsafe { NCryptDeleteKey(key.0, NCRYPT_SILENT_FLAG) })?;
  key.0 = 0;
  Ok(())
}

/// 删除当前用户的 TPM 密钥；本就不存在视为成功。
/// @since Beta v0.14.2
pub(super) fn forget() -> HardwareResult<()> {
  let provider = provider()?;
  match existing_key(&provider) {
    Ok(key) => {
      if property(&key, NCRYPT_KEY_TYPE_PROPERTY)? & NCRYPT_MACHINE_KEY_FLAG != 0 {
        return Err(HardwareError::Failed);
      }
      delete_key(key)
    }
    Err(HardwareError::Missing) => Ok(()),
    Err(error) => Err(error),
  }
}

/// 固定使用 RSA-OAEP SHA-256，无标签，不降级为其他填充或散列。
/// @since Beta v0.14.2
fn oaep_padding() -> BCRYPT_OAEP_PADDING_INFO {
  BCRYPT_OAEP_PADDING_INFO {
    pszAlgId: BCRYPT_SHA256_ALGORITHM,
    pbLabel: ptr::null_mut(),
    cbLabel: 0,
  }
}

/// 用 TPM 密钥的公钥部分封装一个随机的 AES 密钥。
/// @since Beta v0.14.2
fn wrap_key(
  key: &Handle,
  data_key: &[u8; DATA_KEY_BYTES],
) -> HardwareResult<[u8; WRAPPED_KEY_BYTES]> {
  let padding = oaep_padding();
  let mut output = [0; WRAPPED_KEY_BYTES];
  let mut written = 0;
  // SAFETY: key 活跃，padding 与输入、输出、实际长度指针均在调用期间有效。
  check_status(unsafe {
    NCryptEncrypt(
      key.0,
      data_key.as_ptr(),
      data_key.len() as u32,
      ptr::from_ref(&padding).cast(),
      output.as_mut_ptr(),
      output.len() as u32,
      &mut written,
      OAEP_FLAGS,
    )
  })?;
  if written as usize != WRAPPED_KEY_BYTES {
    return Err(HardwareError::Failed);
  }
  Ok(output)
}

/// 未通过 TPM 私钥解封时不返回 AES 密钥；临时槽退出时清零。
/// @since Beta v0.14.2
fn unwrap_key(key: &Handle, wrapped_key: &[u8]) -> HardwareResult<LessSafeKey> {
  let padding = oaep_padding();
  let mut output = Zeroizing::new([0; WRAPPED_KEY_BYTES]);
  let mut written = 0;
  // SAFETY: key 活跃，padding 与输入、输出、实际长度指针均在调用期间有效。
  check_status(unsafe {
    NCryptDecrypt(
      key.0,
      wrapped_key.as_ptr(),
      wrapped_key.len() as u32,
      ptr::from_ref(&padding).cast(),
      output.as_mut_ptr(),
      output.len() as u32,
      &mut written,
      OAEP_FLAGS,
    )
  })?;
  if written as usize != DATA_KEY_BYTES {
    return Err(HardwareError::Failed);
  }
  aes_key(&output[..DATA_KEY_BYTES])
}

/// 以临时的 256 位数据密钥构造 AES-GCM 实例。
/// @since Beta v0.14.2
fn aes_key(material: &[u8]) -> HardwareResult<LessSafeKey> {
  UnboundKey::new(&aead::AES_256_GCM, material)
    .map(LessSafeKey::new)
    .map_err(|_| HardwareError::Failed)
}

/// 生成独立随机密钥和 nonce，认证头部并返回版本化密文。
/// @since Beta v0.14.2
pub(super) fn seal(plaintext: &[u8]) -> HardwareResult<Vec<u8>> {
  if plaintext.is_empty() || plaintext.len() > MAX_PLAINTEXT_BYTES {
    return Err(HardwareError::Failed);
  }
  let rng = SystemRandom::new();
  let mut material = Zeroizing::new([0; DATA_KEY_BYTES]);
  let mut nonce = [0; aead::NONCE_LEN];
  rng.fill(&mut *material).map_err(|_| HardwareError::Failed)?;
  rng.fill(&mut nonce).map_err(|_| HardwareError::Failed)?;

  let provider = provider()?;
  let key = key_for_saving(&provider)?;
  let wrapped_key = wrap_key(&key, &material)?;
  let aes = aes_key(&material[..])?;
  drop(material);

  let mut envelope = Zeroizing::new(Vec::with_capacity(HEADER_BYTES + plaintext.len() + TAG_BYTES));
  envelope.extend_from_slice(MAGIC);
  envelope.extend_from_slice(&nonce);
  envelope.extend_from_slice(&wrapped_key);
  envelope.extend_from_slice(plaintext);
  let (header, body) = envelope.split_at_mut(HEADER_BYTES);
  let tag = aes
    .seal_in_place_separate_tag(Nonce::assume_unique_for_key(nonce), Aad::from(&*header), body)
    .map_err(|_| HardwareError::Failed)?;
  envelope.extend_from_slice(tag.as_ref());
  Ok(mem::take(&mut *envelope))
}

/// 用现存的 TPM 私钥解封数据密钥并验证密文；任何失败都不生成密钥或返回明文。
/// @since Beta v0.14.2
pub(super) fn open(ciphertext: &[u8]) -> HardwareResult<Vec<u8>> {
  let min_bytes = HEADER_BYTES + TAG_BYTES + 1;
  let max_bytes = (HEADER_BYTES + TAG_BYTES + MAX_PLAINTEXT_BYTES).min(MAX_CIPHERTEXT_BYTES);
  if !(min_bytes..=max_bytes).contains(&ciphertext.len()) || !ciphertext.starts_with(MAGIC) {
    return Err(HardwareError::Failed);
  }
  let (header, payload) = ciphertext.split_at(HEADER_BYTES);
  let nonce = Nonce::try_assume_unique_for_key(&header[MAGIC.len()..WRAPPED_KEY_OFFSET])
    .map_err(|_| HardwareError::Failed)?;

  let provider = provider()?;
  let key = existing_key(&provider)?;
  verify_key(&key)?;
  let aes = unwrap_key(&key, &header[WRAPPED_KEY_OFFSET..])?;
  let mut plaintext = Zeroizing::new(payload.to_vec());
  let size = aes
    .open_in_place(nonce, Aad::from(header), &mut plaintext)
    .map_err(|_| HardwareError::Failed)?
    .len();
  plaintext.truncate(size);
  Ok(mem::take(&mut *plaintext))
}
