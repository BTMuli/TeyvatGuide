/**
 * 首页状态类型
 * @since Beta v0.9.0
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
}
