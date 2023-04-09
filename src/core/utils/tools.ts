/**
 * @file core utils tools.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

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
