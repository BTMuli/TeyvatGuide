/**
 * @file plugins UIAF utils importData.ts
 * @description UIAF import data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type UiafHeader } from "../interface/UIAF";
import { fs } from "@tauri-apps/api";

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.1.2
 * @param {string} path - UIAF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function checkUiafData (path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UIAFData: UiafHeader = JSON.parse(fileData).info;
  return UIAFData.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha v0.1.2
 * @param {string} userPath - UIAF 数据路径
 * @returns {Promise<string|false>} UIAF 数据
 */
export async function readUiafData (userPath: string): Promise<string | false> {
  if (await fs.exists(userPath)) {
    const fileData = await fs.readTextFile(userPath);
    if (fileData !== undefined && fileData !== null && fileData !== "" && fileData !== "{}") {
      return fileData;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
