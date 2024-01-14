/**
 * @file plugins/Bili/types/Base.d.ts
 * @description Bili 插件基础类型定义文件
 * @since Beta v0.4.0
 */

/**
 * @description Bili 插件基础类型
 * @since Beta v0.4.0
 * @namespace Base
 * @memberof TGApp.Plugins.Bili
 */
declare namespace TGApp.Plugins.Bili.Base {
  /**
   * @description Bili Response 统一接口
   * @since Beta v0.4.0
   * @interface Response
   * @property {number} code 状态码
   * @property {string} message 状态信息
   * @property {number} ttl ttl
   * @property {any} data 数据
   * @return Response
   */
  interface Response {
    code: number;
    message: string;
    ttl: number;
    data: any;
  }
}
