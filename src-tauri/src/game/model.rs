//! 游戏安装、渠道方案与检测状态数据模型。
//! @since Beta v0.11.5

use serde::{Deserialize, Serialize};

/// TeyvatGuide 支持的国服客户端方案。
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SchemeId {
  CnOfficial,
  CnBilibili,
}

impl SchemeId {
  /// 将数据库中的渠道方案字符串解析为受支持的方案枚举。
  pub fn parse(value: &str) -> Option<Self> {
    match value {
      "cn_official" => Some(Self::CnOfficial),
      "cn_bilibili" => Some(Self::CnBilibili),
      _ => None,
    }
  }
}

/// 游戏安装检测结果。
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallationStatus {
  Known,
  Unsupported,
  Inconsistent,
}

/// 已登记游戏安装及其最新磁盘状态。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInstallation {
  pub id: String,
  pub executable_path: String,
  pub root_path: String,
  pub scheme_id: Option<SchemeId>,
  pub preferred_scheme: Option<SchemeId>,
  pub status: InstallationStatus,
  pub status_message: String,
  pub version: Option<String>,
  pub channel: Option<u32>,
  pub sub_channel: Option<u32>,
  pub has_channel_sdk: bool,
  pub audio_languages: Vec<String>,
  pub is_chosen: bool,
  pub last_seen: String,
}

/// 可用于生成包计划的目标分支。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackagePlanTarget {
  Main,
  PreDownload,
}

/// 一个不含分支密码和下载地址的远端版本投影。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteVersionSnapshot {
  pub tag: String,
  pub diff_tags: Vec<String>,
}

/// 本地安装与 HoyoPlay 远端版本的只读快照。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageSnapshot {
  pub installation_id: String,
  pub local_version: Option<String>,
  pub main: RemoteVersionSnapshot,
  pub pre_download: Option<RemoteVersionSnapshot>,
  pub update_available: bool,
  pub pre_download_available: bool,
}

/// 计划选择的差异来源。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackagePlanStrategy {
  Patch,
  ManifestDiff,
}

/// 已持久化不可变计划的安全摘要。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagePlanSummary {
  pub plan_id: String,
  pub installation_id: String,
  pub target: PackagePlanTarget,
  pub source_tag: String,
  pub target_tag: String,
  pub manifest_digest: String,
  pub strategy: PackagePlanStrategy,
  pub download_bytes: u64,
  pub install_bytes: u64,
  pub cache_hit_bytes: u64,
  pub required_free_bytes: u64,
  pub available_free_bytes: u64,
  pub has_sufficient_space: bool,
  pub download_count: usize,
  pub add_count: usize,
  pub modify_count: usize,
  pub delete_count: usize,
}

/// 游戏资源长任务的持久化状态。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageTaskState {
  Queued,
  Downloading,
  ReadyToApply,
  RecoveryRequired,
  Failed,
  Canceled,
}

impl PackageTaskState {
  /// 判断任务是否仍可能持有安装级运行互斥。
  pub fn is_active(self) -> bool {
    matches!(self, Self::Queued | Self::Downloading)
  }
}

/// 前端可重新查询的资源任务安全投影。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageTaskSummary {
  pub revision: u64,
  pub task_id: String,
  pub plan_id: String,
  pub installation_id: String,
  pub target: PackagePlanTarget,
  pub source_tag: String,
  pub target_tag: String,
  pub manifest_digest: String,
  pub state: PackageTaskState,
  pub downloaded_bytes: u64,
  pub total_bytes: u64,
  pub completed_count: usize,
  pub total_count: usize,
  pub current_file: Option<String>,
  pub bytes_per_second: u64,
  pub eta_seconds: Option<u64>,
  pub error_message: Option<String>,
  pub updated_at: String,
}

/// 启动资源任务时允许覆盖的安全下载参数。
#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageTaskOptions {
  pub concurrency: Option<usize>,
  pub max_bytes_per_second: Option<u64>,
}

/// 中断任务的恢复动作。
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageRecoveryAction {
  Resume,
  Rollback,
}
