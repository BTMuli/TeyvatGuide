/**
 * @file plugins Mys types Base.d.ts
 * @description Mys 插件基础类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 插件基础类型
 * @since Alpha v0.2.1
 * @namespace Base
 * @exports TGApp.plugins.Mys.Base
 * @return Base
 */
declare namespace TGApp.Plugins.Mys.Base {
  /**
   * @description Mys Response 统一接口
   * @since Alpha v0.2.1
   * @interface Response
   * @property {number} retcode 状态码
   * @property {string} message 状态信息
   * @property {any} data 数据
   * @return Response
   */
  export interface Response {
    retcode: number;
    message: string;
    data: any;
  }
}
