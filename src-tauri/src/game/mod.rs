//! 游戏安装、渠道方案与可信启动命令。
//! @since Beta v0.11.5

// Phase 3 先固化并验证 staging 引擎；提交状态机接入前保持编译但不暴露命令。
#[allow(dead_code)]
mod assembler;
pub mod commands;
mod downloader;
mod hoyoplay;
mod installation;
mod journal;
mod launch;
mod model;
pub(crate) mod package;
#[allow(dead_code)]
mod path_guard;
mod planner;
mod scheme;
mod sophon;
