/**
 * 游戏相关枚举
 * @since Beta v0.9.0
 */

/**
 * 服务器类型
 * @since Beta v0.8.0
 */
export const GameServerEnum: typeof TGApp.Game.Base.ServerType = {
  /** 国服-官方服 */
  CN_GF01: "cn_gf01",
  /** 国服-渠道服 */
  CN_QD01: "cn_qd01",
  /** 国际服-美服 */
  OS_USA: "os_usa",
  /** 国际服-欧服 */
  OS_EURO: "os_euro",
  /** 国际服-亚服 */
  OS_ASIA: "os_asia",
  /** 国际服-港澳台服 */
  OS_CHT: "os_cht",
};

/**
 * 获取公告服务器描述
 * @since Beta v0.8.0
 * @param {TGApp.Game.Base.ServerTypeEnum} server 公告服务器
 * @return {string} 公告服务器描述
 */
export function getGameServerDesc(server: TGApp.Game.Base.ServerTypeEnum): string {
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
 */
export const ActCalendarTypeEnum: typeof TGApp.Game.ActCalendar.ActType = {
  /** 幽境危战 */
  HardChallenge: "ActTypeHardChallenge",
  /** 真境剧诗 */
  RoleCombat: "ActTypeRoleCombat",
  /** 深渊螺旋 */
  Tower: "ActTypeTower",
  /** 双倍活动 */
  Double: "ActTypeDouble",
  /** 探索活动 */
  Explore: "ActTypeExplore",
  /** 立本活动 */
  LiBen: "ActTypeLiBen",
  /** 累登活动 */
  SignIn: "ActTypeSignIn",
  /** 其他活动 */
  Other: "ActTypeOther",
};
