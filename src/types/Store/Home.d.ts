/**
 * 首页状态类型
 * @since Beta v0.12.0
 */

declare namespace TGApp.Store.Home {
  /**
   * 组件展示项
   * @since Beta v0.9.0
   */
  type ShowItem = {
    /** 是否展示 */
    show: boolean;
    /** 文本 */
    label: string;
    /** 顺序 */
    order: number;
  };

  /**
   * 首页组件切换状态
   * @since Beta v0.12.0
   */
  type SwitchState = {
    /** 素材日历：true 为今日素材，false 为养成计划 */
    showCalendar: boolean;
    /** 近期活动：true 为用户，false 为百科 */
    isUserPos: boolean;
    /** 限时祈愿：true 为用户，false 为百科 */
    isUserPool: boolean;
    /** 便笺签到：true 为实时便笺，false 为游戏签到 */
    isDailyNote: boolean;
  };
}
