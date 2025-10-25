/**
 * 数据库抽卡记录相关类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.Sqlite.GachaRecords {
  /**
   * 原神抽卡记录表类型定义
   * @since Alpha v0.2.3
   */
  type TableGacha = {
    /** 抽卡记录 ID */
    id: string;
    /** UID */
    uid: string;
    /** 抽卡类型 */
    gachaType: string;
    /** UIGF 类型 */
    uigfType: string;
    /**
     * 抽卡时间
     * @remarks
     * 从接口获取的数据均为 UTC+8 时间
     * 从外部导入数据也转换为 UTC+8 时间
     */
    time: string;
    /** 抽卡物品 ID */
    itemId: string;
    /**
     * 抽卡物品名称
     * @remarks
     * 从接口获取的数据均为中文名称
     * 从外部导入数据从本地字典中获取中文名称
     */
    name: string;
    /** 抽卡物品类型 */
    type: string;
    /** 抽卡物品星级 */
    rank: string;
    /**
     * 抽卡物品数量
     * @remarks 恒为 "1"
     */
    count: string;
    /** 数据库更新时间 */
    updated: string;
  };

  /**
   * 千星奇域抽卡记录表类型定义
   * @since Beta v0.8.4
   */
  type TableGachaB = {
    /** 抽卡记录 ID */
    id: string;
    /** UID */
    uid: string;
    /** 服务器区域 */
    region: string;
    /** 排期 ID */
    scheduleId: string;
    /**
     * 抽卡类型
     * @remarks
     * 1000-常驻池
     * 2000-活动池
     */
    gachaType: string;
    /** 抽卡时间 */
    time: string;
    /** 抽卡物品 ID */
    itemId: string;
    /**
     * 抽卡物品名称
     * @remarks
     * 从接口获取到的为中文名称
     * 从外部导入数据需要转换为中文名称
     */
    name: string;
    /**
     * 抽卡物品类型
     * @remarks
     * 从接口获取到的为中文名称
     * 从外部导入数据需要转换为中文名称
     */
    type: string;
    /** 抽卡物品星级 */
    rank: string;
    /**
     * 是否是 UP 物品
     * @remarks 0-否，1-是
     */
    isUp: string;
    /** 数据库更新时间 */
    updated: string;
  };
}
