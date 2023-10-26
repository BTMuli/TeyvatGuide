/**
 * @file utils toolFunc.ts
 * @description 一些工具函数
 * @since Beta v0.3.4
 */

import { fs, os, path } from "@tauri-apps/api";
import type { FileEntry } from "@tauri-apps/api/fs";
import { v4 } from "uuid";

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
 * @description 获取 deviceID
 * @since Beta v0.3.4
 * @returns {string} deviceID
 */
export function getDeviceID(): string {
  let deviceID = localStorage.getItem("deviceID");
  if (deviceID === null) {
    deviceID = v4();
    localStorage.setItem("deviceID", deviceID);
  }
  return deviceID;
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
 * @description 获取文件夹大小
 * @since Beta v0.3.4
 * @param {FileEntry[]} cacheInfo - 文件夹信息
 * @param {boolean} isRoot - 是否是根目录
 * @returns {Promise<number>} 文件夹大小
 */
export async function getDirSize(cacheInfo: FileEntry[], isRoot: false): Promise<number>;
export async function getDirSize(cacheInfo: FileEntry[], isRoot?: true): Promise<string>;
export async function getDirSize(
  cacheInfo: FileEntry[],
  isRoot?: boolean,
): Promise<number | string> {
  let size = 0;
  for (const item of cacheInfo) {
    if (item.children) {
      const dir = await fs.readDir(item.path);
      size += await getDirSize(dir, false);
    } else {
      const file = await fs.readBinaryFile(item.path);
      size += file.byteLength;
    }
  }
  if (isRoot === undefined || isRoot) return bytesToSize(size);
  return size;
}

/**
 * @description 获取缓存目录
 * @since Beta v0.3.4
 * @returns {string|string[]} 缓存目录
 */
export async function getCacheDir(): Promise<string | string[] | false> {
  const cacheDir = await path.appCacheDir();
  const osType = await os.type();
  if (osType === "Windows_NT") {
    const cache = `${cacheDir}EBWebview${path.sep}Default${path.sep}Cache`;
    const codeCache = `${cacheDir}EBWebview${path.sep}Default${path.sep}Code Cache`;
    return [cache, codeCache];
  } else if (osType === "Darwin") {
    return `${cacheDir}WebKit`;
  }
  return false;
}
