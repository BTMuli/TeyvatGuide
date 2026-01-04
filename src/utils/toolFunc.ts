/**
 * 一些工具函数
 * @since Beta v0.9.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import { tz } from "@date-fns/tz";
import bbsEnum from "@enum/bbs.js";
import staticDataEnum from "@enum/staticData.js";
import { path } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { type } from "@tauri-apps/plugin-os";
import TGLogger from "@utils/TGLogger.js";
import { format, parseISO } from "date-fns";
import { v4 } from "uuid";

import { AppCalendarData, AppCharacterData, AppWeaponData } from "@/data/index.js";

/**
 * 时间戳转换为时间字符串
 * @since Beta v0.8.0
 * @param time - 时间戳（毫秒）
 * @returns 时间字符串 d天 hh:mm:ss
 */
export function stamp2LastTime(time: number): string {
  const day = Math.floor(time / (24 * 3600 * 1000));
  const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
  const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
  const second = Math.floor((time % (60 * 1000)) / 1000);
  return `${day === 0 ? "" : `${day}天 `}${hour.toFixed(0).padStart(2, "0")}:${minute
    .toFixed(0)
    .padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

/**
 * 时间戳转换为日期
 * @since Beta v0.6.0
 * @param timestamp - 时间戳（毫秒）
 * @returns 日期 2021-01-01 00:00:00
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
 * 获取相近时间
 * @since Beta v0.7.2
 * @remarks
 * - 如果是今天，只显示 hh:mm
 * - 如果是今年，显示 MM-dd
 * - 否则显示 yyyy-MM-dd
 *
 * @param timestamp - 时间戳（秒）
 * @returns 相近时间
 */
export function getNearTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  if (
    now.getFullYear() === year &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  ) {
    return `${hour}:${minute}`;
  }
  if (now.getFullYear() === year) return `${month}-${day}`;
  return `${year}-${month}-${day}`;
}

/**
 * 获取设备信息（初始化时）
 * @since Beta v0.4.1
 * @returns 设备信息
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
 * 获取设备信息（登录时）
 * @since Beta v0.3.6
 * @param key - 设备信息 key
 * @returns 设备信息
 */
export function getDeviceInfo(key: TGApp.App.Device.DeviceInfoKey): string {
  const localDevice = localStorage.getItem("deviceInfo");
  let deviceInfo: TGApp.App.Device.DeviceInfo;
  if (localDevice === null) {
    deviceInfo = getInitDeviceInfo();
    localStorage.setItem("deviceInfo", JSON.stringify({ deviceInfo }));
  } else deviceInfo = JSON.parse(localDevice).deviceInfo;
  return deviceInfo[key];
}

/**
 * byte 转成 KB MB GB
 * @since Beta v0.3.4
 * @param bytes - 字节数
 * @returns KB MB GB
 */
export function bytesToSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取缓存目录
 * @since Beta v0.9.1
 * @returns 缓存目录
 */
export async function getCacheDir(): Promise<Array<string> | false> {
  const cacheDir = await path.appCacheDir();
  const osType = type().toLowerCase();
  if (osType === "windows") {
    // TODO: 会报错显示占用
    const cache = `${cacheDir}${path.sep()}EBWebview${path.sep()}Default${path.sep()}Cache`;
    const codeCache = `${cacheDir}${path.sep()}EBWebview${path.sep()}Default${path.sep()}Code Cache`;
    return [cache, codeCache];
  }
  if (osType === "macos") return [`${cacheDir}${path.sep()}WebKit`];
  return false;
}

/**
 * 获取随机字符串
 * @since Beta v0.4.1
 * @param length - 字符串长度
 * @param type - 字符串类型
 * @returns 随机字符串
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
 * 解析带样式的文本
 * @since Beta v0.8.1
 * @param desc - 带样式的文本
 * @returns 解析后的文本
 */
export function parseHtmlText(desc: string): string {
  const linkReg = /\{LINK#(.*?)}(.*?)\{\/LINK}/g;
  let linkMatch = linkReg.exec(desc);
  while (linkMatch !== null) {
    const link = linkMatch[1];
    const text = linkMatch[2];
    // TODO: 后续处理 t-link
    desc = desc.replace(linkMatch[0], `<t-link data-link="${link}">${text}</t-link>`);
    linkMatch = linkReg.exec(desc);
  }
  const colorReg = /<color=(.*?)>(.*?)<\/color>/g;
  let colorMatch = colorReg.exec(desc);
  while (colorMatch !== null) {
    const color = colorMatch[1];
    const text = new DOMParser().parseFromString(colorMatch[2], "text/html").body.textContent;
    desc = desc.replace(
      colorMatch[0],
      `<span title="${text}" style="color: ${color}">${text}</span>`,
    );
    colorMatch = colorReg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}

/**
 * 根据英文element获取中文
 * @since Beta v0.5.3
 * @param element - 英文element
 * @returns 中文element
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
 * 获取视频时长
 * @since Beta v0.6.7
 * @param durationMill - 视频时长（毫秒）
 * @returns 视频时长
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
 * 转义正则表达式
 * @since Beta v0.3.3
 * @param data - 内容
 * @returns 转义后的内容
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
 * 根据id获取对应角色/武器数据
 * @since Beta v0.9.1
 * @param id - id
 * @returns 角色/武器数据
 */
export function getWikiBrief(
  id: number | string,
): TGApp.App.Character.WikiBriefInfo | TGApp.App.Weapon.WikiBriefInfo | false {
  const find = AppCalendarData.find((i) => i.id.toString() === id.toString());
  if (find === undefined) return false;
  if (find.itemType === staticDataEnum.calendarItem.weapon) {
    return AppWeaponData.find((item) => item.id.toString() === id.toString()) ?? false;
  }
  return AppCharacterData.find((item) => item.id.toString() === id.toString()) ?? false;
}

/**
 * 根据传入角色信息获取头像
 * @since Beta v0.9.1
 * @param user - 用户信息
 * @returns 头像链接
 */
export function getUserAvatar(
  user: TGApp.BBS.Reply.User | TGApp.BBS.Post.User | TGApp.BBS.User.Info,
): string {
  if (!user.avatar_ext) return user.avatar_url;
  if (user.avatar_ext.avatar_type === bbsEnum.user.avatarExtType.CUSTOM) return user.avatar_url;
  if (user.avatar_ext.avatar_type === bbsEnum.user.avatarExtType.GIF) {
    const findGH = user.avatar_ext.hd_resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.GIF,
    );
    if (findGH) return findGH.url;
    const findG = user.avatar_ext.resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.GIF,
    );
    if (findG) return findG.url;
    const findWH = user.avatar_ext.hd_resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.WEBP,
    );
    if (findWH) return findWH.url;
    const findW = user.avatar_ext.resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.WEBP,
    );
    if (findW) return findW.url;
    const findPH = user.avatar_ext.hd_resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.PNG,
    );
    if (findPH) return findPH.url;
    const findP = user.avatar_ext.resources.find(
      (i) => i.format === bbsEnum.user.avatarResType.PNG,
    );
    if (findP) return findP.url;
    return user.avatar_url;
  }
  // TODO: 处理其他类型头像
  return user.avatar_url;
}

/**
 * 判断是否是管理员模式
 * @since Beta v0.9.1
 */
export async function isRunInAdmin(): Promise<boolean> {
  let isAdmin = false;
  try {
    isAdmin = await invoke<boolean>("is_in_admin");
  } catch (err) {
    showSnackbar.error(`检测管理员权限失败：${err}`);
    await TGLogger.Error(`[pageAchi][toYae]检测管理员权限失败:${err}`);
    return false;
  }
  return isAdmin;
}

/**
 * 传入角色ID跟星级，返回渲染星级
 * @since Beta v0.9.1
 * @param cid - 角色ID
 * @param star - 角色星级
 * @returns 渲染星级
 */
export function getRcStar(cid: number, star: number): number {
  const star105List = [10000062, 10000117, 10000118];
  return star105List.includes(cid) ? 105 : star;
}

/**
 * 接收时间字符串，转成utf8时区
 * @since Beta v0.9.1
 * @param str - 时间字符串
 * @example 2025-09-18T01:01:39+00:00
 * @returns 转换后的时间
 */
export function timeStr2str(str: string): string {
  return format(parseISO(str), "yyyy-MM-dd HH:mm:ss", {
    in: tz("Asia/Shanghai"),
  });
}
