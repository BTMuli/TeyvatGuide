/**
 * @file web/utils/getRequestHeader.ts
 * @description 获取请求头
 * @since Beta v0.3.9
 */

import Md5 from "js-md5";

import { getDeviceInfo, getRandomString } from "../../utils/toolFunc";
import TGConstant from "../constant/TGConstant";

import { transCookie, transParams } from "./tools";

/**
 * @description 获取 salt
 * @since Beta v0.3.3
 * @version 2.59.1
 * @param {string} saltType salt 类型
 * @returns {string} salt
 */
function getSalt(saltType: string): string {
  switch (saltType) {
    case "common":
      return TGConstant.Salt.X4;
    case "prod":
      return TGConstant.Salt.PROD;
    case "lk2":
      return TGConstant.Salt.LK2;
    default:
      return TGConstant.Salt.X4;
  }
}

/**
 * @description 获取随机数
 * @since Alpha v0.2.0
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机数
 */
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @description 获取 ds
 * @since Beta v0.3.3
 * @version 2.50.1
 * @param {string} method 请求方法
 * @param {string} data 请求数据
 * @param {string} saltType salt 类型
 * @param {boolean} isSign 是否为签名
 * @returns {string} ds
 */
function getDS(method: string, data: string, saltType: string, isSign: boolean): string {
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
 * @description 获取请求头
 * @since Beta v0.3.6
 * @param {Record<string, string>} cookie cookie
 * @param {string} method 请求方法
 * @param {Record<string, string|number>|string} data 请求数据
 * @param {string} saltType salt 类型
 * @param {boolean} isSign 是否为签名
 * @returns {Record<string, string>} 请求头
 */
export function getRequestHeader(
  cookie: Record<string, string>,
  method: string,
  data: Record<string, string | number> | string,
  saltType: string,
  isSign: boolean = false,
): Record<string, string> {
  let ds;
  if (typeof data === "string") {
    ds = getDS(method, data, saltType, isSign);
  } else {
    ds = getDS(method, transParams(data), saltType, isSign);
  }
  return {
    "user-agent": TGConstant.BBS.UA_PC,
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    "x-requested-with": "com.mihoyo.hyperion",
    referer: "https://webstatic.mihoyo.com",
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    ds,
    cookie: transCookie(cookie),
  };
}

/**
 * @description 获取 DS
 * @since Beta v0.3.9
 * @param {string} saltType salt 类型
 * @param {number} dsType ds 类型
 * @param {Record<string, string|number>|string} body
 * @param {Record<string, string|number>|string} query
 * @returns {string} DS
 */
export function getDS4JS(saltType: string, dsType: 1, body: undefined, query: undefined): string;
export function getDS4JS(
  saltType: string,
  dsType: 2,
  body: Record<string, string | number> | string,
  query: Record<string, string | number> | string,
): string;
export function getDS4JS(
  saltType: string,
  dsType: 1 | 2,
  body?: Record<string, string | number> | string,
  query?: Record<string, string | number> | string,
): string {
  const salt = getSalt(saltType);
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
