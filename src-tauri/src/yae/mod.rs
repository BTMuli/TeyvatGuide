//! @file src/yae/mod.rs
//! @desc Yae 成就数据导入模块
//! @since Beta v0.8.7

#[cfg(windows)]
mod pipe;
mod proto;

#[cfg(windows)]
pub use pipe::{start_yae_listener, stop_yae_listener};

pub use proto::parse_yae_protobuf;
