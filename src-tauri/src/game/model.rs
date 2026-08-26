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

/// 自动发现安装的来源。
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallationDiscoverySource {
  HoyoPlayRegistry,
  UnityLog,
}

/// 自动发现的一个候选安装及命中的来源列表。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInstallationCandidate {
  pub installation: GameInstallation,
  pub sources: Vec<InstallationDiscoverySource>,
}

/// 单个来源的非致命告警；code 只包含稳定错误码，不含本地路径。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallationDiscoveryNotice {
  pub source: InstallationDiscoverySource,
  pub code: String,
}

/// 自动定位报告：排序后的候选与来源级告警。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInstallationDiscovery {
  pub candidates: Vec<GameInstallationCandidate>,
  pub notices: Vec<InstallationDiscoveryNotice>,
}

/// 可用于生成包计划的目标分支。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackagePlanTarget {
  Main,
  PreDownload,
  Audio,
  Switch,
  Install,
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
  Full,
}

/// 已持久化不可变计划的安全摘要。
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagePlanSummary {
  pub plan_id: String,
  pub installation_id: String,
  pub target: PackagePlanTarget,
  pub source_tag: Option<String>,
  pub target_tag: String,
  pub manifest_digest: String,
  pub strategy: PackagePlanStrategy,
  pub download_bytes: u64,
  pub install_bytes: u64,
  #[serde(default)]
  pub delete_bytes: u64,
  pub cache_hit_bytes: u64,
  pub required_free_bytes: u64,
  pub available_free_bytes: u64,
  pub has_sufficient_space: bool,
  #[serde(default)]
  pub cache_required_free_bytes: u64,
  #[serde(default)]
  pub install_required_free_bytes: u64,
  #[serde(default)]
  pub cache_available_free_bytes: u64,
  #[serde(default)]
  pub install_available_free_bytes: u64,
  #[serde(default)]
  pub same_volume: bool,
  pub download_count: usize,
  pub add_count: usize,
  pub modify_count: usize,
  pub delete_count: usize,
  #[serde(default)]
  pub source_audio_languages: Vec<String>,
  #[serde(default)]
  pub target_audio_languages: Vec<String>,
}

/// 后端生成资源计划时上报的真实评估步骤。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagePlanProgress {
  pub step: u8,
  pub total: u8,
  pub message: String,
}

/// 恢复资源任务时上报的计划复验与缓存核对进度。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageRecoveryProgress {
  pub task_id: String,
  pub step: u8,
  pub total_steps: u8,
  pub scanned_objects: usize,
  pub total_objects: usize,
  pub confirmed_bytes: u64,
  pub message: String,
}

/// 安装完整性校验任务状态。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageVerifyState {
  Scanning,
  Completed,
  Failed,
  Canceled,
}

impl PackageVerifyState {
  /// 判断校验是否仍在扫描本地文件。
  pub fn is_active(self) -> bool {
    matches!(self, Self::Scanning)
  }
}

/// 安装完整性校验进度与结果；不健康完成时附带可执行的修复计划。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageVerifySummary {
  pub session_id: String,
  pub installation_id: String,
  pub version: String,
  pub state: PackageVerifyState,
  pub healthy: Option<bool>,
  pub issue_count: usize,
  pub plan: Option<PackagePlanSummary>,
  pub total_files: usize,
  pub completed_files: usize,
  pub total_bytes: u64,
  pub hashed_bytes: u64,
  pub current_file: Option<String>,
  pub bytes_per_second: u64,
  pub eta_seconds: Option<u64>,
  pub elapsed_ms: u64,
  pub total_elapsed_ms: u64,
  pub error_message: Option<String>,
  pub updated_at: String,
}

/// 游戏资源长任务的持久化状态。
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageTaskState {
  Queued,
  Downloading,
  Paused,
  ReadyToApply,
  Assembling,
  CommitPrepared,
  Committing,
  Verifying,
  PublishPending,
  Published,
  Verified,
  RegistrationPending,
  RepairRequired,
  RollingBack,
  Completed,
  RecoveryRequired,
  Failed,
  Canceled,
}

impl PackageTaskState {
  /// 判断任务是否仍可能持有安装级运行互斥。
  pub fn is_active(self) -> bool {
    matches!(
      self,
      Self::Queued
        | Self::Downloading
        | Self::Assembling
        | Self::Committing
        | Self::Verifying
        | Self::PublishPending
        | Self::Published
        | Self::Verified
        | Self::RegistrationPending
        | Self::RollingBack
    )
  }

  /// 判断应用重启后是否必须先恢复任务，才能再次启动游戏。
  pub fn requires_recovery(self) -> bool {
    matches!(
      self,
      Self::Assembling
        | Self::CommitPrepared
        | Self::Committing
        | Self::Verifying
        | Self::PublishPending
        | Self::Published
        | Self::Verified
        | Self::RegistrationPending
        | Self::RollingBack
        | Self::RecoveryRequired
    )
  }

  /// 判断未完成提交或待修复状态是否应阻止启动游戏。
  pub fn blocks_launch(self) -> bool {
    self.requires_recovery() || self == Self::RepairRequired
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
  pub source_scheme: SchemeId,
  pub target_scheme: SchemeId,
  pub install_root: Option<String>,
  pub audio_languages: Vec<String>,
  pub source_audio_languages: Vec<String>,
  pub target_audio_languages: Vec<String>,
  pub source_tag: Option<String>,
  pub target_tag: String,
  pub manifest_digest: String,
  pub state: PackageTaskState,
  pub downloaded_bytes: u64,
  pub total_bytes: u64,
  pub completed_count: usize,
  pub total_count: usize,
  pub assembly_completed_count: usize,
  pub assembly_total_count: usize,
  pub assembly_completed_bytes: u64,
  pub assembly_total_bytes: u64,
  pub active_assembly_count: usize,
  pub commit_completed_count: usize,
  pub commit_total_count: usize,
  pub commit_current_step: Option<String>,
  pub verification_completed_count: usize,
  pub verification_total_count: usize,
  pub spool_bytes: u64,
  pub released_bytes: u64,
  pub assembly_completed_bytes_total: u64,
  pub delete_total_bytes: u64,
  pub delete_completed_bytes: u64,
  pub current_file: Option<String>,
  pub download_current_file: Option<String>,
  pub assembly_current_file: Option<String>,
  pub bytes_per_second: u64,
  pub eta_seconds: Option<u64>,
  pub assembly_bytes_per_second: u64,
  pub assembly_eta_seconds: Option<u64>,
  pub elapsed_ms: u64,
  pub error_message: Option<String>,
  pub updated_at: String,
}

/// 清理安全终态资源任务记录后的结果。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageTaskCleanupSummary {
  pub removed_count: usize,
  pub removed_bytes: u64,
  pub removed_task_ids: Vec<String>,
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

/// 同资源家族渠道转换的只读计划摘要；不含 SDK 下载地址。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageSwitchSummary {
  pub plan_id: String,
  pub installation_id: String,
  pub source_scheme: SchemeId,
  pub target_scheme: SchemeId,
  pub source_channel: u32,
  pub source_sub_channel: u32,
  pub target_channel: u32,
  pub target_sub_channel: u32,
  pub sdk_required: bool,
  pub sdk_version: Option<String>,
  pub download_bytes: u64,
  pub install_bytes: u64,
  pub cache_hit_bytes: u64,
  pub delete_count: usize,
  pub delete_files: Vec<String>,
  pub required_free_bytes: u64,
  pub available_free_bytes: u64,
  pub has_sufficient_space: bool,
}

/// 应用数据目录中游戏资源缓存的占用摘要；不含 switch/verify/tasks 会话。
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageCacheSummary {
  pub chunk_bytes: u64,
  pub chunk_count: usize,
  pub chunk_protected_bytes: u64,
  pub chunk_protected_count: usize,
  pub sdk_bytes: u64,
  pub sdk_count: usize,
  pub sdk_protected_bytes: u64,
  pub sdk_protected_count: usize,
  pub total_bytes: u64,
  pub reclaimable_bytes: u64,
}
