/**
 * 数据库抽卡记录相关类型定义文件
 * @since Beta v0.9.5
 */

declare namespace TGApp.Sqlite.Gacha {
  /**
   * 祈愿数据类型
   * @since Beta v0.9.1
   * @remarks GachaRecords 表
   */
  type Gacha = {
    /** 抽卡记录 ID */
    id: string;
    /** UID */
    uid: string;
    /** 抽卡类型 */
    gachaType: TGApp.Game.Gacha.GachaTypeEnum;
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
   * 颂愿数据类型
   * @since Beta v0.9.1
   * @remarks GachaBRecords 表
   */
  type GachaB = {
    /** 抽卡记录 ID */
    id: string;
    /** UID */
    uid: string;
    /**
     * 服务器区域
     * @deprecated 弃用
     */
    region: string;
    /** 排期 ID */
    scheduleId: string;
    /**
     * 抽卡类型
     * @example
     * 1000-常驻池
     * 2000-活动池
     * 20011-男活动池
     * 20012-男活动池2
     * 20021-女活动池
     * 20022-女活动池2
     */
    gachaType: TGApp.Game.Gacha.GachaBTypeEnum;
    /**
     * 抽卡类型（接口用）
     * @example
     * 1000-常驻池
     * 2000-活动池
     */
    opGachaType: string;
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
     * @deprecated 弃用
     */
    isUp: 0 | 1;
    /** 数据库更新时间 */
    updated: string;
  };
}
