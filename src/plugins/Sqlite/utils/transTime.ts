/**
 * @file plugins Sqlite utils transTime.ts
 * @description Sqlite 时间转换工具类
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

/**
 * @description 将时间戳转换为时间字符串
 * @since Alpha v0.2.0
 * @param {string} timestamp 时间戳 (秒)
 * @returns {string} 时间字符串，格式为 YYYY-MM-DD HH:mm:ss
 */
export function timeToSecond (timestamp: string): string {
  const date = new Date(Number(timestamp) * 1000);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
