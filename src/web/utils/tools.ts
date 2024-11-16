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
 * @description 根据 gid 获取游戏名称
 * @param {number} gid
 * @returns {string}
 */
export function getGameName(gid: number): string {
  const game = TGConstant.BBS.CHANNELS.find((item) => item.gid === gid.toString());
  return game ? game.title : "未知游戏";
}
