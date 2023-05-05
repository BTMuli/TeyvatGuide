/**
 * @description ds 算法
 * @since Alpha v0.2.0
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { MD5, random, qs } from "./tools";
import TGConstant from "../constant/TGConstant";

/**
 * @description 获取 ds
 * @since Alpha v0.2.0
 * @version 2.34.1
 * @param {string} query 查询字符串
 * @param {string} body 请求体
 * @returns {string} ds
 */
export function getDS (query: string, body: string = ""): string {
  console.log("ds.query", query);
  console.log("ds.body", body);
  const params = {
    salt: TGConstant.SALT.Other.X4,
    t: Math.floor(Date.now() / 1000).toString(),
    r: random(100000, 200000).toString(),
    b: body,
    q: query,
  };
  const paramStr = qs(params);
  const md5Str = MD5(paramStr);
  const ds = `${params.t},${params.r},${md5Str}`;
  return ds;
}
