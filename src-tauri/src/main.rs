// 主模块，用于启动应用
// @since Beta v0.9.1

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn enable_dpi_v2() {
  use windows_sys::Win32::UI::HiDpi::{
    DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2, SetProcessDpiAwarenessContext,
  };

  unsafe {
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
  }
}

fn main() {
  let _guard = sentry::init((
    "https://8d59057c08ff381e1fccf3c9e97c6a6c@o4510617609175040.ingest.de.sentry.io/4510617659506768",
    sentry::ClientOptions {
      release: sentry::release_name!().into(),
      send_default_pii: true,
      ..Default::default()
    },
  ));
  #[cfg(target_os = "windows")]
  enable_dpi_v2();
  #[cfg(target_os = "linux")]
  unsafe {
    // Not unsafe if you don't use edition 2024
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }
  teyvat_guide_lib::run()
}
