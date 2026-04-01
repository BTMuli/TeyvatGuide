/**
 * 游戏相关枚举
 * @since Beta v0.9.9
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
 * @see  TGApp.Game.ActCalendar.ActTypeEnum
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
  actCalendarType: ActCalendarTypeEnum,
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
};

export default gameEnum;
