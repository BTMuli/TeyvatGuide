/**
 * Bili 插件基础类型定义文件
 * @since Beta v0.4.0
 */

declare namespace TGApp.Plugins.Bili.Base {
  /**
   * Bili Response 统一接口
   * @since Beta v0.4.0
   */
  type Resp<T = unknown> = {
    /** 状态码 */
    code: number;
    /** 状态信息 */
    message: string;
    /** TTL */
    ttl: number;
    /** 数据 */
    data: T;
  };

  /**
   * Wrid返回
   * @since Beta v0.10.0
   */
  type WridArrRes = Array<string> & { length: 2 };
}
