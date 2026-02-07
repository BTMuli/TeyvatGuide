/**
 * UIGF工具类
 * @since Beta v0.9.5
 */

import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import TSUserGachaB from "@Sqlm/userGachaB.js";
import { app, path } from "@tauri-apps/api";
import { exists, mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Ajv } from "ajv";
import type { ErrorObject } from "ajv/lib/types/index.js";

import TGLogger from "./TGLogger.js";
import { timestampToDate } from "./toolFunc.js";

import { Uigf4Schema, UigfSchema } from "@/data/index.js";

/**
 * 获取 UIGF 时区
 * @since Beta v0.3.5
 * @param uid - UID
 * @returns 时区
 */
function getUigfTimeZone(uid: string): number {
  if (uid.startsWith("6")) return -5;
  if (uid.startsWith("7")) return 1;
  return 8;
}

/**
 * 传入utc8时间字符串跟目标时区，转成目标时区时间字符串
 * @since Beta v0.7.5
 * @param time - 时间字符串
 * @param timezone - 时区
 * @returns 转换后的时间字符串
 */
function getExportTime(time: string, timezone: number): string {
  const date = new Date(time);
  const diffTimezone = -8 + timezone;
  const realDate = new Date(date.getTime() + diffTimezone * 60 * 60 * 1000);
  return timestampToDate(realDate.getTime());
}

/**
 * 获取 UIGF 头部信息
 * @since Beta v0.7.5
 * @param uid - UID
 * @param timezone - 时区
 * @returns UIGF头部信息
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
 * 获取 UIGF v4.2 头部信息
 * @since Beta v0.9.5
 * @returns UIGF v4.2 头部信息
 */
export async function getUigf4Header(): Promise<TGApp.Plugins.UIGF.Info4> {
  const stamp = Date.now();
  return {
    export_timestamp: Math.floor(stamp / 1000).toString(),
    export_app: "TeyvatGuide",
    export_app_version: await app.getVersion(),
    version: "v4.2",
    lang: "zh-cn",
  };
}

/**
 * 数据库祈愿数据转换为UIGF祈愿数据
 * @since Beta v0.9.5
 * @param data - 数据库祈愿数据
 * @param timezone - 时区
 * @returns UIGF 祈愿数据
 */
function convertHk4e2Uigf(
  data: Array<TGApp.Sqlite.Gacha.Gacha>,
  timezone: number,
): Array<TGApp.Plugins.UIGF.GachaItem> {
  return data.map((gacha) => ({
    gacha_type: gacha.gachaType,
    item_id: gacha.itemId,
    count: gacha.count,
    time: getExportTime(gacha.time, timezone),
    name: gacha.name,
    item_type: gacha.type,
    rank_type: gacha.rank,
    id: gacha.id,
    uigf_gacha_type: gacha.uigfType,
  }));
}

/**
 * 数据库颂愿数据转换为UIGF颂愿数据
 * @since Beta v0.9.5
 * @param data - 数据库颂愿数据
 * @param timezone - 时区
 * @returns UIGF 颂愿数据
 */
function convertUgc2Uigf(
  data: Array<TGApp.Sqlite.Gacha.GachaB>,
  timezone: number,
): Array<TGApp.Plugins.UIGF.GachaItemB> {
  return data.map((gacha) => ({
    id: gacha.id,
    schedule_id: gacha.scheduleId,
    item_type: gacha.type,
    item_id: gacha.itemId,
    item_name: gacha.name,
    rank_type: gacha.rank,
    time: getExportTime(gacha.time, timezone),
    op_gacha_type: gacha.opGachaType,
  }));
}

/**
 * 检测是否是v4版本的UIGF
 * @since Beta v0.9.5
 * @remarks 祈愿&颂愿数据需要进一步确定
 * @param path - UIGF 文件路径
 * @returns 是否是v4，null表示数据异常
 */
export async function checkUigfData(path: string): Promise<boolean | null> {
  try {
    const fileData: string = await readTextFile(path);
    const fileJson = JSON.parse(fileData);
    if (!("info" in fileJson) || typeof fileJson.info !== "object") {
      validateUigf4Data(fileJson);
      return null;
    }
    if ("uigf_version" in fileJson.info) {
      const check = validateUigfData(fileJson);
      if (!check) return null;
      return false;
    }
    const check = validateUigf4Data(fileJson);
    if (!check) return null;
    return true;
  } catch (e) {
    showSnackbar.error(`UIGF校验异常：${e}`);
    await TGLogger.Error(`[checkUigfData]路径:${path}`);
    await TGLogger.Error(`[checkUigfData]异常:${e}`);
    return null;
  }
}

/**
 * 检测是否存在 UIGF 数据，采用 ajv 验证 schema
 * @since Beta v0.6.5
 * @param path - UIGF 数据路径
 * @param isVersion4 - 是否为 UIGF v4.0
 * @returns 是否存在 UIGF 数据
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
 * 验证 UIGF 数据
 * @since Beta v0.5.1
 * @param data - UIGF 数据
 * @returns 是否验证通过
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
 * 验证 UIGF v4.2 数据
 * @since Beta v0.5.0
 * @param data - UIGF 数据
 * @returns 是否验证通过
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
 * 读取 UIGF 数据
 * @since Beta v0.9.5
 * @todo 重构
 * @param userPath - UIGF 数据路径
 * @returns UIGF 数据
 */
export async function readUigfData(userPath: string): Promise<TGApp.Plugins.UIGF.Schema> {
  const fileData: string = await readTextFile(userPath);
  return <TGApp.Plugins.UIGF.Schema>JSON.parse(fileData);
}

/**
 * 读取 UIGF 4.0 数据
 * @since Beta v0.9.5
 * @todo 重构
 * @param userPath - UIGF 数据路径
 * @returns UIGF 数据
 */
export async function readUigf4Data(userPath: string): Promise<TGApp.Plugins.UIGF.Schema4> {
  const fileData: string = await readTextFile(userPath);
  return <TGApp.Plugins.UIGF.Schema4>JSON.parse(fileData);
}

/**
 * 导出 UIGF 数据
 * @since Beta v0.9.5
 * @param uid - UID
 * @param gachaList - 祈愿列表
 * @param savePath - 保存路径
 * @returns 无返回值
 */
export async function exportUigfData(
  uid: string,
  gachaList: Array<TGApp.Sqlite.Gacha.Gacha>,
  savePath?: string,
): Promise<void> {
  const timezone = getUigfTimeZone(uid);
  const UigfData = {
    info: await getUigfHeader(uid, timezone),
    list: convertHk4e2Uigf(gachaList, timezone),
  };
  const filePath =
    savePath ?? `${await path.appLocalDataDir()}userData${path.sep()}UIGF_${uid}.json`;
  await writeTextFile(filePath, JSON.stringify(UigfData));
}

/**
 * 导出UIGF4数据
 * @since Beta v0.9.5
 * @param usg - 祈愿UID列表
 * @param usb - 颂愿UID列表
 * @param savePath - 保存路径
 * @returns
 */
export async function exportUigf4Data(
  usg: Array<string> = [],
  usb: Array<string> = [],
  savePath?: string,
): Promise<void> {
  const header = await getUigf4Header();
  const filePath = savePath ?? `${await path.appLocalDataDir()}userData${path.sep()}UIGF4.json`;
  const dataHk4e: Array<TGApp.Plugins.UIGF.GachaHk4e> = [];
  const dataUgc: Array<TGApp.Plugins.UIGF.GachaUgc> = [];
  for (const uid of usg) {
    const gachaList = await TSUserGacha.record.all(uid);
    await showLoading.update(`正在导出${uid}的${gachaList.length}条祈愿记录`);
    const timezone = getUigfTimeZone(uid);
    dataHk4e.push({ uid: uid, timezone: timezone, list: convertHk4e2Uigf(gachaList, timezone) });
  }
  for (const uid of usb) {
    const gachaList = await TSUserGachaB.getGachaRecords(uid);
    await showLoading.update(`正在导出${uid}的${gachaList.length}条颂愿记录`);
    const timezone = getUigfTimeZone(uid);
    dataUgc.push({ uid: uid, timezone: timezone, list: convertUgc2Uigf(gachaList, timezone) });
  }
  const uigf4Data: TGApp.Plugins.UIGF.Schema4 = { info: header, hk4e: dataHk4e, hk4e_ugc: dataUgc };
  await writeTextFile(filePath, JSON.stringify(uigf4Data, null, 2));
}

/**
 * 备份祈愿数据
 * @since Beta v0.9.5
 * @param dir - 备份目录
 * @returns 无返回值
 */
export async function backUpUigf(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录，即将创建");
    await mkdir(dir, { recursive: true });
  }
  const usg = await TSUserGacha.getUidList();
  const usb = await TSUserGachaB.getUidList();
  // TODO: 调整备份文件名称
  const savePath = `${dir}${path.sep()}UIGF4.json`;
  await exportUigf4Data(usg, usb, savePath);
  await TGLogger.Info("祈愿数据备份完成");
}

/**
 * 恢复祈愿数据-旧版
 * @since Beta v0.9.5
 * @param dir - 目录
 * @param file - 文件名称
 * @returns 是否恢复成功
 */
async function restoreUigfByLegacyFile(dir: string, file: string): Promise<boolean> {
  await showLoading.update(`祈愿文件: ${file}`);
  const filePath = `${dir}${path.sep()}${file}`;
  try {
    const check = await verifyUigfData(filePath);
    if (!check) {
      await showLoading.update(`UIGF数据校验失败`);
      await TGLogger.Warn(`UIGF数据校验失败${filePath}`);
      return false;
    }
    const data = await readUigfData(filePath);
    const uid = data.info.uid;
    await showLoading.update(`正在导入${data.info.uid}的${data.list.length}条祈愿数据`);
    await TSUserGacha.mergeUIGF(uid, data.list, true);
  } catch (e) {
    await TGLogger.Error(`恢复祈愿数据失败${dir}`);
    await TGLogger.Error(typeof e === "string" ? e : JSON.stringify(e));
    return false;
  }
  return true;
}

/**
 * 恢复祈愿数据
 * @since Beta v0.9.5
 * @param filePath - 文件路径
 * @returns 是否恢复成功
 */
async function restoreUigfByFile(filePath: string): Promise<boolean> {
  try {
    const check = await verifyUigfData(filePath, true);
    if (!check) {
      await TGLogger.Warn(`UIGF数据校验失败${filePath}`);
      return false;
    }
    const read = await readUigf4Data(filePath);
    for (const data of read?.hk4e ?? []) {
      await showLoading.update(`正在导入${data.uid}的${data.list.length}条祈愿记录`);
      await TSUserGacha.mergeUIGF4(data, true);
    }
    for (const data of read?.hk4e_ugc ?? []) {
      await showLoading.update(`正在导入${data.uid}的${data.list.length}条颂愿记录`);
      await TSUserGachaB.mergeUIGF4(data, true);
    }
  } catch (e) {
    await TGLogger.Error(`恢复祈愿数据失败 ${filePath}`);
    await TGLogger.Error(typeof e === "string" ? e : JSON.stringify(e));
    return false;
  }
  return true;
}

/**
 * 恢复祈愿数据
 * @since Beta v0.9.5
 * @param dir - 备份目录
 * @returns 是否恢复成功
 */
export async function restoreUigf(dir: string): Promise<boolean> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录");
    return false;
  }
  let cnt = 0;
  // 适配旧版备份文件 UIGF_{{uid}}.json
  const legacyReg = /^UIGF_\d+\.json$/;
  const legacyFiles = (await readDir(dir)).filter(
    (item) => item.isFile && legacyReg.test(item.name),
  );
  for (const file of legacyFiles) {
    const checkL = await restoreUigfByLegacyFile(dir, file.name);
    if (checkL) cnt++;
  }
  const filePath = `${dir}${path.sep()}UIGF4.json`;
  if (!(await exists(filePath))) {
    await TGLogger.Warn(`未检测到UIGF4备份文件`);
  } else {
    await restoreUigfByFile(filePath);
  }
  return cnt > 0;
}
