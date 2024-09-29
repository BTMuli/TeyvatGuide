/**
 * @file plugins/Sqlite/modules/userAchi.ts
 * @description 用户成就模块
 * @since Beta v0.6.0
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import { AppAchievementsData, AppAchievementSeriesData } from "../../../data/index.js";
import TGLogger from "../../../utils/TGLogger.js";
import { timestampToDate } from "../../../utils/toolFunc.js";
import TGSqlite from "../index.js";

/**
 * @description 根据 completed 跟 progress 获取 status
 * @since Beta v0.6.0
 * @param {boolean} completed - 是否完成
 * @param {number} progress - 进度
 * @returns {number} status
 */
function getUiafStatus(completed: boolean, progress: number): number {
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
 * @description 获取最新成就版本
 * @since Beta v0.6.0
 * @returns {string} 最新成就版本
 */
function getLatestAchiVersion(): string {
  let maxVersion = "0";
  for (const series of AppAchievementSeriesData) {
    if (series.version > maxVersion) maxVersion = series.version;
  }
  return maxVersion;
}

/**
 * @description 获取成就系列概况
 * @since Beta v0.6.0
 * @param {number} uid - 存档UID
 * @param {[number]} series - 系列ID
 * @returns {Promise<TGApp.Sqlite.Achievement.Overview>}
 */
async function getOverview(
  uid: number,
  series?: number,
): Promise<TGApp.Sqlite.Achievement.Overview> {
  const db = await TGSqlite.getDB();
  let totalAchi: number[] = [];
  if (series === undefined) {
    totalAchi = AppAchievementsData.map((i) => i.id);
  } else {
    totalAchi = AppAchievementsData.filter((s) => s.series === series).map((i) => i.id);
  }
  const finAchi = (
    await db.select<TGApp.Sqlite.Achievement.TableAchi[]>(
      "SELECT * FROM Achievements WHERE uid = ? AND isCompleted = 1;",
      [uid],
    )
  ).filter((i) => totalAchi.includes(i.id));
  return { total: totalAchi.length, fin: finAchi.length };
}

/**
 * @description 合并成就数据
 * @since Beta v0.6.0
 * @param {TGApp.App.Achievement.Item} raw - 元数据
 * @param {[TGApp.Sqlite.Achievement.TableAchi]} data - 数据库数据
 * @param {[number]} uid - 存档 UID
 * @return {TGApp.Sqlite.Achievement.RenderAchi} - 渲染数据
 */
function getRenderAchi(
  raw: TGApp.App.Achievement.Item,
  uid?: number,
  data?: TGApp.Sqlite.Achievement.TableAchi,
): TGApp.Sqlite.Achievement.RenderAchi {
  const emptyAchi: TGApp.Sqlite.Achievement.TableAchi = {
    id: 0,
    uid: uid ?? 0,
    isCompleted: 0,
    completedTime: "",
    progress: 0,
    updated: "",
  };
  const achiData = data ?? emptyAchi;
  return {
    id: raw.id,
    uid: achiData.uid,
    order: raw.order,
    series: raw.series,
    name: raw.name,
    description: raw.description,
    reward: raw.reward,
    version: raw.version,
    trigger: raw.trigger,
    isCompleted: achiData.isCompleted === 1,
    completedTime: achiData.completedTime,
    progress: achiData.progress,
    updated: achiData.updated,
  };
}

/**
 * @description 获取单个成就
 * @since Beta v0.6.0
 * @param {number} uid - 存档 UID
 * @param {number} id - 成就 ID
 * @returns {Promise<TGApp.Sqlite.Achievement.TableAchi|false>}
 */
async function getAchi(
  uid: number,
  id: number,
): Promise<TGApp.Sqlite.Achievement.TableAchi | false> {
  const db = await TGSqlite.getDB();
  const res = await db.select<TGApp.Sqlite.Achievement.TableAchi[]>(
    "SELECT * FROM Achievements WHERE uid = ? AND id = ?;",
    [uid, id],
  );
  if (res.length === 0) return false;
  return res[0];
}

/**
 * @description 获取成就数据
 * @since Beta v0.6.0
 * @param {number} uid - 存档 UID
 * @param {[number]} series - 成就系列ID
 * @returns {Promise<TGApp.Sqlite.Achievement.RenderAchi[]>} 成就数据
 */
async function getAchievements(
  uid: number,
  series?: number,
): Promise<TGApp.Sqlite.Achievement.RenderAchi[]> {
  const db = await TGSqlite.getDB();
  const res: TGApp.Sqlite.Achievement.RenderAchi[] = [];
  const userData = await db.select<TGApp.Sqlite.Achievement.TableAchi[]>(
    "SELECT * FROM Achievements WHERE uid = ?;",
    [uid],
  );
  let rawData: TGApp.App.Achievement.Item[];
  if (series === undefined || series === -1) rawData = AppAchievementsData;
  else rawData = AppAchievementsData.filter((a) => a.series === series);
  for (const achi of rawData) {
    const achiFind = userData.find((u) => u.id === achi.id);
    const achievement = getRenderAchi(achi, uid, achiFind);
    res.push(achievement);
  }
  res.sort(
    (a, b) => a.isCompleted.toString().localeCompare(b.isCompleted.toString()) || a.order - b.order,
  );
  return res;
}

/**
 * @description 查找成就数据
 * @since Beta v0.6.0
 * @param {number} uid - 存档 UID
 * @param {string} keyword - 关键词
 * @returns {Promise<TGApp.Sqlite.Achievement.RenderAchi[]>} 成就数据
 */
async function searchAchi(
  uid: number,
  keyword: string,
): Promise<TGApp.Sqlite.Achievement.RenderAchi[]> {
  if (keyword === "") return await getAchievements(uid);
  const versionReg = /^v\d+(\.\d+)?$/;
  let rawData: TGApp.App.Achievement.Item[];
  const res: TGApp.Sqlite.Achievement.RenderAchi[] = [];
  if (versionReg.test(keyword)) {
    const version = keyword.replace("v", "");
    rawData = AppAchievementsData.filter((i) => i.version.includes(version));
  } else {
    rawData = AppAchievementsData.filter((a) => {
      if (a.name.includes(keyword)) return true;
      if (a.description.includes(keyword)) return true;
    });
  }
  for (const data of rawData) {
    const achiFind = await getAchi(uid, data.id);
    let achievement: TGApp.Sqlite.Achievement.RenderAchi;
    if (achiFind === false) achievement = getRenderAchi(data, uid);
    else achievement = getRenderAchi(data, uid, achiFind);
    res.push(achievement);
  }
  res.sort(
    (a, b) => a.isCompleted.toString().localeCompare(b.isCompleted.toString()) || a.order - b.order,
  );
  return res;
}

/**
 * @description 更新成就数据
 * @since Beta v0.6.0
 * @param {TGApp.Sqlite.Achievement.RenderAchi} data 成就数据
 * @returns {Promise<void>}
 */
async function updateAchi(data: TGApp.Sqlite.Achievement.RenderAchi): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(
    "INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, updated) \
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id,uid) DO UPDATE \
      SET isCompleted=?,completedTime=?,progress=?,updated=?;",
    [
      data.id,
      data.uid,
      data.isCompleted ? 1 : 0,
      data.completedTime,
      data.progress,
      timestampToDate(new Date().getTime()),
      data.isCompleted ? 1 : 0,
      data.completedTime,
      data.progress,
      timestampToDate(new Date().getTime()),
    ],
  );
}

/**
 * @description 将数据库数据转换为UIAF数据
 * @since Beta v0.6.0
 * @param {TGApp.Sqlite.Achievement.TableAchi} data 数据库数据
 * @returns {TGApp.Plugins.UIAF.Achievement} UIAF数据
 */
function transDb2Uiaf(data: TGApp.Sqlite.Achievement.TableAchi): TGApp.Plugins.UIAF.Achievement {
  let timestamp = 0;
  if (data.isCompleted === 1) timestamp = Math.floor(new Date(data.completedTime).getTime() / 1000);
  const status = getUiafStatus(data.isCompleted === 1, data.progress);
  return {
    id: data.id,
    timestamp: timestamp,
    current: data.progress,
    status,
  };
}

/**
 * @description 获取指定Uid的UIAF数据
 * @since Beta v0.6.0
 * @param {number} uid - 存档UID
 * @returns {Promise<TGApp.Plugins.UIAF.Achievement[]>}
 */
async function getUiafData(uid: number): Promise<TGApp.Plugins.UIAF.Achievement[]> {
  const db = await TGSqlite.getDB();
  const data = await db.select<TGApp.Sqlite.Achievement.TableAchi[]>(
    "SELECT * FROM Achievements WHERE uid=?;",
    [uid],
  );
  const res: TGApp.Plugins.UIAF.Achievement[] = [];
  for (const item of data) {
    res.push(transDb2Uiaf(item));
  }
  return res;
}

/**
 * @description 获取所有存档 uid
 * @since Beta v0.6.0
 * @return {Promise<Array<number>>}
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM Achievements;");
  return res.map((i) => i.uid);
}

/**
 * @description 备份成就数据
 * @since Beta v0.6.0
 * @param {string} dir - 存档数据
 * @param {number} uid - 存档UID，未指定则导出所有
 * @returns {Promise<void>}
 */
async function backupUiaf(dir: string, uid?: number): Promise<void> {
  let uidList = [];
  if (uid === undefined) uidList = await getAllUid();
  else uidList.push(uid);
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的成就备份目录，即将创建");
    await mkdir(dir, { recursive: true });
  }
  for (const uidItem of uidList) {
    const data = await getUiafData(uidItem);
    const fileName = `UIAF_${uidItem}`;
    await writeTextFile(`${dir}${path.sep()}${fileName}.json`, JSON.stringify(data, null, 2));
    await TGLogger.Info(`成功备份${uidItem}的成就存档`);
  }
}

/**
 * @description 恢复成就数据
 * @since Beta v0.6.0
 * @param {string} dir - 数据目录
 * @returns {Promise<boolean>}
 */
async function restoreUiaf(dir: string): Promise<boolean> {
  if (!(await exists(dir))) return false;
  const filesRead = await readDir(dir);
  // 校验 UIAF_xxx.json 文件
  const fileRegex = /^UIAF_\d+\.json$/;
  const files = filesRead.filter((item) => item.isFile && fileRegex.test(item.name));
  if (files.length === 0) return false;
  for (const file of files) {
    try {
      const uid = parseInt(file.name.replace("UIAF_", "").replace(".json", ""));
      const filePath = `${dir}${path.sep()}${file.name}`;
      const data: TGApp.Plugins.UIAF.Achievement[] = JSON.parse(await readTextFile(filePath));
      await TSUserAchi.mergeUiaf(data, uid);
    } catch (e) {
      await TGLogger.Error(`[UIAF][RESTORE] 恢复成就数据${file.name} `);
      await TGLogger.Error(`${e}`);
      return false;
    }
  }
  return true;
}

/**
 * @description 导入Uiaf数据
 * @since Beta v0.6.0
 * @param {TGApp.Plugins.UIAF.Achievement[]} data - 成就数据
 * @param {number} uid - 存档UID
 * @returns {Promise<void>}
 */
async function mergeUiaf(data: TGApp.Plugins.UIAF.Achievement[], uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const achi of data) {
    const status = achi.status === 2 || achi.status === 3 ? 1 : 0;
    const timeC = status === 1 ? timestampToDate(achi.timestamp * 1000) : "";
    const timeN = timestampToDate(new Date().getTime());
    await db.execute(
      "INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, updated) \
    VALUES (?,?,?,?,?,?) ON CONFLICT(id,uid) DO UPDATE  SET\
    isCompleted=?,completedTime=?,progress=?,updated=?;",
      [achi.id, uid, status, timeC, achi.current, timeN, status, timeC, achi.current, timeN],
    );
  }
}

/**
 * @description 删除指定 UID 存档的数据
 * @since Beta v0.6.0
 * @param {number} uid - 存档UID
 * @returns {Promise<void>}
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM Achievements WHERE uid=?;", [uid]);
}

const TSUserAchi = {
  getLatestAchiVersion,
  getOverview,
  getAchievements,
  getAllUid,
  getUiafData,
  searchAchi,
  updateAchi,
  mergeUiaf,
  backupUiaf,
  restoreUiaf,
  delUid,
};

export default TSUserAchi;
