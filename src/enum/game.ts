/**
 * 游戏相关枚举
 * @since Beta v0.11.5
 */

/**
 * 服务器类型枚举
 * @since Beta v0.8.0
 * @see TGApp.Game.Base.ServerTypeEnum
 */
const GameServerEnum: typeof TGApp.Game.Base.ServerType = {
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
  OS_USA: "os_usa",
  OS_EURO: "os_euro",
  OS_ASIA: "os_asia",
  OS_CHT: "os_cht",
};

/**
 * 游戏安装方案枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Installation.SchemeEnum
 */
const GameInstallationSchemeEnum: typeof TGApp.Game.Installation.Scheme = {
  CN_OFFICIAL: "cn_official",
  CN_BILIBILI: "cn_bilibili",
};

/**
 * 游戏安装检测状态枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Installation.StatusEnum
 */
const GameInstallationStatusEnum: typeof TGApp.Game.Installation.Status = {
  KNOWN: "known",
  UNSUPPORTED: "unsupported",
  INCONSISTENT: "inconsistent",
};

/**
 * 游戏安装目录识别结果枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Installation.LocationKindEnum
 */
const GameInstallationLocationKindEnum: typeof TGApp.Game.Installation.LocationKind = {
  EMPTY: "empty",
  EXISTING: "existing",
  OCCUPIED: "occupied",
};

/**
 * 游戏本体安装草稿状态枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Installation.InstallDraftStateEnum
 */
const GameInstallationInstallDraftStateEnum: typeof TGApp.Game.Installation.InstallDraftState = {
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

/**
 * 游戏资源计划目标枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Package.PlanTargetEnum
 */
const GamePackagePlanTargetEnum: typeof TGApp.Game.Package.PlanTarget = {
  MAIN: "main",
  PRE_DOWNLOAD: "pre_download",
  AUDIO: "audio",
  SWITCH: "switch",
  INSTALL: "install",
};

/**
 * 游戏资源完整性校验状态枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Package.VerifyStateEnum
 */
const GamePackageVerifyStateEnum: typeof TGApp.Game.Package.VerifyState = {
  SCANNING: "scanning",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
};

/**
 * 获取完整性校验状态描述。
 * @since Beta v0.11.5
 * @param state - 校验状态
 * @returns 状态描述
 */
function getGamePackageVerifyStateDesc(state: TGApp.Game.Package.VerifyStateEnum): string {
  switch (state) {
    case GamePackageVerifyStateEnum.SCANNING:
      return "正在校验";
    case GamePackageVerifyStateEnum.COMPLETED:
      return "校验完成";
    case GamePackageVerifyStateEnum.FAILED:
      return "校验失败";
    case GamePackageVerifyStateEnum.CANCELED:
      return "已暂停";
  }
}

/**
 * 判断完整性校验是否仍在扫描。
 * @since Beta v0.11.5
 * @param state - 校验状态
 * @returns 是否占用扫描任务
 */
function isGamePackageVerifyActive(state: TGApp.Game.Package.VerifyStateEnum): boolean {
  return state === GamePackageVerifyStateEnum.SCANNING;
}

/**
 * 游戏资源计划策略枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Package.PlanStrategyEnum
 */
const GamePackagePlanStrategyEnum: typeof TGApp.Game.Package.PlanStrategy = {
  PATCH: "patch",
  MANIFEST_DIFF: "manifest_diff",
  FULL: "full",
};

/**
 * 游戏资源任务状态枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Package.TaskStateEnum
 */
const GamePackageTaskStateEnum: typeof TGApp.Game.Package.TaskState = {
  QUEUED: "queued",
  DOWNLOADING: "downloading",
  PAUSED: "paused",
  READY_TO_APPLY: "ready_to_apply",
  ASSEMBLING: "assembling",
  COMMIT_PREPARED: "commit_prepared",
  COMMITTING: "committing",
  VERIFYING: "verifying",
  PUBLISH_PENDING: "publish_pending",
  PUBLISHED: "published",
  VERIFIED: "verified",
  REGISTRATION_PENDING: "registration_pending",
  REPAIR_REQUIRED: "repair_required",
  ROLLING_BACK: "rolling_back",
  COMPLETED: "completed",
  RECOVERY_REQUIRED: "recovery_required",
  FAILED: "failed",
  CANCELED: "canceled",
};

/**
 * 游戏资源任务恢复动作枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Package.RecoveryActionEnum
 */
const GamePackageRecoveryActionEnum: typeof TGApp.Game.Package.RecoveryAction = {
  RESUME: "resume",
  ROLLBACK: "rollback",
};

/**
 * 获取游戏资源任务状态描述。
 * @since Beta v0.11.5
 * @param state - 资源任务状态
 * @returns 状态描述
 */
function getGamePackageTaskStateDesc(state: TGApp.Game.Package.TaskStateEnum): string {
  switch (state) {
    case GamePackageTaskStateEnum.QUEUED:
      return "等待开始";
    case GamePackageTaskStateEnum.DOWNLOADING:
      return "正在下载";
    case GamePackageTaskStateEnum.PAUSED:
      return "已暂停";
    case GamePackageTaskStateEnum.READY_TO_APPLY:
      return "下载完成";
    case GamePackageTaskStateEnum.ASSEMBLING:
      return "正在组装";
    case GamePackageTaskStateEnum.COMMIT_PREPARED:
      return "等待提交";
    case GamePackageTaskStateEnum.COMMITTING:
      return "正在提交";
    case GamePackageTaskStateEnum.VERIFYING:
      return "正在验证";
    case GamePackageTaskStateEnum.PUBLISH_PENDING:
      return "等待发布";
    case GamePackageTaskStateEnum.PUBLISHED:
      return "已发布，等待复检";
    case GamePackageTaskStateEnum.VERIFIED:
      return "复检完成";
    case GamePackageTaskStateEnum.REGISTRATION_PENDING:
      return "等待登记";
    case GamePackageTaskStateEnum.REPAIR_REQUIRED:
      return "等待修复";
    case GamePackageTaskStateEnum.ROLLING_BACK:
      return "正在回滚";
    case GamePackageTaskStateEnum.COMPLETED:
      return "已完成";
    case GamePackageTaskStateEnum.RECOVERY_REQUIRED:
      return "等待恢复";
    case GamePackageTaskStateEnum.FAILED:
      return "任务失败";
    case GamePackageTaskStateEnum.CANCELED:
      return "已取消";
  }
}

/**
 * 判断资源任务是否仍在运行。
 * @since Beta v0.11.5
 * @param state - 资源任务状态
 * @returns 是否占用安装级运行互斥
 */
function isGamePackageTaskActive(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === GamePackageTaskStateEnum.QUEUED ||
    state === GamePackageTaskStateEnum.DOWNLOADING ||
    isGamePackageTaskApplying(state)
  );
}

/**
 * 判断资源任务是否已进入组装或提交阶段。
 * @since Beta v0.11.5
 * @param state - 资源任务状态
 * @returns 是否正在改写游戏目录或准备提交
 */
function isGamePackageTaskApplying(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === GamePackageTaskStateEnum.ASSEMBLING ||
    state === GamePackageTaskStateEnum.COMMIT_PREPARED ||
    state === GamePackageTaskStateEnum.COMMITTING ||
    state === GamePackageTaskStateEnum.VERIFYING ||
    state === GamePackageTaskStateEnum.PUBLISH_PENDING ||
    state === GamePackageTaskStateEnum.PUBLISHED ||
    state === GamePackageTaskStateEnum.VERIFIED ||
    state === GamePackageTaskStateEnum.REGISTRATION_PENDING ||
    state === GamePackageTaskStateEnum.ROLLING_BACK
  );
}

/**
 * 判断中断任务是否应展示恢复入口。
 * @since Beta v0.11.5
 * @param state - 资源任务状态
 * @returns 是否可安全恢复或回滚
 */
function isGamePackageTaskRecoverable(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === GamePackageTaskStateEnum.RECOVERY_REQUIRED ||
    state === GamePackageTaskStateEnum.FAILED ||
    state === GamePackageTaskStateEnum.PAUSED ||
    state === GamePackageTaskStateEnum.CANCELED
  );
}

/**
 * 获取游戏资源计划策略描述。
 * @since Beta v0.11.5
 * @param strategy - 计划差异策略
 * @returns 策略描述
 */
function getGamePackagePlanStrategyDesc(strategy: TGApp.Game.Package.PlanStrategyEnum): string {
  switch (strategy) {
    case GamePackagePlanStrategyEnum.PATCH:
      return "官方差分包";
    case GamePackagePlanStrategyEnum.FULL:
      return "完整安装";
    case GamePackagePlanStrategyEnum.MANIFEST_DIFF:
      return "资源清单差异";
  }
}

/**
 * 获取游戏安装方案描述。
 * @since Beta v0.11.5
 * @param scheme - 游戏安装方案
 * @returns 方案描述
 */
function getGameInstallationSchemeDesc(scheme: TGApp.Game.Installation.SchemeEnum | null): string {
  switch (scheme) {
    case GameInstallationSchemeEnum.CN_OFFICIAL:
      return "国服官服";
    case GameInstallationSchemeEnum.CN_BILIBILI:
      return "国服 B 服";
    default:
      return "未知渠道";
  }
}

/**
 * 服务器类型只读列表
 * @since Beta v0.9.1
 */
const GameServerList: ReadonlyArray<TGApp.Game.Base.ServerTypeEnum> = [
  GameServerEnum.CN_GF01,
  GameServerEnum.CN_QD01,
  GameServerEnum.OS_USA,
  GameServerEnum.OS_EURO,
  GameServerEnum.OS_ASIA,
  GameServerEnum.OS_CHT,
];

/**
 * 获取公告服务器描述
 * @since Beta v0.8.0
 * @param server - 公告服务器
 * @returns 公告服务器描述
 */
function getGameServerDesc(server: TGApp.Game.Base.ServerTypeEnum): string {
  switch (server) {
    case GameServerEnum.CN_GF01:
      return "国服-官方服";
    case GameServerEnum.CN_QD01:
      return "国服-渠道服";
    case GameServerEnum.OS_USA:
      return "国际服-美服";
    case GameServerEnum.OS_EURO:
      return "国际服-欧服";
    case GameServerEnum.OS_ASIA:
      return "国际服-亚服";
    case GameServerEnum.OS_CHT:
      return "国际服-港澳台服";
  }
}

/**
 * 近期活动活动类型枚举
 * @since Beta v0.9.0
 * @see TGApp.Game.ActCalendar.ActTypeEnum
 */
const ActCalendarTypeEnum: typeof TGApp.Game.ActCalendar.ActType = {
  HardChallenge: "ActTypeHardChallenge",
  RoleCombat: "ActTypeRoleCombat",
  Tower: "ActTypeTower",
  Double: "ActTypeDouble",
  Explore: "ActTypeExplore",
  LiBen: "ActTypeLiBen",
  SignIn: "ActTypeSignIn",
  Other: "ActTypeOther",
};

/**
 * 卡池状态枚举
 * @since Beta v0.10.2
 * @see TGApp.Game.ActCalendar.PoolStatusEnum
 */
const ActCalendarPoolStatusEnum: typeof TGApp.Game.ActCalendar.PoolStatus = {
  NotStart: 1,
  Ongoing: 2,
  Ended: 3,
};

/**
 * 卡池类型枚举
 * @since Beta v0.10.2
 * @see TGApp.Game.ActCalendar.PoolTypeEnum
 */
const ActCalendarPoolTypeEnum: typeof TGApp.Game.ActCalendar.PoolType = {
  Avatar: 1,
  Weapon: 2,
  Mixed: 3,
};

/**
 * 祈愿类型枚举
 * @since Beta v0.9.1
 * @see TGApp.Game.Gacha.GachaTypeEnum
 */
const GachaTypeEnum: typeof TGApp.Game.Gacha.GachaType = {
  Newbie: "100",
  Normal: "200",
  AvatarUp: "301",
  AvatarUp2: "400",
  WeaponUp: "302",
  MixUp: "500",
};

/**
 * 登录二维码状态枚举
 * @since Beta v0.9.1
 * @see TGApp.Game.Login.QrStatEnum
 */
const LoginQrStatEnum: typeof TGApp.Game.Login.QrStat = {
  INIT: "Init",
  SCANNED: "Scanned",
  CONFIRMED: "Confirmed",
};

/**
 * 公告语言类型枚举
 * @since Beta v0.9.1
 * @see TGApp.Game.Anno.AnnoLangEnum
 */
const GameAnnoLangEnum: typeof TGApp.Game.Anno.AnnoLang = {
  CHS: "zh-cn",
  CHT: "zh-tw",
  EN: "en",
  JP: "ja",
};

/**
 * 公告语言只读列表
 * @since Beta v0.9.1
 */
const GameAnnoLangList: ReadonlyArray<TGApp.Game.Anno.AnnoLangEnum> = [
  GameAnnoLangEnum.CHS,
  GameAnnoLangEnum.CHT,
  GameAnnoLangEnum.EN,
  GameAnnoLangEnum.JP,
];

/**
 * 获取公告语言描述
 * @since Beta v0.9.1
 * @param lang - 公告语言
 * @returns 公告语言描述
 */
function getGameAnnoLangDesc(lang: TGApp.Game.Anno.AnnoLangEnum): string {
  switch (lang) {
    case GameAnnoLangEnum.CHS:
      return "简体中文";
    case GameAnnoLangEnum.CHT:
      return "繁体中文";
    case GameAnnoLangEnum.EN:
      return "英语";
    case GameAnnoLangEnum.JP:
      return "日语";
  }
}

/**
 * 剧诗角色类型枚举
 * @since Beta v0.9.9
 * @see TGApp.Game.Combat.AvatarTypeEnum
 */
const CombatAvatarTypeEnum: typeof TGApp.Game.Combat.AvatarType = {
  SELF: 1,
  TRIAL: 2,
  SUPPORT: 3,
};

/**
 * 获取剧诗角色类型描述
 * @since Beta v0.9.9
 * @param avatarType - 剧诗角色类型
 * @returns 剧诗角色类型描述
 */
function getCombatAvatarTypeDesc(avatarType: TGApp.Game.Combat.AvatarTypeEnum): string {
  switch (avatarType) {
    case CombatAvatarTypeEnum.SELF:
      return "";
    case CombatAvatarTypeEnum.TRIAL:
      return "试用角色";
    case CombatAvatarTypeEnum.SUPPORT:
      return "助演角色";
  }
}

/**
 * 剧诗难度类型枚举
 * @since Beta v0.9.9
 * @see TGApp.Game.Combat.DiffEnum
 */
const CombatDiffEnum: typeof TGApp.Game.Combat.Difficulty = {
  NONE: 0,
  EASY: 1,
  NORMAL: 2,
  HARD: 3,
  MASTER: 4,
  TAROT: 5,
};

/**
 * 获取剧诗难度描述
 * @since Beta v0.9.9
 * @param difficultyId - 剧诗难度等级
 * @returns 剧诗难度描述
 */
function getCombatDiffDesc(difficultyId: TGApp.Game.Combat.DiffEnum): string {
  switch (difficultyId) {
    case CombatDiffEnum.NONE:
      return "未选择";
    case CombatDiffEnum.EASY:
      return "轻简模式";
    case CombatDiffEnum.NORMAL:
      return "普通模式";
    case CombatDiffEnum.HARD:
      return "困难模式";
    case CombatDiffEnum.MASTER:
      return "卓越模式";
    case CombatDiffEnum.TAROT:
      return "月谕模式";
    default:
      return `未知模式${difficultyId}`;
  }
}

/**
 * 幽境危战难度类型枚举
 * @since Beta v0.9.9
 * @see TGApp.Game.Challenge.DiffEnum
 */
const ChallengeDiffEnum: typeof TGApp.Game.Challenge.Difficulty = {
  NONE: 0,
  NORMAL: 1,
  ADVANCED: 2,
  HARD: 3,
  DANGEROUS: 4,
  FEARLESS: 5,
  DESPERATE: 6,
};

/**
 * 获取幽境危战难度描述
 * @since Beta v0.9.9
 * @param difficulty - 幽境危战难度
 * @returns 幽境危战难度描述
 */
function getChallengeDiffDesc(difficulty: TGApp.Game.Challenge.DiffEnum): string {
  switch (difficulty) {
    case ChallengeDiffEnum.NONE:
      return "未挑战";
    case ChallengeDiffEnum.NORMAL:
      return "普通";
    case ChallengeDiffEnum.ADVANCED:
      return "进阶";
    case ChallengeDiffEnum.HARD:
      return "困难";
    case ChallengeDiffEnum.DANGEROUS:
      return "险恶";
    case ChallengeDiffEnum.FEARLESS:
      return "无畏";
    case ChallengeDiffEnum.DESPERATE:
      return "绝境";
    default:
      return `难度${difficulty}`;
  }
}

/**
 * 战绩角色元素枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Record.AvatarElementEnum
 */
const RecordAvatarElementEnum: typeof TGApp.Game.Record.AvatarElement = {
  ANEMO: "Anemo",
  GEO: "Geo",
  ELECTRO: "Electro",
  DENDRO: "Dendro",
  HYDRO: "Hydro",
  PYRO: "Pyro",
  CRYO: "Cryo",
};

/**
 * 战绩世界探索类型枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Record.WorldExploreTypeEnum
 */
const RecordWorldExploreTypeEnum: typeof TGApp.Game.Record.WorldExploreType = {
  REPUTATION: "Reputation",
  OFFERING: "Offering",
  UNKNOWN: "TypeUnknow",
};

/**
 * 战绩世界奉献物品开启状态枚举。
 * @since Beta v0.11.5
 * @see TGApp.Game.Record.WorldOfferingOpenStateEnum
 */
const RecordWorldOfferingOpenStateEnum: typeof TGApp.Game.Record.WorldOfferingOpenState = {
  UNKNOWN: "OfferingOpenStateUnknow",
  LOCKED: "OfferingOpenStateLocked",
  UNLOCKED: "OfferingOpenStateUnlocked",
};

/**
 * 绘想游迹状态枚举
 * @since Beta v0.9.6
 */
const CombatCharMasterStatEnum: typeof TGApp.Game.Combat.CharMasterStat = {
  LOCK: 1,
  UNFINISH: 2,
  DONE: 3,
};

/** 游戏相关枚举 */
const gameEnum = {
  installation: {
    scheme: GameInstallationSchemeEnum,
    schemeDesc: getGameInstallationSchemeDesc,
    status: GameInstallationStatusEnum,
    locationKind: GameInstallationLocationKindEnum,
    draftState: GameInstallationInstallDraftStateEnum,
  },
  package: {
    planTarget: GamePackagePlanTargetEnum,
    planStrategy: GamePackagePlanStrategyEnum,
    planStrategyDesc: getGamePackagePlanStrategyDesc,
    verifyState: GamePackageVerifyStateEnum,
    verifyStateDesc: getGamePackageVerifyStateDesc,
    verifyActive: isGamePackageVerifyActive,
    recoveryAction: GamePackageRecoveryActionEnum,
    taskState: GamePackageTaskStateEnum,
    taskStateDesc: getGamePackageTaskStateDesc,
    taskActive: isGamePackageTaskActive,
    taskApplying: isGamePackageTaskApplying,
    taskRecoverable: isGamePackageTaskRecoverable,
  },
  actCalendar: {
    actType: ActCalendarTypeEnum,
    poolStatus: ActCalendarPoolStatusEnum,
    poolType: ActCalendarPoolTypeEnum,
  },
  gachaType: GachaTypeEnum,
  server: GameServerEnum,
  serverList: GameServerList,
  serverDesc: getGameServerDesc,
  loginQrStat: LoginQrStatEnum,
  anno: {
    lang: GameAnnoLangEnum,
    langList: GameAnnoLangList,
    langDesc: getGameAnnoLangDesc,
  },
  combat: {
    charMasterStat: CombatCharMasterStatEnum,
    avatarType: CombatAvatarTypeEnum,
    avatarTypeDesc: getCombatAvatarTypeDesc,
    diff: CombatDiffEnum,
    diffDesc: getCombatDiffDesc,
  },
  challenge: {
    diff: ChallengeDiffEnum,
    diffDesc: getChallengeDiffDesc,
  },
  record: {
    avatarElement: RecordAvatarElementEnum,
    worldExploreType: RecordWorldExploreTypeEnum,
    worldOfferingOpenState: RecordWorldOfferingOpenStateEnum,
  },
};

export default gameEnum;
