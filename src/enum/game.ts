/**
 * @file enum/game.ts
 * @description 游戏相关枚举
 * @since Beta v0.8.0
 */

/**
 * @description 服务器类型
 * @since Beta v0.8.0
 * @const GameServerEnum
 */
export const GameServerEnum: typeof TGApp.Game.Base.ServerType = {
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
  OS_USA: "os_usa",
  OS_EURO: "os_euro",
  OS_ASIA: "os_asia",
  OS_CHT: "os_cht",
};

/**
 * @description 获取公告服务器描述
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
 * @description 近期活动活动类型枚举
 * @since Beta v0.8.0
 * @enum ActCalendarTypeEnum
 */
export const ActCalendarTypeEnum: typeof TGApp.Game.ActCalendar.ActType = {
  HardChallenge: "ActTypeHardChallenge",
  RoleCombat: "ActTypeRoleCombat",
  Tower: "ActTypeTower",
  Double: "ActTypeDouble",
  Explore: "ActTypeExplore",
  Other: "ActTypeOther",
};
