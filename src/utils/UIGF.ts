/**
 * @file utils/UIGF.ts
 * @description UIGF工具类
 * @since Beta v0.7.5
 */

import showSnackbar from "@comp/func/snackbar.js";
import TSUserGacha from "@Sqlite/modules/userGacha.js";
import { app, path } from "@tauri-apps/api";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Ajv } from "ajv";
import type { ErrorObject } from "ajv/lib/types/index.js";

import TGLogger from "./TGLogger.js";
import { timestampToDate } from "./toolFunc.js";

import { Uigf4Schema, UigfSchema } from "@/data/index.js";

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
 * @description 传入utc8时间字符串跟目标时区，转成目标时区时间字符串
 * @since Beta v0.7.5
 * @param {string} time - 时间字符串
 * @param {number} timezone - 时区
 * @return {string} 转换后的时间字符串
 */
function getExportTime(time: string, timezone: number): string {
  const date = new Date(time);
  const diffTimezone = -8 + timezone;
  const realDate = new Date(date.getTime() + diffTimezone * 60 * 60 * 1000);
  return timestampToDate(realDate.getTime());
}

/**
 * @description 获取 UIGF 头部信息
 * @since Beta v0.7.5
 * @param {string} uid - UID
 * @param {number} timezone - 时区
 * @returns {Promise<TGApp.Plugins.UIGF.Info>}
 */
async function getUigfHeader(uid: string, timezone: number): Promise<TGApp.Plugins.UIGF.Info> {
  const stamp = Date.now();
  return {
    uid,
    lang: "zh-cn",
    uigf_version: "v3.0",
    export_timestamp: Math.floor(stamp / 1000),
    export_time: timestampToDate(stamp),
    export_app: "TeyvatGuide",
    export_app_version: await app.getVersion(),
    region_time_zone: timezone,
  };
}

/**
 * @description 获取 UIGF v4.0 头部信息
 * @since Beta v0.5.1
 * @returns {TGApp.Plugins.UIGF.Info4} UIGF v4.0 头部信息
 */
export async function getUigf4Header(): Promise<TGApp.Plugins.UIGF.Info4> {
  const stamp = Date.now();
  return {
    export_timestamp: Math.floor(stamp / 1000).toString(),
    export_app: "TeyvatGuide",
    export_app_version: await app.getVersion(),
    version: "v4.0",
    lang: "zh-cn",
  };
}

/**
 * @description 数据转换-数据库到 UIGF
 * @since Beta v0.7.5
 * @param {TGApp.Sqlite.GachaRecords.SingleTable[]} data - 数据库数据
 * @param {number} timezone - 时区
 * @returns {TGApp.Plugins.UIGF.GachaItem[]} UIGF 数据
 */
function convertDataToUigf(
  data: TGApp.Sqlite.GachaRecords.SingleTable[],
  timezone: number,
): TGApp.Plugins.UIGF.GachaItem[] {
  return data.map((gacha) => {
    return {
      gacha_type: gacha.gachaType,
      item_id: gacha.itemId,
      count: gacha.count,
      time: getExportTime(gacha.time, timezone),
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
 * @since Beta v0.6.5
 * @param {string} path - UIGF 数据路径
 * @param {boolean} isVersion4 - 是否为 UIGF v4.0
 * @returns {Promise<boolean>} 是否存在 UIGF 数据
 */
export async function verifyUigfData(path: string, isVersion4: boolean = false): Promise<boolean> {
  try {
    const fileData: string = await readTextFile(path);
    const fileJson = JSON.parse(fileData);
    if (isVersion4) return validateUigf4Data(fileJson);
    return validateUigfData(fileJson);
  } catch (e) {
    showSnackbar.error(`UIGF 数据格式错误 ${e}`);
    await TGLogger.Error(`UIGF 数据格式错误，文件路径：${path}`);
    await TGLogger.Error(`错误信息 ${e}`);
    return false;
  }
}

/**
 * @description 验证 UIGF 数据
 * @since Beta v0.5.1
 * @param {object} data - UIGF 数据
 * @returns {boolean} 是否验证通过
 */
function validateUigfData(data: object): boolean {
  const ajv = new Ajv();
  const validate = ajv.compile(UigfSchema);
  if (!validate(data)) {
    if (!validate.errors || validate.errors.length === 0) return false;
    const error: ErrorObject = validate.errors[0];
    showSnackbar.error(`${error.instancePath || error.schemaPath} ${error.message}`);
    return false;
  }
  const parsedData: TGApp.Plugins.UIGF.Schema = <TGApp.Plugins.UIGF.Schema>data;
  if (parsedData.info.uigf_version < "v2.3") {
    showSnackbar.error("UIGF 版本过低，请使用 v2.3 或以上版本");
    return false;
  }
  return true;
}

/**
 * @description 验证 UIGF v4.0 数据
 * @since Beta v0.5.0
 * @param {object} data - UIGF 数据
 * @returns {boolean} 是否验证通过
 */
function validateUigf4Data(data: object): boolean {
  const ajv = new Ajv();
  const validate4 = ajv.compile(Uigf4Schema);
  if (validate4(data)) return true;
  if (!validate4.errors || validate4.errors.length === 0) return false;
  const error: ErrorObject = validate4.errors[0];
  showSnackbar.error(`${error.instancePath || error.schemaPath} ${error.message}`);
  return false;
}

/**
 * @description 读取 UIGF 数据
 * @since Beta v0.5.0
 * @param {string} userPath - UIGF 数据路径
 * @returns {Promise<TGApp.Plugins.UIGF.Schema>} UIGF 数据
 */
export async function readUigfData(userPath: string): Promise<TGApp.Plugins.UIGF.Schema> {
  const fileData: string = await readTextFile(userPath);
  return JSON.parse(fileData) satisfies TGApp.Plugins.UIGF.Schema;
}

/**
 * @description 读取 UIGF 4.0 数据
 * @since Beta v0.5.0
 * @param {string} userPath - UIGF 数据路径
 * @returns {Promise<TGApp.Plugins.UIGF.Schema4>} UIGF 数据
 */
export async function readUigf4Data(userPath: string): Promise<TGApp.Plugins.UIGF.Schema4> {
  const fileData: string = await readTextFile(userPath);
  return JSON.parse(fileData) satisfies TGApp.Plugins.UIGF.Schema4;
}

/**
 * @description 导出 UIGF 数据
 * @since Beta v0.7.5
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
  const timezone = getUigfTimeZone(uid);
  const UigfData = {
    info: await getUigfHeader(uid, timezone),
    list: convertDataToUigf(gachaList, timezone),
  };
  const filePath = savePath ?? `${await path.appLocalDataDir()}userData\\UIGF_${uid}.json`;
  await writeTextFile(filePath, JSON.stringify(UigfData));
}

/**
 * @description 获取单项UID的UIGF4.0数据
 * @since Beta v0.7.5
 * @param {string} uid - UID
 * @returns {Promise<TGApp.Plugins.UIGF.GachaHk4e>}
 */
export async function getUigf4Item(uid: string): Promise<TGApp.Plugins.UIGF.GachaHk4e> {
  const gachaList = await TSUserGacha.getGachaRecords(uid);
  const timezone = getUigfTimeZone(uid);
  return { uid: uid, timezone: timezone, list: convertDataToUigf(gachaList, timezone) };
}
