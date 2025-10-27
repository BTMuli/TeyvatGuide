/**
 * 游戏相关基础类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Base {
  /**
   * 服务器类型
   * @since Beta v0.8.0
   */
  const ServerType = <const>{
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
   * 公告服务器类型枚举
   * @since Beta v0.8.0
   */
  type ServerTypeEnum = (typeof ServerType)[keyof typeof ServerType];

  /**
   * 时间类型
   * @since Beta v0.8.0
   */
  type DateTime = {
    /** 年份 */
    year: number;
    /** 月份（1-12） */
    month: number;
    /** 日（1-31） */
    day: number;
    /** 小时（0-23） */
    hour: number;
    /** 分钟（0-59） */
    minute: number;
    /** 秒（0-59） */
    second: number;
  };
}
