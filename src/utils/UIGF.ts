/**
 * @file utils UIGF.ts
 * @description UIGF工具类
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

// tauri
import { app, fs, path } from "@tauri-apps/api";
// utils
import TGSqlite from "../plugins/Sqlite";
import { timestampToDate } from "./t2D";

/**
 * @description 获取 UIGF 头部信息
 * @since Alpha v0.2.3
 * @param {string} uid - UID
 * @returns {Promise<TGApp.Plugins.UIGF.Export>}
 */
export async function getUigfHeader(uid: string): Promise<TGApp.Plugins.UIGF.Export> {
  const stamp = Date.now();
  return {
    uid,
    lang: "zh-cn",
    uigf_version: "2.3.0",
    export_timestamp: Math.floor(stamp / 1000),
    export_time: timestampToDate(stamp),
    export_app: "Tauri.Genshin",
    export_app_version: await app.getVersion(),
  };
}

/**
 * @description 检测是否存在 UIGF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.2.3
 * @param {string} path - UIGF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIGF 数据
 */
export async function verifyUigfData(path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UigfData: TGApp.Plugins.UIGF.Export = JSON.parse(fileData).info;
  return UigfData.uigf_version !== undefined;
}

/**
 * @description 读取 UIGF 数据
 * @since Alpha v0.2.3
 * @param {string} userPath - UIGF 数据路径
 * @returns {Promise<string|false>} UIGF 数据
 */
export async function readUigfData(userPath: string): Promise<string | false> {
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
 * @description 备份 UIGF 数据
 * @since Alpha v0.2.3
 * @param {TGApp.Plugins.UIAF.GachaItem[]} gachaList - 祈愿列表
 * @param {string} uid - UID
 * @returns {Promise<void>}
 */
export async function backupUigfData(
  gachaList: TGApp.Plugins.UIGF.GachaItem[],
  uid: string,
): Promise<void> {
  const savePath = `${await path.appLocalDataDir()}\\userData\\UIGF_${uid}.json`;
  await fs.writeTextFile(savePath, JSON.stringify(gachaList, null, 2));
}

/**
 * @description 恢复 UIGF 数据
 * @since Alpha v0.2.3
 * @param {string} uid - UID
 * @returns {Promise<boolean>} UIGF 数据
 */
export async function restoreUigfData(uid: string): Promise<boolean> {
  const uigfPath = `${await path.appLocalDataDir()}\\userData\\UIGF_${uid}.json`;
  const uigfData = await readUigfData(uigfPath);
  if (uigfData === false) return false;
  await TGSqlite.mergeUIGF(uid, uigfData);
  return true;
}
