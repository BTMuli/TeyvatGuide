/**
 * @description 获取 UIAF 头部信息
 * @since Alpha v0.1.2
 * @returns {Promise<TGPlugin.UIAF.Header>}
 */

import { app, fs } from "@tauri-apps/api";

/**
 * @description 获取 UIAF 头部信息
 * @since Alpha v0.1.2
 * @returns {Promise<TGPlugin.UIAF.Header>}
 */

export async function getHeader (): Promise<TGPlugin.UIAF.Header> {
  return {
    // eslint-disable-next-line camelcase
    export_app: "Tauri.Genshin",
    // eslint-disable-next-line camelcase
    export_timestamp: Math.floor(Date.now() / 1000),
    // eslint-disable-next-line camelcase
    export_app_version: await app.getVersion(),
    // eslint-disable-next-line camelcase
    uiaf_version: "v1.1",
  };
}

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.1.2
 * @param {string} path - UIAF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function verifyUIAF (path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UIAFData: TGPlugin.UIAF.Header = JSON.parse(fileData).info;
  return UIAFData.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha v0.1.2
 * @param {string} userPath - UIAF 数据路径
 * @returns {Promise<string|false>} UIAF 数据
 */
export async function readUIAF (userPath: string): Promise<string | false> {
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
