//! 插件模块，用于注册插件
//! @since Beta v0.7.8

use crate::utils::get_current_date;
use log::LevelFilter;
use tauri::plugin::TauriPlugin;
use tauri::{Emitter, Runtime};
use tauri_plugin_log::{Builder, Target, TargetKind, TimezoneStrategy};
use tauri_plugin_single_instance::init;

// 单例插件
pub fn build_si_plugin<R: Runtime>() -> TauriPlugin<R> {
  init(move |app, argv, _cwd| {
    // 把 argv 转成 Vec<String>
    //     let args: Vec<String> = argv.iter().map(|s| s.to_string()).collect();

    // 如果包含提升约定参数，发出专门事件并短路退出
    //     if args.iter().any(|a| a == "--elevated") {
    // 提升实例通常只负责传参或执行一次性任务，退出避免与主实例冲突
    //       std::process::exit(0);
    //     }

    // 非提升启动：按原逻辑广播 deep link
    if let Err(e) = app.emit("active_deep_link", argv) {
      eprintln!("emit active_deep_link failed: {}", e);
    }

    // 回调必须返回 unit，直接结束即可
  })
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
