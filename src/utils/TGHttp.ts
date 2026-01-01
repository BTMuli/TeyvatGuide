/**
 * 封装HTTP请求
 * @since Beta v0.9.1
 */

import { fetch } from "@tauri-apps/plugin-http";

import TGLogger from "./TGLogger.js";

/**
 * 请求参数
 * @since Beta v0.5.1
 */
type TGHttpParams = {
  /** 请求方法 */
  method: "GET" | "POST";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数 */
  query?: Record<string, any>;
  /** 请求体 */
  body?: string;
  /** 是否是Blob */
  isBlob?: boolean;
};

/**
 * 发送请求
 * @since Beta v0.9.1
 * @typeParam T - 返回数据类型
 * @param url - 请求地址
 * @param options - 请求参数
 * @returns 请求结果
 */
async function TGHttp<T>(url: string, options: TGHttpParams): Promise<T>;
async function TGHttp<T>(
  url: string,
  options: TGHttpParams,
  fullResponse: true,
): Promise<{ data: Promise<T>; resp: Response }>;
async function TGHttp<T>(
  url: string,
  options: TGHttpParams,
  fullResponse?: true,
): Promise<T | { data: Promise<T>; resp: Response }> {
  const httpHeaders = new Headers();
  if (options.headers) {
    for (const key in options.headers) httpHeaders.append(key, options.headers[key]);
  }
  const fetchOptions: RequestInit = { method: options.method, headers: httpHeaders };
  if (options.body) fetchOptions.body = options.body;
  if (options.query) {
    const query = new URLSearchParams(options.query).toString();
    url += `?${query}`;
  }
  if (options.isBlob) {
    await TGLogger.Debug(`Fetch Image: ${url}`);
  } else {
    await TGLogger.Debug(`Fetch URL: ${url}`);
    await TGLogger.Debug(`Fetch Options: ${JSON.stringify(options)}`);
  }
  return await fetch(url, fetchOptions)
    .then((res) => {
      if (res.ok) {
        const data = options.isBlob ? res.arrayBuffer() : res.json();
        if (fullResponse) return { data, resp: res };
        return data;
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    })
    .catch(async (err) => {
      await TGLogger.Error(`Request ${url} error`);
      if (err instanceof Error || typeof err === "object") {
        await TGLogger.Error(`Error: ${JSON.stringify(err)}`);
      } else {
        await TGLogger.Error(`Error: ${err}`);
      }
      return err;
    });
}

export default TGHttp;
