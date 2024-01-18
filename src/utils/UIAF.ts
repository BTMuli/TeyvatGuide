/**
 * @file utils/UIAF.ts
 * @description UIAF工具类
 * @since Beta v0.4.1
 */

import { app, fs } from "@tauri-apps/api";

/**
 * @description 根据 completed 跟 progress 获取 status
 * @since Alpha v0.1.4
 * @param {boolean} completed - 是否完成
 * @param {number} progress - 进度
 * @returns {number} status
 */
export function getUiafStatus(completed: boolean, progress: number): number {
  if (progress !== 0 && !completed) {
    return 1;
  } else if (progress === 0 && completed) {
    return 2;
  } else if (progress !== 0 && completed) {
    return 3;
  } else {
    return 0;
  }
}

/**
 * @description 获取 UIAF 头部信息
 * @since Beta v0.3.4
 * @returns {Promise<TGApp.Plugins.UIAF.Export>}
 */
export async function getUiafHeader(): Promise<TGApp.Plugins.UIAF.Export> {
  return {
    export_app: "TeyvatGuide",
    export_timestamp: Math.floor(Date.now() / 1000),
    export_app_version: await app.getVersion(),
    uiaf_version: "v1.1",
  };
}

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.2.3
 * @param {string} path - UIAF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function verifyUiafData(path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UiafData: TGApp.Plugins.UIAF.Export = JSON.parse(fileData)?.info;
  return UiafData?.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha v0.2.3
 * @param {string} userPath - UIAF 数据路径
 * @returns {Promise<TGApp.Plugins.UIAF.Data>} UIAF 数据
 */
export async function readUiafData(userPath: string): Promise<TGApp.Plugins.UIAF.Data> {
  const fileData = await fs.readTextFile(userPath);
  return <TGApp.Plugins.UIAF.Data>JSON.parse(fileData);
}
