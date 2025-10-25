/**
 * BBS 返回数据类型定义文件
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Response {
  /**
   * 基础返回响应
   * @since Beta v0.3.9
   */
  type Base = {
    /**
     * 响应代码
     * @remarks
     * 为0表示请求成功，非0表示请求失败
     * 请求失败时，data 恒为 null
     */
    retcode: number;
    /** 响应消息 */
    message: string;
    /** 响应数据 */
    data: never;
  };

  /**
   * 成功返回响应
   * @since Beta v0.7.1
   * @remarks 仅用于表示请求成功数据，retcode 恒为 0
   */
  type BaseWithData<T = unknown> = {
    /** 响应代码 */
    retcode: 0;
    /** 响应消息 */
    message: string;
    /** 响应数据 */
    data: T;
  };
}
