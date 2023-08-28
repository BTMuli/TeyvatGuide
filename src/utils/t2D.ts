/**
 * @file utils t2D.ts
 * @description time to date 时间戳转换为日期工具类
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

/**
 * @description 时间戳转换为日期
 * @since Alpha v0.2.3
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 日期 2021-01-01 00:00:00
 */
export function timestampToDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
