//! Windows 上的 HDiffPatch 4.8.0 zstd 差分应用。
//! @since Beta v0.12.0

use std::{fs::File, os::windows::io::AsRawHandle};

unsafe extern "C" {
  /// 调用本地 HDiffPatch 实现，将旧文件与差分容器片段合成为目标文件。
  ///
  /// @since Beta v0.12.0
  ///
  /// # 参数
  /// - `old_handle`: 旧文件句柄。
  /// - `old_size`: 旧文件字节数。
  /// - `patch_handle`: 差分容器文件句柄。
  /// - `patch_offset`: 差分片段在容器中的偏移。
  /// - `patch_length`: 差分片段长度。
  /// - `out_handle`: 目标输出文件句柄。
  /// - `expected_new_size`: 预期生成的目标字节数。
  ///
  /// # 返回
  /// 0 表示成功，非 0 为 HDiffPatch 错误码。
  fn teyvat_hpatch_zstd(
    old_handle: *mut std::ffi::c_void,
    old_size: u64,
    patch_handle: *mut std::ffi::c_void,
    patch_offset: u64,
    patch_length: u64,
    out_handle: *mut std::ffi::c_void,
    expected_new_size: u64,
  ) -> i32;
}

/// 将已打开的旧文件与差分容器片段合成为目标文件。调用方负责打开、截断与校验。
pub(crate) fn patch_zstd(
  old_file: &File,
  old_size: u64,
  patch_file: &File,
  patch_offset: u64,
  patch_length: u64,
  out_file: &File,
  expected_new_size: u64,
) -> Result<(), String> {
  let code = unsafe {
    teyvat_hpatch_zstd(
      old_file.as_raw_handle(),
      old_size,
      patch_file.as_raw_handle(),
      patch_offset,
      patch_length,
      out_file.as_raw_handle(),
      expected_new_size,
    )
  };
  match code {
    0 => Ok(()),
    1 => Err("HDiffPatch 参数无效".to_string()),
    2 => Err("HDiffPatch 无法读取差分头".to_string()),
    3 => Err("HDiffPatch 原文件或目标大小与差分头不一致".to_string()),
    4 => Err("HDiffPatch 应用差分失败".to_string()),
    other => Err(format!("HDiffPatch 返回未知错误：{other}")),
  }
}
