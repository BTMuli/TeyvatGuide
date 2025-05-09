//! @file src/client/utils.rs
//! @desc 结合屏幕分辨率获取窗口大小
//! @since Beta v0.7.6

use tauri::{AppHandle, Manager, Monitor};

pub fn get_window_size(app: AppHandle, width: f64, height: f64) -> (f64, f64) {
  let mhy_window = app.get_webview_window("TeyvatGuide").unwrap();
  let monitor = mhy_window.primary_monitor().unwrap().expect("failed to get primary monitor");
  get_window_size2(monitor, width, height)
}

pub fn get_window_size2(monitor: Monitor, width: f64, height: f64) -> (f64, f64) {
  let monitor_size = monitor.size();
  let monitor_width = monitor_size.width as f64;
  let monitor_height = monitor_size.height as f64;
  let monitor_scale = monitor.scale_factor();
  let width_scale = monitor_width / 1920.0;
  let height_scale = monitor_height / 1080.0;
  let mut get_width: f64 = 0.0;
  let mut get_height: f64 = 0.0;
  dbg!(get_width, get_height); // 防止never read
  get_width = (width * width_scale / monitor_scale).round();
  get_height = (height * height_scale / monitor_scale).round();
  #[cfg(target_os = "macos")]
  {
    get_width = (width * width_scale).round();
    get_height = (height * height_scale).round();
  }
  (get_width, get_height)
}
