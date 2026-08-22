//! 游戏安装、渠道方案与可信启动命令。
//! @since Beta v0.11.5

mod assembler;
mod cache;
pub mod commands;
mod committer;
mod downloader;
mod hoyoplay;
#[cfg(windows)]
mod hpatch;
mod installation;
mod installer;
mod journal;
mod launch;
mod model;
pub(crate) mod package;
mod path_guard;
mod planner;
mod scheme;
mod sophon;
mod switch;
mod verify;
