/**
 * @file web utils tools.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// Node
import { stringify } from "qs";
// TauriGenshin
import TGConstant from "../constant/TGConstant";

/**
 * @description 转义正则表达式
 * @since Alpha v0.1.2
 * @param {string} data 内容
 * @returns {string} 转义后的内容
 */
export function decodeRegExp (data: string): string {
  let res = data;
  if (res.length === 0) return res;
  res = res.replace(/&lt;/g, "<");
  res = res.replace(/&gt;/g, ">");
  res = res.replace(/&nbsp;/g, " ");
  res = res.replace(/&#39;/g, "'");
  res = res.replace(/&quot;/g, "\"");
  res = res.replace(/&apos;/g, "'");
  res = res.replace(/&amp;/g, "&");
  return res;
}

/**
 * @description 获取随机字符串
 * @since Alpha v0.2.0
 * @param {number} length 字符串长度
 * @returns {string} 随机字符串
 */
export function getRandomString (length: number): string {
  const str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += str[Math.floor(Math.random() * str.length)];
  }
  return res;
}

/**
 * @description 获取随机数
 * @since Alpha v0.2.0
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机数
 */
export function random (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @description object 转换为 query string
 * @since Alpha v0.2.0
 * @param {Record<string, string>} obj object
 * @param {boolean} encode 是否编码
 * @returns {string} query string
 */
export function qs (obj: Record<string, string>, encode: boolean = false): string {
  let res = "";
  for (const [k, v] of Object.entries(obj)) res += `${k}=${encode ? encodeURIComponent(v) : v}&`;
  res = res.slice(0, res.length - 1);
  return res;
}

/**
 * @description 将 ck JSON 对象转换为字符串
 * @since Alpha v0.2.0
 * @param {object} ck ck JSON 对象
 * @returns {string} ck 字符串
 */
export function cookieToString (ck: object): string {
  let res = stringify(ck);
  res = res.replace(/&/g, ";");
  return res;
}

/**
 * @description 根据 uid 获取 server
 * @since Alpha v0.2.0
 * @param {string} uid uid
 * @returns {string} server
 */
export function getServerByUid (uid: string): string {
  // 获取第一个字符
  const first = uid[0];
  // 1-4 为国服-天空岛
  if (first >= "1" && first <= "4") return TGConstant.Server.CN_ISLAND;
  // 5 为国服-世界树
  if (first === "5") return TGConstant.Server.CN_TREE;
  // 6 为美服
  if (first === "6") return TGConstant.Server.OS_USA;
  // 7 为欧服
  if (first === "7") return TGConstant.Server.OS_EURO;
  // 8 为亚服
  if (first === "8") return TGConstant.Server.OS_ASIA;
  // 9 为台服
  if (first === "9") return TGConstant.Server.OS_CHT;
  // 其他情况返回未知
  return TGConstant.Server.UNKNOWN;
}
