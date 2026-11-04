/**
 * 颜色相关处理
 * @since Beta v0.13.0
 */
import { colord } from "colord";
import { score } from "wcag-color";

/**
 * 根据传入星级获取对应颜色
 * @since Beta v0.11.3
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
    case 0:
      return "var(--tgc-od-white)";
    default:
      return "var(--tgc-od-red)";
  }
}

/**
 * 判断颜色是否相似
 * @since Beta v0.9.1
 * @param colorBg - 背景颜色
 * @param colorText - 文本颜色
 * @returns 是否相似
 */
export function isColorSimilar(colorBg: string, colorText: string): boolean {
  let res = true;
  try {
    res = score(colord(colorBg).toHex(), colord(colorText).toHex()) === "Fail";
  } catch (e) {
    console.error("isColorSimilar", e);
  }
  return res;
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

/**
 * HSV 颜色分量。
 * @since Beta v0.13.0
 */
export type HsvColor = {
  /** 色相，取值 0–360。 */
  h: number;
  /** 饱和度，取值 0–1。 */
  s: number;
  /** 明度，取值 0–1。 */
  v: number;
};

/**
 * 规范化十六进制颜色，支持三位与六位写法。
 * @since Beta v0.13.0
 * @param value - 颜色字符串，可省略 `#`
 * @returns 小写 `#rrggbb`，无效时返回 undefined
 */
export function normalizeHexColor(value: string): string | undefined {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/iu.exec(value.trim());
  if (!match) return undefined;
  const digits = match[1];
  const hex = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  return `#${hex.toLowerCase()}`;
}

/**
 * 将十六进制颜色转换为 HSV 分量。
 * @since Beta v0.13.0
 * @param value - 十六进制颜色
 * @returns HSV 分量
 */
export function hexToHsv(value: string): HsvColor {
  const normalized = normalizeHexColor(value);
  if (!normalized) throw new TypeError("颜色值无效");
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta > 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: maximum === 0 ? 0 : delta / maximum, v: maximum };
}

/**
 * 将 HSV 分量转换为十六进制颜色。
 * @since Beta v0.13.0
 * @param color - HSV 分量
 * @returns 小写 `#rrggbb`
 */
export function hsvToHex(color: HsvColor): string {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = Math.min(Math.max(color.s, 0), 1);
  const brightness = Math.min(Math.max(color.v, 0), 1);
  const chroma = brightness * saturation;
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;
  if (section < 1) {
    red = chroma;
    green = second;
  } else if (section < 2) {
    red = second;
    green = chroma;
  } else if (section < 3) {
    green = chroma;
    blue = second;
  } else if (section < 4) {
    green = second;
    blue = chroma;
  } else if (section < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }
  const offset = brightness - chroma;
  const toHex = (channel: number): string =>
    Math.round((channel + offset) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
