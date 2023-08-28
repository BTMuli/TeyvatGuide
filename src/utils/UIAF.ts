/**
 * @file utils UIAF.ts
 * @description UIAF工具类
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

// tauri
import { app, fs, path } from "@tauri-apps/api";
// utils
import TGSqlite from "../plugins/Sqlite";

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
 * @since Alpha v0.1.3
 * @returns {Promise<TGApp.Plugins.UIAF.Export>}
 */
export async function getUiafHeader(): Promise<TGApp.Plugins.UIAF.Export> {
  return {
    export_app: "Tauri.Genshin",
    export_timestamp: Math.floor(Date.now() / 1000),
    export_app_version: await app.getVersion(),
    uiaf_version: "v1.1",
  };
}

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.1.3
 * @param {string} path - UIAF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function verifyUiafData(path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UiafData: TGApp.Plugins.UIAF.Export = JSON.parse(fileData).info;
  return UiafData.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha v0.1.3
 * @param {string} userPath - UIAF 数据路径
 * @returns {Promise<string|false>} UIAF 数据
 */
export async function readUiafData(userPath: string): Promise<string | false> {
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

/**
 * @description 根据成就数据导出 UIAF 数据
 * @since Alpha v0.1.4
 * @param {TGApp.Plugins.UIAF.Achievement[]} achievementData - 成就数据
 * @returns {Promise<void>}
 */
export async function backupUiafData(
  achievementData: TGApp.Plugins.UIAF.Achievement[],
): Promise<void> {
  const savePath = `${await path.appLocalDataDir()}\\userData\\UIAF.json`;
  await fs.writeTextFile(savePath, JSON.stringify(achievementData, null, 2));
}

/**
 * @description 根据 UIAF 数据恢复成就数据
 * @since Alpha v0.1.4
 * @returns {Promise<boolean>} 恢复的成就数量
 */
export async function restoreUiafData(): Promise<boolean> {
  const uiafPath = `${await path.appLocalDataDir()}\\userData\\UIAF.json`;
  // 检测是否存在 UIAF 数据
  if (!(await fs.exists(uiafPath))) {
    return false;
  }
  const uiafData: TGApp.Plugins.UIAF.Achievement[] = JSON.parse(await fs.readTextFile(uiafPath));
  await TGSqlite.mergeUIAF(uiafData);
  return true;
}
