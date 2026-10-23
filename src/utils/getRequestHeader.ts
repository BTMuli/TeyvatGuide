/**
 * 获取请求头
 * @since Beta v0.13.0
 */

import bbsEnum from "@enum/bbs.js";
import Md5 from "js-md5";

import TGBbs from "./TGBbs.js";
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
 * 获取 salt
 * @since Beta v0.13.0
 * @param salt - salt 类型或自定义 salt
 * @returns salt 值
 */
function getSalt(salt: TGApp.BBS.Auth.SaltKeyEnum | string): string {
  if (Object.hasOwn(TGBbs.salt, salt)) return TGBbs.salt[<TGApp.BBS.Auth.SaltKeyEnum>salt];
  return salt;
}

/**
 * 获取 ds
 * @since Beta v0.13.0
 * @param method - 请求方法
 * @param data - 请求数据
 * @param saltType - salt 类型或自定义 salt
 * @param isSign - 是否为签名
 * @returns ds
 */
function getDS(
  method: string,
  data: string,
  saltType: TGApp.BBS.Auth.SaltKeyEnum | string,
  isSign: boolean,
): string {
  const salt = getSalt(saltType);
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
  saltType: TGApp.BBS.Auth.SaltKeyEnum = bbsEnum.saltKey.X4,
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
 * 获取合集接口请求头
 * @since Beta v0.13.0
 * @param cookie - cookie
 * @param method - 请求方法
 * @param data - 请求数据
 * @returns 请求头
 * @remarks 合集相关接口只接受网页端签名，使用 App 端 salt 会返回 -10001
 */
export function getCollectionRequestHeader(
  cookie: Record<string, string>,
  method: string,
  data: Record<string, string | number | boolean | Array<string>> | string,
): Record<string, string> {
  return {
    "user-agent": TGBbs.uap,
    "x-rpc-app_version": TGBbs.co.ver,
    "x-rpc-client_type": "4",
    referer: "https://www.miyoushe.com",
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    DS: getDS(method, transParams(data), TGBbs.co.salt, true),
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
export function getDS4JS(
  saltType: TGApp.BBS.Auth.SaltKeyEnum,
  dsType: 1,
  body?: never,
  query?: never,
): string;
export function getDS4JS(
  saltType: TGApp.BBS.Auth.SaltKeyEnum,
  dsType: 2,
  body?: Record<string, string | number> | string,
  query?: Record<string, string | number> | string,
): string;
export function getDS4JS(
  saltType: TGApp.BBS.Auth.SaltKeyEnum,
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
