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
 * @param {string} query query
 * @param {string} body body
 * @returns {Record<string, string>} 请求头
 */
export function getRequestHeader (cookie: string, query: string, body: string = ""): Record<string, string> {
  const header = {
    "User-Agent": TGConstant.BBS.USER_AGENT,
    // "x-requested-with": "com.mihoyo.hyperion",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    Referer: "https://webstatic.mihoyo.com/",
    DS: getDS(query, body),
    cookie,
  };
  return header;
}
