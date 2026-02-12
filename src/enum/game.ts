/**
 * 游戏相关枚举
 * @since Beta v0.9.6
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
  },
};

export default gameEnum;
