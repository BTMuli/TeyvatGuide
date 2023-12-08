/**
 * @file utils/toolFunc.ts
 * @description 一些工具函数
 * @since Beta v0.3.6
 */

import { os, path } from "@tauri-apps/api";
import colorConvert from "color-convert";
import type { KEYWORD } from "color-convert/conversions";
import { v4 } from "uuid";
import { score } from "wcag-color";

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

/**
 * @description 获取当前时间, YY-MM-DD HH:MM:SS
 * @since Beta v0.3.6
 * @returns {string} 当前时间
 */
export function getNowStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const date = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  const second = now.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${date} ${hour}:${minute}:${second}`;
}

/**
 * @description 获取设备信息（初始化时）
 * @since Beta v0.3.6
 * @returns {TGApp.App.Device.DeviceInfo} 设备信息
 */
export function getInitDeviceInfo(): TGApp.App.Device.DeviceInfo {
  return {
    device_id: v4(),
    model: getRandomString(6),
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
export function getDeviceInfo(key: "device_id" | "device_fp"): string {
  const localDevice = localStorage.getItem("deviceInfo");
  let deviceInfo: TGApp.App.Device.DeviceInfo;
  if (localDevice === null) {
    deviceInfo = getInitDeviceInfo();
    localStorage.setItem("deviceInfo", JSON.stringify({ deviceInfo }));
  } else {
    deviceInfo = JSON.parse(localDevice).deviceInfo;
  }
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
 * @since Beta v0.3.4
 * @returns {string|string[]} 缓存目录
 */
export async function getCacheDir(): Promise<string[] | false> {
  const cacheDir = await path.appCacheDir();
  const osType = await os.type();
  if (osType === "Windows_NT") {
    const cache = `${cacheDir}EBWebview${path.sep}Default${path.sep}Cache`;
    const codeCache = `${cacheDir}EBWebview${path.sep}Default${path.sep}Code Cache`;
    return [cache, codeCache];
  } else if (osType === "Darwin") {
    return [`${cacheDir}WebKit`];
  }
  return false;
}

/**
 * @description 获取随机字符串
 * @since Beta v0.3.6
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
 * @description 判断颜色是否相似
 * @since Beta v0.3.7
 * @param {string} colorBg - 背景颜色
 * @param {string} colorText - 文本颜色
 * @returns {boolean} 是否相似
 */
export function isColorSimilar(colorBg: string, colorText: string): boolean {
  const hexBg = colorBg.startsWith("#") ? colorBg : colorConvert.keyword.hex(<KEYWORD>colorBg);
  const hexText = colorText.startsWith("#")
    ? colorText
    : colorConvert.keyword.hex(<KEYWORD>colorText);
  return score(hexText, hexBg) === "Fail";
}

/**
 * @description 判断是否为 Mys 帖子
 * @since Beta v0.3.7
 * @param {string} url - 网址
 * @returns {boolean} 是否为 Mys 帖子
 */
export function isMysPost(url: string): boolean {
  const regBBS = /^https:\/\/bbs\.mihoyo\.com\/\w+\/article\/\d+$/;
  const regMys = /^https:\/\/www\.miyoushe\.com\/\w+\/article\/\d+$/;
  return regBBS.test(url) || regMys.test(url);
}
