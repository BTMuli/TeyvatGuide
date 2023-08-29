/**
 * @file types Component Confirm.d.ts
 * @description Component Confirm 类型声明文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

declare namespace TGApp.Component.Confirm {
  /**
   * @description Confirm 参数
   * @interface Params
   * @since Alpha v0.2.3
   * @property {string} title 标题
   * @property {string} text 文本
   * @property {string} mode 模式 // normal: 正常（默认）,input: 输入框
   * @property {boolean} otcancel 点击外部取消 // true: 取消（默认）,false: 不取消
   * @property {function} onConfirm 确认回调
   * @property {function} onCancel 取消回调
   * @property {function} onInput 输入回调
   * @return Params
   */
  export interface Params {
    title: string;
    text?: string;
    mode?: "confirm" | "input";
    otcancel?: boolean;
    onConfirm?: (value?: string | boolean) => void;
    onCancel?: () => void;
  }
}
