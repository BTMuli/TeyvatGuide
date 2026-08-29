//! 游戏安装、渠道方案与可信启动命令。
//! @since Beta v0.12.0

mod assembler;
mod cache;
pub mod commands;
mod committer;
pub(crate) mod defender;
mod downloader;
mod evidence;
mod hoyoplay;
#[cfg(windows)]
mod hpatch;
mod installation;
mod installation_locator;
mod installer;
mod journal;
mod launch;
mod model;
pub(crate) mod package;
mod path_guard;
mod plan_lifecycle;
mod planner;
mod scheme;
mod sophon;
mod switch;
mod verify;
