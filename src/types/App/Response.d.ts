/**
 * 应用请求封装相关类型定义
 * @since Beta v0.10.0
 */

declare namespace TGApp.App.Response {
  /**
   * 请求方法枚举
   * @since Beta v0.10.0
   * @remarks 只定义了用到的部分
   */
  const ReqMethod = <const>{
    /** GET */
    GET: "GET",
    /** POST */
    POST: "POST",
  };

  /**
   * 请求方法枚举类型
   * @since Beta v0.10.0
   */
  type ReqMethodEnum = (typeof ReqMethod)[keyof typeof ReqMethod];

  /**
   * 请求配置
   * @since Beta v0.10.0
   * @remarks 只写了用到的部分
   */
  type ReqConf = {
    /** 请求方法 */
    method?: ReqMethodEnum;
    /** 请求头 */
    headers?: Record<string, string>;
    /** URL 查询参数 */
    query?: Record<string, string | number | boolean>;
    /** 请求体 */
    body?: string | Record<string, unknown>;
    /** 请求超时时间（毫秒） */
    timeout?: number;
    /** AbortSignal 用于取消请求 */
    signal?: AbortSignal;
    /** 基础 URL */
    baseURL?: string;
  };

  /**
   * 请求配置参数
   * @since Beta v0.10.0
   */
  type ReqConfParams = Omit<ReqConf, "baseURL">;

  /**
   * 响应类型
   * @since Beta v0.10.0
   */
  type Resp<T> = {
    /** 响应数据 */
    data: T;
    /** HTTP 状态码 */
    status: number;
    /** 状态文本 */
    statusText: string;
    /** 响应头 */
    headers: Headers;
    /** 原始 Response 对象 */
    raw: Response;
    /** 请求配置 */
    config: ReqConf;
  };

  /**
   * HTTP错误响应
   * @since Beta v0.10.0
   */
  type HttpErr = {
    /** 错误消息 */
    message: string;
    /** HTTP 状态码 */
    status?: number;
    /** 状态文本 */
    statusText?: string;
    /** 响应数据 */
    data?: unknown;
    /** 原始错误 */
    cause?: unknown;
  };

  /**
   * Http错误构建参数
   * @since Beta v0.10.0
   */
  type HttpErrParams = Omit<HttpErr, "message">;
}
