//! @file src/main.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.7.2

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  let _guard = sentry::init((
          "https://8d59057c08ff381e1fccf3c9e97c6a6c@o4510617609175040.ingest.de.sentry.io/4510617659506768",
          sentry::ClientOptions {
          release: sentry::release_name!(),
          // Capture user IPs and potentially sensitive headers when using HTTP server integrations
          // see https://docs.sentry.io/platforms/rust/data-management/data-collected for more info
          send_default_pii: true,
          ..Default::default()
        }));
  teyvat_guide_lib::run()
}
