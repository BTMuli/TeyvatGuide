/**
 * 获取请求头
 * @since Beta v0.7.6
 */

import Md5 from "js-md5";

import TGBbs, { type SaltKey } from "./TGBbs.js";
import { getDeviceInfo, getRandomString } from "./toolFunc.js";

/**
 * 获取随机数
 * @since Alpha v0.2.0
 * @param min - 最小值
 * @param max - 最大值
 * @returns 随机数
 */
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 获取 ds
 * @since Beta v0.7.3
 * @param method - 请求方法
 * @param data - 请求数据
 * @param saltType - salt 类型
 * @param isSign - 是否为签名
 * @returns ds
 */
function getDS(method: string, data: string, saltType: SaltKey, isSign: boolean): string {
  const salt = TGBbs.salt[saltType];
  const time = Math.floor(Date.now() / 1000).toString();
  let random = getRandomNumber(100000, 200000).toString();
  if (isSign) random = getRandomString(6);
  const body = method === "GET" ? "" : data;
  const query = method === "GET" ? data : "";
  let hashStr = `salt=${salt}&t=${time}&r=${random}&b=${body}&q=${query}`;
  if (isSign) hashStr = `salt=${salt}&t=${time}&r=${random}`;
  const md5Str = Md5.md5.update(hashStr).hex();
  return `${time},${random},${md5Str}`;
}

/**
 * ds 算法需要数据转换后的字符串是按照字典序排序的
 * @since Beta v0.6.5
 * @param obj - object
 * @returns query string
 */
function transParams(
  obj: Record<string, string | number | boolean | Array<string>> | string,
): string {
  if (typeof obj === "string") return obj;
  let res = "";
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    res += `${key}=${obj[key].toString()}&`;
  }
  return res.slice(0, -1);
}

/**
 * 将 cookie 对象转换为字符串
 * @since Alpha v0.1.5
 * @param cookie - cookie
 * @returns 转换后的 cookie
 */
function transCookie(cookie: Record<string, string>): string {
  let res = "";
  for (const key of Object.keys(cookie).sort()) {
    res += `${key}=${cookie[key]};`;
  }
  return res;
}

/**
 * 获取请求头
 * @since Beta v0.7.3
 * @param cookie - cookie
 * @param method - 请求方法
 * @param data - 请求数据
 * @param saltType - salt 类型
 * @param isSign - 是否为签名
 * @returns 请求头
 */
export function getRequestHeader(
  cookie: Record<string, string>,
  method: string,
  data: Record<string, string | number | boolean | Array<string>> | string,
  saltType: SaltKey = "X4",
  isSign: boolean = false,
): Record<string, string> {
  return {
    "user-agent": TGBbs.uap,
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-client_type": "5",
    "x-requested-with": "com.mihoyo.hyperion",
    referer: "https://webstatic.mihoyo.com",
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    ds: getDS(method, transParams(data), saltType, isSign),
    cookie: transCookie(cookie),
  };
}

/**
 * 获取 DS
 * @since Beta v0.7.3
 * @param saltType -  salt 类型
 * @param dsType - ds 类型
 * @param body - body
 * @param query - query
 * @returns DS
 */
export function getDS4JS(saltType: SaltKey, dsType: 1, body?: never, query?: never): string;
export function getDS4JS(
  saltType: SaltKey,
  dsType: 2,
  body?: Record<string, string | number> | string,
  query?: Record<string, string | number> | string,
): string;
export function getDS4JS(
  saltType: SaltKey,
  dsType: 1 | 2,
  body?: Record<string, string | number> | string,
  query?: Record<string, string | number> | string,
): string {
  const salt = TGBbs.salt[saltType];
  const time = Math.floor(Date.now() / 1000).toString();
  let random = getRandomNumber(100000, 200000).toString();
  let hashStr: string;
  if (dsType === 1) {
    random = getRandomString(6);
    hashStr = `salt=${salt}&t=${time}&r=${random}`;
  } else {
    body = body ?? "";
    query = query ?? "";
    const bodyStr = typeof body === "string" ? body : transParams(body);
    const queryStr = typeof query === "string" ? query : transParams(query);
    hashStr = `salt=${salt}&t=${time}&r=${random}&b=${bodyStr}&q=${queryStr}`;
  }
  const md5Str = Md5.md5.update(hashStr).hex();
  return `${time},${random},${md5Str}`;
}
