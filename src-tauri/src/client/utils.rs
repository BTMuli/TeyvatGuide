// 结合屏幕分辨率获取窗口大小
// @since Beta v0.11.3

use crate::utils;
use tauri::{AppHandle, Manager, Monitor, WebviewWindow};

pub fn get_window_size(app: &AppHandle, width: f64, height: f64) -> (f64, f64) {
  let monitor = app
    .get_webview_window("TeyvatGuide")
    .and_then(|window| window.primary_monitor().ok().flatten())
    .or_else(|| app.available_monitors().ok().and_then(|monitors| monitors.into_iter().next()));
  get_window_size_from_monitor(monitor, width, height)
}

pub fn get_window_size_for_window(window: &WebviewWindow, width: f64, height: f64) -> (f64, f64) {
  let monitor =
    window.primary_monitor().ok().flatten().or_else(|| {
      window.available_monitors().ok().and_then(|monitors| monitors.into_iter().next())
    });
  get_window_size_from_monitor(monitor, width, height)
}

fn get_window_size_from_monitor(monitor: Option<Monitor>, width: f64, height: f64) -> (f64, f64) {
  match monitor {
    Some(monitor) => get_window_size2(monitor, width, height),
    None => (width, height),
  }
}

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
