//! MSIX 网络回环豁免（CheckNetIsolation）
//! @since Beta v0.11.3

use std::process::Command;
use widestring::{U16CStr, U16CString};
use windows_sys::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, HWND};
use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFamilyName;
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_HIDE;

/// 获取当前 MSIX 包的 PackageFamilyName
pub(crate) fn get_package_family_name() -> Result<String, String> {
  unsafe {
    let mut length: u32 = 0;
    if GetCurrentPackageFamilyName(&mut length, std::ptr::null_mut()) != ERROR_INSUFFICIENT_BUFFER {
      return Err("当前应用未以 MSIX 包形式运行".into());
    }
    let mut buffer = vec![0u16; length as usize];
    let result = GetCurrentPackageFamilyName(&mut length, buffer.as_mut_ptr());
    if result != 0 {
      return Err(format!("获取 PackageFamilyName 失败，错误码 {result}"));
    }
    Ok(U16CStr::from_ptr_str(buffer.as_ptr()).to_string_lossy())
  }
}

/// CheckNetIsolation 可执行文件路径
fn check_net_isolation_path() -> String {
  let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
  format!("{root}\\System32\\CheckNetIsolation.exe")
}

/// 检查当前 MSIX 包是否已解除回环限制（列出豁免列表并匹配包族名）
fn is_loopback_exempt(family: &str) -> Result<bool, String> {
  let output = Command::new(check_net_isolation_path())
    .args(["LoopbackExempt", "-s"])
    .output()
    .map_err(|e| format!("启动 CheckNetIsolation 失败: {e}"))?;
  if !output.status.success() {
    return Err(format!(
      "CheckNetIsolation 查询豁免列表失败，退出码 {}",
      output.status.code().unwrap_or(-1)
    ));
  }
  // 输出可能为 UTF-8/ANSI 或 UTF-16LE，统一去掉 NUL 后按包族名匹配
  let mut bytes = output.stdout;
  bytes.extend_from_slice(&output.stderr);
  let text = String::from_utf8_lossy(&bytes).replace('\0', "");
  Ok(text.to_lowercase().contains(&family.to_lowercase()))
}

/// 已提权时直接执行豁免
fn run_exempt_direct(family: &str) -> Result<(), String> {
  let n_arg = format!("-n={family}");
  let output = Command::new(check_net_isolation_path())
    .args(["LoopbackExempt", "-a", n_arg.as_str()])
    .output()
    .map_err(|e| format!("启动 CheckNetIsolation 失败: {e}"))?;
  if output.status.success() {
    Ok(())
  } else {
    Err(format!("CheckNetIsolation 执行失败，退出码 {}", output.status.code().unwrap_or(-1)))
  }
}

/// 未提权时通过 UAC（ShellExecuteW + runas）执行豁免
fn run_exempt_with_uac(family: &str) -> Result<(), String> {
  let exe = U16CString::from_str(&check_net_isolation_path()).map_err(|e| e.to_string())?;
  let args =
    U16CString::from_str(&format!("LoopbackExempt -a -n={family}")).map_err(|e| e.to_string())?;
  let verb = U16CString::from_str("runas").unwrap();
  unsafe {
    let result = ShellExecuteW(
      0 as HWND,
      verb.as_ptr(),
      exe.as_ptr(),
      args.as_ptr(),
      std::ptr::null(),
      SW_HIDE,
    );
    if (result as isize) > 32 {
      Ok(())
    } else {
      Err(format!("UAC 启动失败，错误码 {}", result as isize))
    }
  }
}

/// 解除 MSIX 网络回环限制
#[tauri::command]
pub fn enable_loopback_exemption() -> Result<LoopbackExemptResp, String> {
  let family = get_package_family_name()?;
  let command = format!("CheckNetIsolation.exe LoopbackExempt -a -n={family}");
  if is_loopback_exempt(&family)? {
    return Ok(LoopbackExemptResp {
      success: true, message: "已具备回环访问权限".into(), command
    });
  }
  let result = if crate::commands::is_in_admin() {
    run_exempt_direct(&family)
  } else {
    run_exempt_with_uac(&family)
  };
  match result {
    Ok(()) => {
      Ok(LoopbackExemptResp {
        success: true, message: "已解除网络回环限制".into(), command
      })
    }
    Err(message) => Ok(LoopbackExemptResp { success: false, message, command }),
  }
}

/// 回环豁免执行结果
#[derive(serde::Serialize)]
pub struct LoopbackExemptResp {
  /// 是否成功执行豁免
  success: bool,
  /// 提示信息
  message: String,
  /// 实际执行命令（用于手动复制）
  command: String,
}
