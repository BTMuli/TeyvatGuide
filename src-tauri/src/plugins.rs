//! @file src/plugins.rs
//! @desc 插件模块，用于注册插件
//! @since Beta v0.4.3

use super::utils;
use log::LevelFilter;
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_log::{LogTarget, TimezoneStrategy};
use tauri_plugin_sql::PluginConfig;

// sqlite 插件
pub fn build_sql_plugin<R: Runtime>() -> TauriPlugin<R, Option<PluginConfig>> {
  tauri_plugin_sql::Builder::default().build()
}

// 日志插件
pub fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
  tauri_plugin_log::Builder::default()
    .targets([LogTarget::LogDir, LogTarget::Stdout])
    .timezone_strategy(TimezoneStrategy::UseLocal)
    .level(LevelFilter::Info)
    .log_name(utils::get_current_date())
    .build()
}
