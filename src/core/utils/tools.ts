/**
 * @file core utils tools.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import md5 from "js-md5";

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
 * @description md5 加密
 * @since Alpha v0.2.0
 * @param {string} data 要加密的内容
 * @returns {string} 加密后的内容
 */
export function MD5 (data: string): string {
  return md5.update(data).hex();
}
