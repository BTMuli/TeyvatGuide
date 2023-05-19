/**
 * @file web utils getRequestHeader.ts
 * @description 获取请求头
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import TGConstant from "../constant/TGConstant";
import { getDS } from "./getDS";

/**
 * @description 获取请求头
 * @since Alpha v0.2.0
 * @param {string} cookie cookie
 * @param {string} method 请求方法
 * @param {string} data 请求数据
 * @param {string} saltType salt 类型
 * @returns {Record<string, string>} 请求头
 */
export function getRequestHeader (cookie: string, method: string, data: string, saltType: string): Record<string, string> {
  return {
    "User-Agent": TGConstant.BBS.USER_AGENT,
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    Referer: "https://webstatic.mihoyo.com/",
    DS: getDS(method, data, saltType),
    Cookie: cookie,
  };
}
