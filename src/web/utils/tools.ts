/**
 * @file web/utils/tools.ts
 * @description 应用用到的工具函数
 * @since Beta v0.6.3
 */

import TGConstant from "../constant/TGConstant.js";

/**
 * @description 转义正则表达式
 * @since Beta v0.3.3
 * @param {string} data 内容
 * @returns {string} 转义后的内容
 */
export function decodeRegExp(data: string): string {
  let res = data;
  if (res.length === 0) return res;
  res = res.replace(/&lt;/g, "<");
  res = res.replace(/&gt;/g, ">");
  res = res.replace(/&nbsp;/g, " ");
  res = res.replace(/&#39;/g, "'");

  res = res.replace(/&quot;/g, `"`);
  res = res.replace(/&apos;/g, "'");
  res = res.replace(/&amp;/g, "&");
  return res;
}

/**
 * @description 将 cookie 对象转换为字符串
 * @since Alpha v0.1.5
 * @param {Record<string, string>} cookie cookie
 * @returns {string} 转换后的 cookie
 */
export function transCookie(cookie: Record<string, string>): string {
  let res = "";
  for (const key of Object.keys(cookie).sort()) {
    res += `${key}=${cookie[key]};`;
  }
  return res;
}

/**
 * @description ds 算法需要数据转换后的字符串是按照字典序排序的
 * @since Beta v0.6.3
 * @param {Record<string, string|number>} obj object
 * @returns {string} query string
 */
export function transParams(obj: Record<string, string | number | string[] | boolean>): string {
  let res = "";
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    res += `${key}=${obj[key].toString()}&`;
  }
  return res.slice(0, -1);
}

/**
 * @description 根据 uid 获取 server
 * @since Beta v0.4.3
 * @todo instead of account.region
 * @deprecated
 * @param {string} uid uid
 * @returns {string} server
 */
export function getServerByUid(uid: string): string {
  // 若长度为 10，则为国际服亚服
  if (uid.length === 10) return TGConstant.Server.OS_ASIA;
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
