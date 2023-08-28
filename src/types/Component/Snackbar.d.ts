/**
 * @file types Component Snackbar.d.ts
 * @description Component Snackbar 类型声明文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

declare namespace TGApp.Component.Snackbar {
  /**
   * @description Snackbar 参数
   * @interface Params
   * @since Alpha v0.2.3
   * @property {string} text 文本
   * @property {string} color 颜色
   * @property {number} timeout 超时时间
   * @property {boolean} show 是否显示
   * @return Params
   */
  export interface Params {
    text: string;
    color?: string;
    timeout?: number;
  }
}
