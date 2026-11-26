//! macOS 的 Secure Enclave 凭据桥接；密钥封装随密文存入同一个本机文件。
//! @since Beta v0.14.2

use super::{HardwareError, HardwareResult};

const MAX_PLAINTEXT_BYTES: usize = 4128;
const MAX_CIPHERTEXT_BYTES: usize = 8192;
const UNAVAILABLE: i32 = 1;

/// 同步调用 Swift，将有界字节写入 Rust 提供的缓冲区。
/// @since Beta v0.14.2
type Transform = unsafe extern "C" fn(*const u8, usize, *mut u8, usize, *mut usize) -> i32;

unsafe extern "C" {
  fn tg_sync_macos_credential_available() -> i32;
  fn tg_sync_macos_credential_seal(
    input: *const u8,
    input_length: usize,
    output: *mut u8,
    capacity: usize,
    length: *mut usize,
  ) -> i32;
  fn tg_sync_macos_credential_open(
    input: *const u8,
    input_length: usize,
    output: *mut u8,
    capacity: usize,
    length: *mut usize,
  ) -> i32;
}

/// 只在系统 API 能完成实际 Secure Enclave 往返时报告可用。
/// @since Beta v0.14.2
pub(super) fn is_available() -> bool {
  // SAFETY: 不传递指针；Swift 只验证合成数据，不向磁盘写入。
  unsafe { tg_sync_macos_credential_available() == 1 }
}

/// 固定输入、输出上限，并将 Swift 状态转换为不携带系统正文的错误。
/// @since Beta v0.14.2
fn transform(
  input: &[u8],
  limit: usize,
  capacity: usize,
  operation: Transform,
) -> HardwareResult<Vec<u8>> {
  if input.is_empty() || input.len() > limit {
    return Err(HardwareError::Failed);
  }
  let mut output = vec![0; capacity];
  let mut length = 0;
  // SAFETY: 输入是有效的只读切片，输出槽互不重叠，在整次同步调用中有效；Swift 不保存指针。
  match unsafe {
    operation(input.as_ptr(), input.len(), output.as_mut_ptr(), capacity, &mut length)
  } {
    0 if (1..=capacity).contains(&length) => {
      output.truncate(length);
      Ok(output)
    }
    UNAVAILABLE => Err(HardwareError::Unavailable),
    _ => Err(HardwareError::Failed),
  }
}

/// 生成不可导出的硬件密钥，并返回只含其封装和 HPKE 密文的信封。
/// @since Beta v0.14.2
pub(super) fn seal(plaintext: &[u8]) -> HardwareResult<Vec<u8>> {
  transform(plaintext, MAX_PLAINTEXT_BYTES, MAX_CIPHERTEXT_BYTES, tg_sync_macos_credential_seal)
}

/// 用原安全隔区恢复信封的明文，不创建新密钥或写入文件。
/// @since Beta v0.14.2
pub(super) fn open(ciphertext: &[u8]) -> HardwareResult<Vec<u8>> {
  transform(ciphertext, MAX_CIPHERTEXT_BYTES, MAX_PLAINTEXT_BYTES, tg_sync_macos_credential_open)
}

/// macOS 没有独立的持久密钥条目；上层移除信封即完成忘记，已有副本不受影响。
/// @since Beta v0.14.2
pub(super) fn forget() -> HardwareResult<()> {
  Ok(())
}
