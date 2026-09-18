// 结合屏幕分辨率获取窗口大小
// @since Beta v0.11.3

use crate::utils;
use tauri::{AppHandle, Manager, Monitor, WebviewWindow};

/// 根据主窗口所在显示器计算适配后的窗口尺寸。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app`: Tauri 应用句柄。
/// - `width`: 基础宽度。
/// - `height`: 基础高度。
///
/// # 返回
/// 适配后的逻辑宽度与高度。
pub fn get_window_size(app: &AppHandle, width: f64, height: f64) -> (f64, f64) {
  let monitor = app
    .get_webview_window("TeyvatGuide")
    .and_then(|window| window.primary_monitor().ok().flatten())
    .or_else(|| app.available_monitors().ok().and_then(|monitors| monitors.into_iter().next()));
  get_window_size_from_monitor(monitor, width, height)
}

/// 根据指定窗口所在显示器计算适配后的窗口尺寸。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `window`: 目标窗口。
/// - `width`: 基础宽度。
/// - `height`: 基础高度。
///
/// # 返回
/// 适配后的逻辑宽度与高度。
pub fn get_window_size_for_window(window: &WebviewWindow, width: f64, height: f64) -> (f64, f64) {
  let monitor =
    window.primary_monitor().ok().flatten().or_else(|| {
      window.available_monitors().ok().and_then(|monitors| monitors.into_iter().next())
    });
  get_window_size_from_monitor(monitor, width, height)
}

/// 依据可选显示器计算窗口尺寸，无显示器时回退为原始尺寸。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `monitor`: 目标显示器。
/// - `width`: 基础宽度。
/// - `height`: 基础高度。
///
/// # 返回
/// 适配后的逻辑宽度与高度。
fn get_window_size_from_monitor(monitor: Option<Monitor>, width: f64, height: f64) -> (f64, f64) {
  match monitor {
    Some(monitor) => get_window_size2(monitor, width, height),
    None => (width, height),
  }
}

/// 结合显示器尺寸、缩放因子与系统文本缩放计算窗口尺寸。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `monitor`: 目标显示器。
/// - `width`: 基础宽度。
/// - `height`: 基础高度。
///
/// # 返回
/// 适配后的逻辑宽度与高度。
pub fn get_window_size2(monitor: Monitor, width: f64, height: f64) -> (f64, f64) {
  let monitor_size = monitor.size();
  let text_scale = utils::read_text_scale_factor().unwrap_or(1.0);
  calculate_window_size(
    Some((monitor_size.width as f64, monitor_size.height as f64)),
    monitor.scale_factor(),
    text_scale,
    width,
    height,
  )
}

/// 根据显示器尺寸、缩放因子与文本缩放计算适配后的窗口逻辑尺寸。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `monitor_size`: 显示器物理尺寸（宽、高）。
/// - `monitor_scale`: 显示器缩放因子。
/// - `text_scale`: 系统文本缩放比例。
/// - `width`: 基础宽度。
/// - `height`: 基础高度。
///
/// # 返回
/// 计算后的逻辑宽度与高度，异常输入时回退为原始尺寸。
pub fn calculate_window_size(
  monitor_size: Option<(f64, f64)>,
  monitor_scale: f64,
  text_scale: f64,
  width: f64,
  height: f64,
) -> (f64, f64) {
  let Some((monitor_width, monitor_height)) = monitor_size else {
    return (width, height);
  };

  if !monitor_width.is_finite()
    || !monitor_height.is_finite()
    || !monitor_scale.is_finite()
    || !text_scale.is_finite()
    || monitor_width <= 0.0
    || monitor_height <= 0.0
    || monitor_scale <= 0.0
    || text_scale <= 0.0
  {
    return (width, height);
  }

  let width_scale = monitor_width / 1920.0;
  let height_scale = monitor_height / 1080.0;
  #[cfg(not(target_os = "macos"))]
  let size = (
    (width * width_scale / (monitor_scale * text_scale)).round(),
    (height * height_scale / (monitor_scale * text_scale)).round(),
  );
  #[cfg(target_os = "macos")]
  let size = ((width * width_scale).round(), (height * height_scale).round());

  if size.0.is_finite() && size.1.is_finite() && size.0 > 0.0 && size.1 > 0.0 {
    size
  } else {
    (width, height)
  }
}
