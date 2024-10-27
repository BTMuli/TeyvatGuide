//! @file src/plugins.rs
//! @desc 插件模块，用于注册插件
//! @since Beta v0.6.2

use crate::utils::get_current_date;
use log::LevelFilter;
use tauri::plugin::TauriPlugin;
use tauri::{Emitter, Runtime};
use tauri_plugin_log::{Builder, Target, TargetKind, TimezoneStrategy};
use tauri_plugin_single_instance::init;

// 单例插件
pub fn build_si_plugin<R: Runtime>() -> TauriPlugin<R> {
  init(move |app, argv, _cwd| app.emit("active_deep_link", argv).unwrap())
}

// 日志插件
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
