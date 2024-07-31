//! @file src/plugins.rs
//! @desc 插件模块，用于注册插件
//! @since Beta v0.5.2

use super::utils;
use log::LevelFilter;
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};

// 日志插件
pub fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
  if cfg!(debug_assertions) {
    return tauri_plugin_log::Builder::default()
      .targets([Target::new(TargetKind::Webview)])
      .timezone_strategy(TimezoneStrategy::UseLocal)
      .level(LevelFilter::Debug)
      .build();
  }
  return tauri_plugin_log::Builder::default()
    .targets([
      Target::new(TargetKind::Webview),
      Target::new(TargetKind::LogDir { file_name: utils::get_current_date().into() }),
    ])
    .timezone_strategy(TimezoneStrategy::UseLocal)
    .level(LevelFilter::Info)
    .build();
}
