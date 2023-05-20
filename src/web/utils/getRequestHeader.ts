/**
 * @file web utils getRequestHeader.ts
 * @description 获取请求头
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// Node
import md5 from "js-md5";
// Tauri.Genshin
import TGConstant from "../constant/TGConstant";
import { transCookie, transParams } from "./tools";

/**
 * @description 获取 salt
 * @since Alpha v0.2.0
 * @version 2.49.1
 * @param {string} saltType salt 类型
 * @returns {string} salt
 */
function getSalt (saltType: string) {
  switch (saltType) {
    case "common":
      return TGConstant.Salt.Other.X4;
    case "prod":
      return TGConstant.Salt.Other.prod;
    default:
      return TGConstant.Salt.Other.X4;
  }
}

/**
 * @description 获取随机数
 * @since Alpha v0.2.0
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机数
 */
function getRandomNumber (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @description 获取 ds
 * @since Alpha v0.2.0
 * @version 2.49.1
 * @param {string} saltType salt 类型
 * @param {string} method 请求方法
 * @param {string} data 请求数据
 * @returns {string} ds
 */
function getDS (method: string, data: string, saltType: string): string {
  const salt = getSalt(saltType);
  const time = Math.floor(Date.now() / 1000).toString();
  const random = getRandomNumber(100000, 200000).toString();
  const body = method === "GET" ? "" : data;
  const query = method === "GET" ? data : "";
  const hashStr = `salt=${salt}&t=${time}&r=${random}&b=${body}&q=${query}`;
  const md5Str = md5.update(hashStr).hex();
  return `${time},${random},${md5Str}`;
}

/**
 * @description 获取请求头
 * @since Alpha v0.2.0
 * @param {Record<string, string>} cookie cookie
 * @param {string} method 请求方法
 * @param {Record<string, string|number>|string} data 请求数据
 * @param {string} saltType salt 类型
 * @returns {Record<string, string>} 请求头
 */
export function getRequestHeader (cookie: Record<string, string>, method: string, data: Record<string, string | number> | string, saltType: string): Record<string, string> {
  let ds;
  if (typeof data === "string") {
    ds = getDS(method, data, saltType);
  } else {
    ds = getDS(method, transParams(data), saltType);
  }
  return {
    "User-Agent": TGConstant.BBS.USER_AGENT,
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    Referer: "https://webstatic.mihoyo.com/",
    DS: ds,
    Cookie: transCookie(cookie),
  };
}
