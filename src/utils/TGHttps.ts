/**
 * 应用请求客户端封装
 * @since Beta v0.10.0
 */

import { type ClientOptions, fetch } from "@tauri-apps/plugin-http";
import JSONBig from "json-bigint";

import TGLogger from "./TGLogger.js";

/**
 * 构建 URL 查询字符串
 * @since Beta v0.10.0
 * @param params - 查询参数
 * @returns 查询字符串
 */
function buildQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, String(value));
  }
  return searchParams.toString();
}

/**
 * 创建 HTTP 错误对象
 * @since Beta v0.10.0
 * @param message - 错误消息
 * @param options - 错误选项
 * @returns HTTP 错误对象
 */
function createHttpError(
  message: string,
  options: TGApp.App.Response.HttpErrParams,
): TGApp.App.Response.HttpErr {
  return {
    message,
    status: options.status,
    statusText: options.statusText,
    data: options.data,
    cause: options.cause,
  };
}

/**
 * 解析响应数据
 * @since Beta v0.10.0
 * @param response - 原始响应
 * @param config - 请求配置
 * @returns 解析后的数据
 */
async function parseResponse<T>(
  response: Response,
  config: TGApp.App.Response.ReqConf,
): Promise<T> {
  if (config.isBlob) {
    return <T>await response.arrayBuffer();
  }
  if (config.hasBigInt) {
    return <T>JSONBig.parse(await response.text());
  }
  return <T>await response.json();
}

/**
 * 执行 HTTP 请求
 * @since Beta v0.10.0
 * @param method - 请求方法
 * @param url - 请求地址
 * @param config - 请求配置
 * @returns 响应对象
 */
async function request<T>(
  method: TGApp.App.Response.ReqMethodEnum,
  url: string,
  config: TGApp.App.Response.ReqConf = {},
): Promise<TGApp.App.Response.Resp<T>> {
  const timeout = config.timeout ?? 30000;

  // 构建完整 URL
  let finalUrl = url;
  if (config.query) {
    const queryString = buildQueryString(config.query);
    if (queryString) {
      finalUrl += `?${queryString}`;
    }
  }

  // 构建请求头
  const httpHeaders = new Headers();
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      httpHeaders.append(key, value);
    }
  }

  // 构建请求选项
  const fetchOptions: RequestInit & ClientOptions = {
    method,
    headers: httpHeaders,
  };

  // 添加请求体
  if (config.body !== undefined) {
    fetchOptions.body = typeof config.body === "string" ? config.body : JSON.stringify(config.body);
  }

  // 调试日志
  if (config.isBlob) {
    console.debug(`[TGHttps] Fetch Blob: ${finalUrl}`);
  } else {
    console.debug(`[TGHttps] ${method} ${finalUrl}`);
  }

  // 创建超时控制器
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // 合并 AbortSignal
  let combinedSignal: AbortSignal;
  if (config.signal) {
    combinedSignal = AbortSignal.any([config.signal, timeoutController.signal]);
  } else {
    combinedSignal = timeoutController.signal;
  }
  fetchOptions.signal = combinedSignal;

  try {
    const rawResponse = await fetch(finalUrl, fetchOptions);

    // 清除超时定时器
    clearTimeout(timeoutId);

    // 检查 HTTP 状态
    if (!rawResponse.ok) {
      const errorText = await rawResponse.text().catch(() => "Unknown error");
      throw createHttpError(`HTTP Error: ${rawResponse.status} ${rawResponse.statusText}`, {
        status: rawResponse.status,
        statusText: rawResponse.statusText,
        data: errorText,
      });
    }

    // 解析响应
    const data = await parseResponse<T>(rawResponse, config);

    return {
      data: data,
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: rawResponse.headers,
      raw: rawResponse,
      config: config,
    };
  } catch (error) {
    // 清除超时定时器
    clearTimeout(timeoutId);

    let httpError: TGApp.App.Response.HttpErr;

    if (typeof error === "object" && error !== null && "message" in error) {
      httpError = <TGApp.App.Response.HttpErr>error;
    } else if (error instanceof Error) {
      httpError = createHttpError(error.message, { cause: error });
    } else {
      httpError = createHttpError(String(error), { cause: error });
    }

    // 记录错误日志
    await TGLogger.Error(`[TGHttps] Request failed: ${httpError.message}`);

    throw httpError;
  }
}

const TGHttps = {
  /**
   * GET 请求
   * @since Beta v0.10.0
   * @param url - 请求地址
   * @param config - 请求配置
   * @returns 响应对象
   */
  get: <T>(
    url: string,
    config?: TGApp.App.Response.ReqConfParams,
  ): Promise<TGApp.App.Response.Resp<T>> => request<T>("GET", url, config),

  /**
   * POST 请求
   * @since Beta v0.10.0
   * @param url - 请求地址
   * @param config - 请求配置
   * @returns 响应对象
   */
  post: <T>(
    url: string,
    config?: TGApp.App.Response.ReqConfParams,
  ): Promise<TGApp.App.Response.Resp<T>> => request<T>("POST", url, config),

  /**
   * 通用请求方法
   * @since Beta v0.10.0
   * @param method - 请求方法
   * @param url - 请求地址
   * @param config - 请求配置
   * @returns 响应对象
   */
  request: <T>(
    method: TGApp.App.Response.ReqMethodEnum,
    url: string,
    config?: TGApp.App.Response.ReqConfParams,
  ): Promise<TGApp.App.Response.Resp<T>> => request<T>(method, url, config),
};

export default TGHttps;
