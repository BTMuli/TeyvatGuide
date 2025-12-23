/**
 * 颜色相关处理
 * @since Beta v0.9.0
 */
import { score } from "wcag-color";

/**
 * 根据传入星级获取对应颜色
 * @since Beta v0.9.0
 * @param star - 星级
 * @returns 颜色变量字符串
 */
export function getOdStarColor(star: number): string {
  switch (star) {
    case 5:
      return "var(--tgc-od-orange)";
    case 4:
      return "var(--tgc-od-purple)";
    case 3:
      return "var(--tgc-od-blue)";
    case 2:
      return "var(--tgc-od-green)";
    case 1:
      return "var(--tgc-od-white)";
    default:
      return "var(--tgc-od-red)";
  }
}

/**
 * 判断颜色是否相似
 * @since Beta v0.9.0
 * @param colorBg - 背景颜色
 * @param colorText - 文本颜色
 * @returns 是否相似
 */
export function isColorSimilar(colorBg: string, colorText: string): boolean {
  return score(colorText, colorBg) === "Fail";
}

/**
 * 根据字符串生成颜色
 * @since Beta v0.8.2
 * @param str - 输入字符串
 * @param adjust - 亮度调整值，正数变亮，负数变暗
 * @returns 生成的颜色 rgb(r, g, b)
 */
export function str2Color(str: string, adjust: number): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let r = (hash >> 16) & 0xff;
  let g = (hash >> 8) & 0xff;
  let b = hash & 0xff;
  r = Math.min(Math.max(r + adjust, 0), 255);
  g = Math.min(Math.max(g + adjust, 0), 255);
  b = Math.min(Math.max(b + adjust, 0), 255);
  return `rgb(${r}, ${g}, ${b})`;
}
