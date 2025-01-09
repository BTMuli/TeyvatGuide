/**
 * @file utils/toolFunc.ts
 * @description 一些工具函数
 * @since Beta v0.6.8
 */

import { path } from "@tauri-apps/api";
import { type } from "@tauri-apps/plugin-os";
import colorConvert from "color-convert";
import type { KEYWORD } from "color-convert/conversions.js";
import { v4 } from "uuid";
import { score } from "wcag-color";

import { AppCharacterData, AppWeaponData } from "@/data/index.js";
import TGConstant from "@/web/constant/TGConstant.js";

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

/**
 * @description 时间戳转换为日期
 * @since Beta v0.6.0
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 日期 2021-01-01 00:00:00
 */
export function timestampToDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * @description 获取设备信息（初始化时）
 * @since Beta v0.4.1
 * @returns {TGApp.App.Device.DeviceInfo} 设备信息
 */
export function getInitDeviceInfo(): TGApp.App.Device.DeviceInfo {
  return {
    device_id: v4(),
    product: getRandomString(6, "upperNumber"),
    device_name: getRandomString(12, "upperNumber"),
    seed_id: v4(),
    seed_time: Date.now().toString(),
    device_fp: "0000000000000",
  };
}

/**
 * @description 获取设备信息（登录时）
 * @since Beta v0.3.6
 * @param {string} key - 设备信息 key
 * @returns {string} 设备信息
 */
export function getDeviceInfo(key: keyof TGApp.App.Device.DeviceInfo): string {
  const localDevice = localStorage.getItem("deviceInfo");
  let deviceInfo: TGApp.App.Device.DeviceInfo;
  if (localDevice === null) {
    deviceInfo = getInitDeviceInfo();
    localStorage.setItem("deviceInfo", JSON.stringify({ deviceInfo }));
  } else deviceInfo = JSON.parse(localDevice).deviceInfo;
  return deviceInfo[key];
}

/**
 * @description byte 转成 KB MB GB
 * @since Beta v0.3.4
 * @param {number} bytes - 字节数
 * @returns {string} KB MB GB
 */
export function bytesToSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * @description 获取缓存目录
 * @since Beta v0.5.0
 * @returns {string|string[]} 缓存目录
 */
export async function getCacheDir(): Promise<string[] | false> {
  const cacheDir = await path.appCacheDir();
  const osType = type().toLowerCase();
  if (osType === "windows") {
    const cache = `${cacheDir}${path.sep()}EBWebview${path.sep()}Default${path.sep()}Cache`;
    const codeCache = `${cacheDir}${path.sep()}EBWebview${path.sep()}Default${path.sep()}Code Cache`;
    return [cache, codeCache];
  }
  if (osType === "macos") return [`${cacheDir}${path.sep()}WebKit`];
  return false;
}

/**
 * @description 获取随机字符串
 * @since Beta v0.4.1
 * @param {number} length 字符串长度
 * @param {string} type
 * @returns {string} 随机字符串
 */
export function getRandomString(length: number, type: string = "all"): string {
  const char = "abcdefghijklmnopqrstuvwxyz";
  const num = "0123456789";
  let str: string;
  switch (type) {
    case "all":
      str = char + char.toUpperCase() + num;
      break;
    case "number":
      str = num;
      break;
    case "lower":
      str = char;
      break;
    case "upper":
      str = char.toUpperCase();
      break;
    case "upperNumber":
      str = char.toUpperCase() + num;
      break;
    case "letter":
      str = char + char.toUpperCase();
      break;
    case "hex":
      str = num + "abcdef";
      break;
    default:
      str = char + char.toUpperCase() + num;
  }
  let res = "";
  for (let i = 0; i < length; i++) {
    res += str.charAt(Math.floor(Math.random() * str.length));
  }
  return res;
}

/**
 * @description 将颜色转为 hex
 * @since Beta v0.3.9
 * @param {string} color - 颜色
 * @returns {string} hex
 */
function color2Hex(color: string): string {
  if (color.startsWith("#")) return color;
  if (color.startsWith("rgb")) {
    // 正则获取 rgb(0, 0, 0) 或 rgba(0, 0, 0, 0) 或 rgb(0 0 0/0)
    const reg = /rgba?\((.*?)\)/;
    const match = reg.exec(color);
    if (match === null) return "#000000";
    const rgb = match[1];
    const rgbArr = rgb.split(/[ ,/]/);
    if (rgbArr.length < 3) return "#000000";
    const r = parseInt(rgbArr[0]);
    const g = parseInt(rgbArr[1]);
    const b = parseInt(rgbArr[2]);
    return colorConvert.rgb.hex([r, g, b]);
  }
  return colorConvert.keyword.hex(<KEYWORD>color);
}

/**
 * @description 判断颜色是否相似
 * @since Beta v0.3.9
 * @param {string} colorBg - 背景颜色
 * @param {string} colorText - 文本颜色
 * @returns {boolean} 是否相似
 */
export function isColorSimilar(colorBg: string, colorText: string): boolean {
  const hexBg = color2Hex(colorBg);
  const hexText = color2Hex(colorText);
  return score(hexText, hexBg) === "Fail";
}

/**
 * @description 解析带样式的文本
 * @since Beta v0.3.8
 * @param {string} desc - 带样式的文本
 * @returns {string} 解析后的文本
 */
export function parseHtmlText(desc: string): string {
  const reg = /<color=(.*?)>(.*?)<\/color>/g;
  let match = reg.exec(desc);
  while (match !== null) {
    const color = match[1];
    const text = match[2];
    desc = desc.replace(match[0], `<span title="${text}" style="color: ${color}">${text}</span>`);
    match = reg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}

/**
 * @description 根据英文element获取中文
 * @since Beta v0.5.3
 * @param {string} element - 英文element
 * @returns {string} 中文element
 */
export function getZhElement(element: string): string {
  const elementUpper = element.toUpperCase();
  switch (elementUpper) {
    case "ANEMO":
      return "风";
    case "CRYO":
      return "冰";
    case "DENDRO":
      return "草";
    case "ELECTRO":
      return "雷";
    case "GEO":
      return "岩";
    case "HYDRO":
      return "水";
    case "PYRO":
      return "火";
    default:
      return "未知";
  }
}

/**
 * @description 获取视频时长
 * @since Beta v0.6.7
 * @param {number} durationMill - 视频时长（毫秒）
 * @returns {string} 视频时长
 */
export function getVideoDuration(durationMill: number): string {
  const duration = Math.floor(durationMill / 1000);
  const seconds = duration % 60;
  const minutes = Math.floor(duration / 60) % 60;
  const hours = Math.floor(duration / 3600);
  let result = "";
  if (hours > 0) result += `${hours.toString().padStart(2, "0")}:`;
  result += `${minutes.toString().padStart(2, "0")}:`;
  result += `${seconds.toString().padStart(2, "0")}`;
  return result;
}

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
 * @description 根据 gid 获取游戏名称
 * @since Beta v0.6.7
 * @param {number} gid
 * @returns {string}
 */
export function getGameName(gid: number): string {
  const game = TGConstant.BBS.CHANNELS.find((item) => item.gid === gid.toString());
  return game ? game.title : "未知游戏";
}

/**
 * @description 获取游戏id
 * @since Beta v0.6.7
 * @param {string} mini
 * @returns {string}
 */
export function getGameId(mini: string): string {
  const game = TGConstant.BBS.CHANNELS.find((item) => item.mini === mini);
  return game ? game.gid : "0";
}

/**
 * @description 根据id获取对应角色/武器数据
 * @since Beta v0.6.8
 * @param {number|string} id
 * @returns {TGApp.App.Character.WikiBriefInfo|TGApp.App.Weapon.WikiBriefInfo}
 */
export function getWikiBrief(
  id: number | string,
): TGApp.App.Character.WikiBriefInfo | TGApp.App.Weapon.WikiBriefInfo | false {
  const len = id.toString().length;
  if (len === 5) {
    return AppWeaponData.find((item) => item.id.toString() === id.toString()) ?? false;
  }
  return AppCharacterData.find((item) => item.id.toString() === id.toString()) ?? false;
}
