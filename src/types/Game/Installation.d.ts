/**
 * 游戏安装与客户端方案类型。
 * @since Beta v0.11.5
 */

declare namespace TGApp.Game.Installation {
  /** 支持的国服客户端方案。 */
  const Scheme = <const>{
    CN_OFFICIAL: "cn_official",
    CN_BILIBILI: "cn_bilibili",
  };

  /** 支持的国服客户端方案值。 */
  type SchemeEnum = (typeof Scheme)[keyof typeof Scheme];

  /** 安装检测状态。 */
  const Status = <const>{
    KNOWN: "known",
    UNSUPPORTED: "unsupported",
    INCONSISTENT: "inconsistent",
  };

  /** 安装检测状态值。 */
  type StatusEnum = (typeof Status)[keyof typeof Status];

  /** 安装目录识别结果。 */
  const LocationKind = <const>{
    EMPTY: "empty",
    EXISTING: "existing",
    OCCUPIED: "occupied",
  };

  /** 安装目录识别结果值。 */
  type LocationKindEnum = (typeof LocationKind)[keyof typeof LocationKind];

  /** 未完成全新安装草稿状态。 */
  const InstallDraftState = <const>{
    CREATED: "created",
    PLANNED: "planned",
    DOWNLOADING: "downloading",
    READY_TO_APPLY: "ready_to_apply",
    ASSEMBLING: "assembling",
    COMMIT_PREPARED: "commit_prepared",
    PUBLISH_PENDING: "publish_pending",
    PUBLISHED: "published",
    VERIFIED: "verified",
    REGISTRATION_PENDING: "registration_pending",
    COMPLETED: "completed",
    RECOVERY_REQUIRED: "recovery_required",
    CANCELED: "canceled",
  };

  /** 未完成全新安装草稿状态值。 */
  type InstallDraftStateEnum = (typeof InstallDraftState)[keyof typeof InstallDraftState];

  /** 自动发现安装的来源。 */
  const DiscoverySource = <const>{
    HOYOPLAY_REGISTRY: "hoyoplay_registry",
    UNITY_LOG: "unity_log",
  };

  /** 自动发现安装来源值。 */
  type DiscoverySourceEnum = (typeof DiscoverySource)[keyof typeof DiscoverySource];

  /** 已登记安装及其最新磁盘检测结果。 */
  type Item = {
    /** 稳定安装 ID。 */
    id: string;
    /** 规范化后的可执行文件路径。 */
    executablePath: string;
    /** 游戏根目录。 */
    rootPath: string;
    /** 当前磁盘识别出的方案。 */
    schemeId: SchemeEnum | null;
    /** 用户上次选定的目标方案。 */
    preferredScheme: SchemeEnum | null;
    /** 检测状态。 */
    status: StatusEnum;
    /** 可展示的检测说明。 */
    statusMessage: string;
    /** 本地游戏版本。 */
    version: string | null;
    /** config.ini channel。 */
    channel: number | null;
    /** config.ini sub_channel。 */
    subChannel: number | null;
    /** 是否存在渠道 SDK。 */
    hasChannelSdk: boolean;
    /** 已安装语音语言。 */
    audioLanguages: Array<string>;
    /** 是否为当前安装。 */
    isChosen: boolean;
    /** 最近一次成功记录时间。 */
    lastSeen: string;
  };

  /** 未完成全新安装的 Rust 持久化草稿投影。 */
  type InstallDraftSummary = {
    draftId: string;
    installId: string;
    installRoot: string;
    scheme: SchemeEnum;
    audioLanguages: Array<string>;
    state: InstallDraftStateEnum;
    planId: string | null;
    targetTag: string | null;
  };

  /** 全新安装需要临时排除 Windows Defender 扫描的目录集合。 */
  type InstallDraftDirs = {
    /** 游戏安装目标目录。 */
    targetRoot: string;
    /** 安装任务临时 spool 目录。 */
    spoolRoot: string;
    /** 安装组装暂存目录。 */
    stagingRoot: string;
    /** 游戏资源下载缓存目录。 */
    downloadRoot: string;
    /** 当前安装任务 journal 目录。 */
    journalRoot: string;
  };

  /** 新安装向导选择目录后的后端校验结果。 */
  type InstallLocationSummary = {
    kind: LocationKindEnum;
    installation: Item | null;
    message: string | null;
  };

  /** 卸载进度事件载荷（`game-uninstall://progress`）。 */
  type UninstallProgress = {
    completed: number;
    total: number;
    current: string | null;
  };

  /** 卸载完成结果。 */
  type UninstallSummary = {
    removedFiles: number;
    removedDirs: number;
  };

  /** 自动发现的一个候选安装及命中的来源列表。 */
  type DiscoveryCandidate = {
    /** 后端检测后的安装快照。 */
    installation: Item;
    /** 命中的发现来源。 */
    sources: Array<DiscoverySourceEnum>;
  };

  /** 单个来源的非致命告警；code 为稳定错误码，不含本地路径。 */
  type DiscoveryNotice = {
    source: DiscoverySourceEnum;
    code: string;
  };

  /** 自动定位报告：排序后的候选与来源级告警。 */
  type DiscoveryResult = {
    candidates: Array<DiscoveryCandidate>;
    notices: Array<DiscoveryNotice>;
  };
}
