/**
 * @file web utils getRequestHeader.ts
 * @description 获取请求头
 * @since Beta v0.3.3
 */

import Md5 from "js-md5";
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
 * @description 获取随机字符串
 * @since Alpha v0.2.0
 * @param {number} length 字符串长度
 * @returns {string} 随机字符串
 */
export function getRandomString(length: number): string {
  const str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += str.charAt(Math.floor(Math.random() * str.length));
  }
  return res;
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
 * @since Beta v0.3.0
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
    "user-agent": TGConstant.BBS.USER_AGENT,
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    "x-requested-with": "com.mihoyo.hyperion",
    referer: "https://webstatic.mihoyo.com",
    ds,
    cookie: transCookie(cookie),
  };
}
