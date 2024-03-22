/**
 * @file types Component Confirm.d.ts
 * @description Component Confirm 类型声明文件
 * @since Beta v0.3.4
 */

declare namespace TGApp.Component.Confirm {
  /**
   * @description Confirm 参数
   * @interface ParamsBase
   * @since Beta v0.3.3
   * @property {string} title 标题
   * @property {string} text 文本
   * @property {string} mode 模式 // normal: 正常（默认）,input: 输入框
   * @property {boolean} otcancel 点击外部取消 // true: 取消（默认）,false: 不取消
   * @return ParamsBase
   */
  interface ParamsBase {
    title: string;
    text?: string;
    mode?: "confirm" | "input";
    otcancel?: boolean;
  }

  /**
   * @description Confirm 参数- confirm mode
   * @interface ParamsConfirm
   * @since Beta v0.3.3
   * @extends ParamsBase
   * @property {"confirm"|undefined} mode
   * @return ParamsConfirm
   */
  interface ParamsConfirm extends ParamsBase {
    mode?: "confirm";
  }

  /**
   * @description Confirm 参数 - input mode
   * @interface ParamsInput
   * @since Beta v0.4.5
   * @extends ParamsBase
   * @property {"input"} mode
   * @property {string} input 可选的配置默认输入值
   * @return ParamsInput
   */
  interface ParamsInput extends ParamsBase {
    mode: "input";
    input?: string;
  }

  /**
   * @description Confirm 参数
   * @since Beta v0.3.3
   * @type Params
   * @return Params
   */
  type Params = ParamsConfirm | ParamsInput;
}
