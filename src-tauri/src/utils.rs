//! @file src/utils.rs
//! @desc 工具模块，用于提供一些工具函数
//! @since Beta v0.4.2

use chrono::DateTime;
use std::time::SystemTime;

// 获取当前日期 yyyy-mm-dd
pub fn get_current_date() -> String {
  let now = SystemTime::now();
  let date_time = DateTime::<chrono::Local>::from(now);
  let date = date_time.format("%Y-%m-%d").to_string();
  return date;
}
