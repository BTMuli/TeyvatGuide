//! @file src/main.rs
//! @desc 主模块，用于启动应用
//! @since Beta v0.7.2

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  teyvat_guide_lib::run()
}
