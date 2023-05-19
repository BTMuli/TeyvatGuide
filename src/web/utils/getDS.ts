/**
 * @file web utils getDS.ts
 * @description ds 算法
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// Node
import md5 from "js-md5";
import qs from "qs";
// Tauri.Genshin
import { random } from "./tools";
import TGConstant from "../constant/TGConstant";

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
 * @description 获取 ds
 * @since Alpha v0.2.0
 * @version 2.49.1
 * @param {string} saltType salt 类型
 * @param {string} method 请求方法
 * @param {string} data 请求数据
 * @returns {string} ds
 */
export function getDS (method: string, data: string, saltType: string): string {
  const salt = getSalt(saltType);
  const params = {
    salt,
    t: Math.floor(Date.now() / 1000).toString(),
    r: random(100000, 200000).toString(),
    b: method === "GET" ? "" : data,
    q: method === "GET" ? data : "",
  };
  const md5Str = md5.update(qs.stringify(params)).hex();
  return `${params.t},${params.r},${md5Str}`;
}
