/**
 * UIAF 插件类型定义文件
 * @since Beta v0.7.8
 */

declare namespace TGApp.Plugins.UIAF {
  /**
   * UIAF完整数据
   * @since Alpha v0.1.5
   */
  type Data = {
    /** UIAF 头部信息 */
    info: Export;
    /** UIAF 成就列表 */
    list: Array<Achievement>;
  };

  /**
   * UIAF 头部信息
   * @since Alpha v0.1.5
   */
  type Export = {
    /** 导出的应用名称 */
    export_app: string;
    /** 导出时间戳，秒级 */
    export_timestamp: number;
    /** 导出的应用版本 */
    export_app_version: string;
    /** UIAF 版本 */
    uiaf_version: string;
  };

  /**
   * 成就完成状态
   * @since Beta v0.7.8
   */
  const AchiItemStat = <const>{
    /** 无效状态 */
    Invalid: 0,
    /** 未完成 */
    Unfinished: 1,
    /** 已完成未领取奖励 */
    Finished: 2,
    /** 已领取奖励 */
    RewardTaken: 3,
  };

  /**
   * 成就完成状态枚举
   * @since Beta v0.7.8
   */
  type AchiItemStatEnum = (typeof AchiItemStat)[keyof typeof AchiItemStat];

  /**
   * 成就信息
   * @since Beta v0.7.8
   */
  type Achievement = {
    /** 成就 ID */
    id: number;
    /** 成就记录时间戳，秒级 */
    timestamp: number;
    /** 成就进度 */
    current: number;
    /** 成就状态 */
    status: AchiItemStatEnum;
  };
}
