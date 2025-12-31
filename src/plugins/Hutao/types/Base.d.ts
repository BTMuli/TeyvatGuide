/**
 * Hutao 插件基础类型定义文件
 * @since Beta v0.6.2
 */

declare namespace TGApp.Plugins.Hutao.Base {
  /**
   * 统一接口
   * @since Beta v0.9.1
   */
  type Resp<T = never> = {
    /** 状态码 */
    retcode: number;
    /** 状态信息 */
    message: string;
    /** 数据 */
    data?: T;
  };

  /**
   * 使用率
   * @since Beta v0.6.2
   */
  type Rate<T = number> = {
    /** 项 ID */
    Item: T;
    /** 使用率 */
    Rate: number;
  };
}
