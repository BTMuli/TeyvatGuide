// 杂项
// @since Beta v0.9.2

/// 获取当前系统的文本缩放比例（TextScaleFactor）
/// 返回值示例：1.0 表示 100%，1.25 表示 125%
pub fn read_text_scale_factor() -> Result<f64, String> {
  #[cfg(not(target_os = "windows"))]
  {
    Ok(1.0)
  }
  #[cfg(target_os = "windows")]
  {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    // 如果打开失败，直接返回默认值 1.0
    let key = match hkcu.open_subkey("Software\\Microsoft\\Accessibility") {
      Ok(k) => k,
      Err(e) => {
        log::error!("无法打开注册表: {}", e);
        return Ok(1.0);
      }
    };
    let value: u32 = key.get_value("TextScaleFactor").unwrap_or(100u32); // 默认值为 100%

    Ok(value as f64 / 100.0)
  }
}
