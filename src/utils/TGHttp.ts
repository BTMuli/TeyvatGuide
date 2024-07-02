/**
 * @file utils/TGHttp.ts
 * @description 封装HTTP请求
 * @since Beta v0.5.0
 */

import { fetch } from "@tauri-apps/plugin-http";

/**
 * @description 请求参数
 * @since Beta v0.5.0
 * @property {"GET"|"POST"} method 请求方法
 * @property {Record<string,string>} headers 请求头
 * @property {Record<string,string>} query 请求参数
 * @property {string} body 请求体
 * @return TGHttpParams
 */
type TGHttpParams = {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: string;
};

/**
 * @description 发送请求
 * @since Beta v0.5.0
 * @template T
 * @param {string} url 请求地址
 * @param {TGHttpParams} options 请求参数
 * @returns {Promise<T>}
 */
async function TGHttp<T>(url: string, options: TGHttpParams): Promise<T> {
  let httpHeaders = new Headers();
  if (options.headers) {
    httpHeaders = new Headers(options.headers);
  }
  const fetchOptions: RequestInit = {
    method: options.method,
    headers: httpHeaders,
  };
  if (options.query) {
    const query = new URLSearchParams(options.query).toString();
    url += `?${query}`;
  }
  if (options.body) {
    fetchOptions.body = options.body;
  }
  return await fetch(url, fetchOptions)
    .then((res) => {
      if (res.ok) {
        return res.json();
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    })
    .catch((err) => {
      console.error("HTTP error: ", err);
      return err;
    });
}

export default TGHttp;
