// tauri-plugin-log 简单处理
// @since Beta v0.9.1

use chrono::DateTime;
use log::LevelFilter;
use std::time::SystemTime;
use tauri::Runtime;
use tauri::plugin::TauriPlugin;
use tauri_plugin_log::{Builder, Target, TargetKind, TimezoneStrategy};

// 获取当前日期 yyyy-mm-dd
fn get_current_date() -> String {
  let now = SystemTime::now();
  let date_time = DateTime::<chrono::Local>::from(now);
  let date = date_time.format("%Y-%m-%d").to_string();
  return date;
}

pub fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
  #[cfg(debug_assertions)]
  Builder::default()
    .targets([Target::new(TargetKind::Webview)])
    .timezone_strategy(TimezoneStrategy::UseLocal)
    .level(LevelFilter::Debug)
    .build::<R>();
  Builder::default()
    .targets([
      Target::new(TargetKind::Webview),
      Target::new(TargetKind::LogDir { file_name: get_current_date().into() }),
    ])
    .timezone_strategy(TimezoneStrategy::UseLocal)
    .level(LevelFilter::Info)
    .build::<R>()
}
