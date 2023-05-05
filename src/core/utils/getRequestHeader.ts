/**
 * @file core utils getRequestHeader.ts
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
 * @param {string} q query
 * @param {string} b body
 * @returns {Record<string, string>} 请求头
 */
export function getRequestHeader (cookie: string, q: string, b: string = ""): Record<string, string> {
  const header = {
    "User-Agent": TGConstant.BBS.USER_AGENT,
    // "x-requested-with": "com.mihoyo.hyperion",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    Origin: "https://webstatic.mihoyo.com/",
    Referer: "https://webstatic.mihoyo.com/",
    DS: getDS(q, b),
    Cookie: cookie,
  };
  return header;
}
