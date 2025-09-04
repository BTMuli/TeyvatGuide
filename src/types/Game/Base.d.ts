/**
 * @file types/Game/Base.d.ts
 * @description 游戏相关基础类型定义文件
 * @since Beta v0.7.11
 */

declare namespace TGApp.Game.Base {
  /**
   * @description 服务器类型
   * @since Beta v0.8.0
   * @const ServerType
   * @property {string} "cn_gf01" - 国内-国服
   * @property {string} "cn_qd01" - 国内-渠道服
   * @property {string} "os_usa" - 海外-美国
   * @property {string} "os_euro" - 海外-欧洲
   * @property {string} "os_asia" - 海外-亚洲
   * @property {string} "os_cht" - 海外-繁体中文
   */
  const ServerType = <const>{
    CN_GF01: "cn_gf01",
    CN_QD01: "cn_qd01",
    OS_USA: "os_usa",
    OS_EURO: "os_euro",
    OS_ASIA: "os_asia",
    OS_CHT: "os_cht",
  };

  /**
   * @description 公告服务器类型枚举
   * @since Beta v0.8.0
   * @enum ServerTypeEnum
   */
  type ServerTypeEnum = (typeof ServerType)[keyof typeof ServerType];

  /**
   * @description 时间类型
   * @since Beta v0.7.11
   * @interface DateTime
   * @property {number} year - 年份
   * @property {number} month - 月份（1-12）
   * @property {number} day - 日（1-31）
   * @property {number} hour - 小时（0-23）
   * @property {number} minute - 分钟（0-59）
   * @property {number} second - 秒（0-59）
   */
  type DateTime = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}
