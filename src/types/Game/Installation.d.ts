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

  /** 新安装向导选择目录后的后端校验结果。 */
  type InstallLocationSummary = {
    kind: LocationKindEnum;
    installation: Item | null;
    message: string | null;
  };
}
