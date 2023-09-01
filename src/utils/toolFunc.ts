/**
 * @file utils toolFunc.ts
 * @description 一些工具函数
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

/**
 * @description 时间戳转换为时间字符串
 * @returns {string} 时间字符串 d天 hh:mm:ss
 * @param time
 */
export function stamp2LastTime(time: number): string {
  const day = Math.floor(time / (24 * 3600 * 1000));
  const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
  const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
  const second = Math.floor((time % (60 * 1000)) / 1000);
  return `${day === 0 ? "" : `${day}天`} ${hour.toFixed(0).padStart(2, "0")}:${minute
    .toFixed(0)
    .padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}
