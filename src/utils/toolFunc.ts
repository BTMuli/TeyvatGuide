/**
 * 一些工具函数
 * @since Beta v0.10.2
 */

import bbsEnum from "@enum/bbs.js";
import staticDataEnum from "@enum/staticData.js";
import { path } from "@tauri-apps/api";
import { type } from "@tauri-apps/plugin-os";
import { v4 } from "uuid";

import { AppCalendarData, AppCharacterData, AppWeaponData } from "@/data/index.js";

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
 * 获取缓存目录
 * @since Beta v0.9.1
 * @returns 缓存目录
 */
export async function getCacheDir(): Promise<Array<string> | false> {
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
 * @since Beta v0.9.2
 * @param desc - 带样式的文本
 * @returns 解析后的文本
 */
export function parseHtmlText(desc: string): string {
  const colorReg = /<color=(.*?)>(.*?)<\/color>/g;
  const linkReg = /\{LINK#(.*?)}(.*?)\{\/LINK}/g;
  let colorMatch = colorReg.exec(desc);
  while (colorMatch !== null) {
    const color = colorMatch[1];
    const text = new DOMParser().parseFromString(colorMatch[2], "text/html").body.textContent;
    let title = text;
    const colorLinkMatch = text.match(linkReg);
    if (colorLinkMatch !== null) title = colorLinkMatch[2];
    desc = desc.replace(
      colorMatch[0],
      `<span title="${title}" style="color: ${color}">${text}</span>`,
    );
    colorMatch = colorReg.exec(desc);
  }
  let linkMatch = linkReg.exec(desc);
  while (linkMatch !== null) {
    const link = linkMatch[1];
    const text = linkMatch[2];
    desc = desc.replace(
      linkMatch[0],
      `<t-link content="${encodeURIComponent(text)}" link="${link}"></t-link>`,
    );
    linkMatch = linkReg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}

/**
 * 解析书籍正文中的游戏内部标记
 * @since Beta v0.11.3
 * @param story - 书籍正文
 * @returns 解析后的 HTML 文本
 */
export function parseBookText(story: string): string {
  const titleReg = /<title\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^/>]*?))\s*\/>/gi;
  const regionReg = /<region\b[^>]*\/>/gi;
  const imageReg = /<image\b[^>]*\/>/gi;
  const centerReg = /<center>([\s\S]*?)<\/center>/gi;

  return parseHtmlText(
    story
      .replace(titleReg, (_match, doubleQuotedTitle, singleQuotedTitle, bareTitle) => {
        const title = doubleQuotedTitle ?? singleQuotedTitle ?? (bareTitle ?? "").trim();
        return title.length > 0 ? `<h4>${title}</h4>` : "";
      })
      .replace(regionReg, "")
      .replace(imageReg, escapeHtmlText)
      .replace(centerReg, '<p class="twbd-center">$1</p>'),
  );
}

function escapeHtmlText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
 * 验证邮箱
 * @since Beta v0.9.1
 * @param email - 邮箱
 * @returns 验证结果
 */
export function validEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 比较两个语义化版本号
 * @since Beta v0.10.2
 * @param v1 - 版本号1（当前应用版本）
 * @param v2 - 版本号2（远程最新版本）
 * @returns 比较结果：1表示v1更新，-1表示v2更新，0表示相同
 * @example compareVersions("0.10.1", "0.10.0") // 返回 1
 * @example compareVersions("0.9.9", "0.10.0") // 返回 -1
 * @example compareVersions("0.10.0", "0.10.0") // 返回 0
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
