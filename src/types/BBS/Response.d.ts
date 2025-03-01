/**
 * @file types/BBS/Response.d.ts
 * @description BBS 返回数据类型定义文件
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Response {
  /**
   * @description 基础返回类型，设计米游社接口请求都是这个类型
   * @interface Base
   * @since Beta v0.3.9
   * @property {never} retcode - 响应代码
   * @property {string} message - 响应消息
   * @property {never} data - 响应数据
   * @return Base
   */
  type Base = { retcode: number; message: string; data: never };

  /**
   * @description 基础返回类型-带有 data 的
   * @interface BaseWithData
   * @since Beta v0.7.1
   * @property {0} retcode - 响应代码
   * @property {string} message - 响应消息
   * @property {any} data - 响应数据
   * @return BaseWithData
   */
  type BaseWithData<T = unknown> = { retcode: 0; message: string; data: T };
}
