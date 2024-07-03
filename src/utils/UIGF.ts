/**
 * @file utils/UIGF.ts
 * @description UIGF工具类
 * @since Beta v0.5.0
 */

import { app, path } from "@tauri-apps/api";
import { mkdir, exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import Ajv from "ajv";
import { ErrorObject } from "ajv/lib/types/index.js";

import showSnackbar from "../components/func/snackbar.js";
import { UigfSchema } from "../data/index.js";

import TGLogger from "./TGLogger.js";
import { timestampToDate } from "./toolFunc.js";

/**
 * @description 获取 UIGF 时区
 * @since Beta v0.3.5
 * @param {string} uid - UID
 * @returns {number} 时区
 */
function getUigfTimeZone(uid: string): number {
  if (uid.startsWith("6")) return -5;
  if (uid.startsWith("7")) return 1;
  return 8;
}

/**
 * @description 获取 UIGF 头部信息
 * @since Beta v0.4.4
 * @param {string} uid - UID
 * @returns {Promise<TGApp.Plugins.UIGF.Export>}
 */
export async function getUigfHeader(uid: string): Promise<TGApp.Plugins.UIGF.Export> {
  const stamp = Date.now();
  return {
    uid,
    lang: "zh-cn",
    uigf_version: "v3.0",
    export_timestamp: Math.floor(stamp / 1000),
    export_time: timestampToDate(stamp),
    export_app: "TeyvatGuide",
    export_app_version: await app.getVersion(),
    region_time_zone: getUigfTimeZone(uid),
  };
}

/**
 * @description 数据转换-数据库到 UIGF
 * @since Alpha v0.2.3
 * @param {TGApp.Sqlite.GachaRecords.SingleTable[]} data - 数据库数据
 * @returns {TGApp.Plugins.UIGF.GachaItem[]} UIGF 数据
 */
export function convertDataToUigf(
  data: TGApp.Sqlite.GachaRecords.SingleTable[],
): TGApp.Plugins.UIGF.GachaItem[] {
  return data.map((gacha) => {
    return {
      gacha_type: gacha.gachaType,
      item_id: gacha.itemId,
      count: gacha.count,
      time: gacha.time,
      name: gacha.name,
      item_type: gacha.type,
      rank_type: gacha.rank,
      id: gacha.id,
      uigf_gacha_type: gacha.uigfType,
    };
  });
}

/**
 * @description 检测是否存在 UIGF 数据，采用 ajv 验证 schema
 * @since Beta v0.5.0
 * @param {string} path - UIGF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIGF 数据
 */
export async function verifyUigfData(path: string): Promise<boolean> {
  const fileData: string = await readTextFile(path);
  const ajv = new Ajv();
  const validate = ajv.compile(UigfSchema);
  try {
    const fileJson = JSON.parse(fileData);
    if (!validate(fileJson)) {
      if (!validate.errors || validate.errors.length === 0) return false;
      const error: ErrorObject = validate.errors[0];
      showSnackbar({
        text: `${error.instancePath || error.schemaPath} ${error.message}`,
        color: "error",
      });
      await TGLogger.Error(`UIGF 数据验证失败，文件路径：${path}`);
      await TGLogger.Error(`错误信息 ${validate.errors}`);
      return false;
    }
    return true;
  } catch (e) {
    showSnackbar({ text: `UIGF 数据格式错误 ${e}`, color: "error" });
    await TGLogger.Error(`UIGF 数据格式错误，文件路径：${path}`);
    await TGLogger.Error(`错误信息 ${e}`);
    return false;
  }
}

/**
 * @description 读取 UIGF 数据
 * @since Beta v0.5.0
 * @param {string} userPath - UIGF 数据路径
 * @returns {Promise<TGApp.Plugins.UIGF.FullData>} UIGF 数据
 */
export async function readUigfData(userPath: string): Promise<TGApp.Plugins.UIGF.FullData> {
  const fileData = await readTextFile(userPath);
  return <TGApp.Plugins.UIGF.FullData>JSON.parse(fileData);
}

/**
 * @description 导出 UIGF 数据
 * @since Beta v0.5.0
 * @param {string} uid - UID
 * @param {TGApp.Sqlite.GachaRecords.SingleTable[]} gachaList - 祈愿列表
 * @param {string} savePath - 保存路径
 * @returns {Promise<void>}
 */
export async function exportUigfData(
  uid: string,
  gachaList: TGApp.Sqlite.GachaRecords.SingleTable[],
  savePath?: string,
): Promise<void> {
  const UigfData = {
    info: await getUigfHeader(uid),
    list: convertDataToUigf(gachaList),
  };
  const filePath = savePath ?? `${await path.appLocalDataDir()}userData\\UIGF_${uid}.json`;
  await writeTextFile(filePath, JSON.stringify(UigfData));
}

/**
 * @description 备份 UIGF 数据
 * @since Beta v0.5.0
 * @param {string} dirPath - 备份路径
 * @param {string} uid - UID
 * @param {TGApp.Sqlite.GachaRecords.SingleTable[]} gachaList - 祈愿列表
 * @returns {Promise<void>}
 */
export async function backupUigfData(
  dirPath: string,
  uid: string,
  gachaList: TGApp.Sqlite.GachaRecords.SingleTable[],
): Promise<void> {
  if (!(await exists(dirPath))) await mkdir(dirPath, { recursive: true });
  await exportUigfData(uid, gachaList, `${dirPath}${path.sep()}UIGF_${uid}.json`);
}
