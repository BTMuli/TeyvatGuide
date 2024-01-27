/**
 * @file types/Component/Loading.d.ts
 * @description Component Loading 类型声明文件
 * @since Beta v0.4.2
 */

/**
 * @description Loading 命名空间
 * @namespace TGApp.Component.Loading
 * @since Beta v0.4.2
 * @memberof TGApp.Component
 */
declare namespace TGApp.Component.Loading {
  /**
   * @description Loading 参数-用于Emits
   * @since Beta v0.4.2
   * @interface EmitParams
   * @property {boolean} show 显示
   * @property {string} title 标题
   * @property {string} text 副标题
   * @return EmitParams
   */
  interface EmitParams {
    show: boolean;
    title?: string;
    text?: string;
  }
}
