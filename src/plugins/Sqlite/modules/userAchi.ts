/**
 * @file plugins/Sqlite/modules/userAchi.ts
 * @description 用户成就模块
 * @since Beta v0.4.8
 */

import { getUiafStatus } from "../../../utils/UIAF.js";
import TGSqlite from "../index";
import { importUIAFData } from "../sql/updateData";

/**
 * @description 获取成就概况
 * @since Beta v0.4.7
 * @returns {Promise<TGApp.Sqlite.Achievement.Overview}> 成就概况
 */
async function getOverview(): Promise<TGApp.Sqlite.Achievement.Overview> {
  const db = await TGSqlite.getDB();
  const res = await db.select<TGApp.Sqlite.Achievement.Overview>(
    "SELECT SUM(totalCount) as total,SUM(finCount) AS fin From AchievementSeries",
  );
  return res[0];
}

/**
 * @description 获取最新成就版本
 * @since Beta v0.4.7
 * @returns {Promise<string>} 最新成就版本
 */
async function getLatestAchiVersion(): Promise<string> {
  const db = await TGSqlite.getDB();
  type resType = { version: string };
  const res = await db.select<resType>(
    "SELECT version FROM Achievements ORDER BY version DESC LIMIT 1;",
  );
  return res[0].version;
}

/**
 * @description 获取成就系列数据
 * @since Beta v0.4.7
 * @param {number|undefined} id 成就系列ID
 * @returns {Promise<TGApp.Sqlite.Achievement.SeriesTable[]>} 成就系列数据
 */
async function getSeries(id?: number): Promise<TGApp.Sqlite.Achievement.SeriesTable[]> {
  const db = await TGSqlite.getDB();
  let res: TGApp.Sqlite.Achievement.SeriesTable[];
  if (id === undefined) {
    res = await db.select<TGApp.Sqlite.Achievement.SeriesTable>(
      "SELECT * FROM AchievementSeries ORDER BY `order`;",
    );
  } else {
    res = await db.select<TGApp.Sqlite.Achievement.SeriesTable>(
      "SELECT * FROM AchievementSeries WHERE id = ?;",
      [id],
    );
  }
  return res;
}

/**
 * @description 获取成就数据
 * @since Beta v0.4.8
 * @param {number|undefined} id 成就系列ID
 * @returns {Promise<TGApp.Sqlite.Achievement.SingleTable[]>} 成就数据
 */
async function getAchievements(id?: string): Promise<TGApp.Sqlite.Achievement.SingleTable[]> {
  const db = await TGSqlite.getDB();
  let res: TGApp.Sqlite.Achievement.SingleTable[];
  if (id === undefined) {
    res = await db.select<TGApp.Sqlite.Achievement.SingleTable>(
      "SELECT * FROM Achievements ORDER BY isCompleted,`order`;",
    );
  } else {
    res = await db.select<TGApp.Sqlite.Achievement.SingleTable>(
      "SELECT * FROM Achievements WHERE series = ? ORDER BY isCompleted,`order`;",
      [id],
    );
  }
  return res;
}

/**
 * @description 获取成就名片
 * @since Beta v0.4.7
 * @param {string} id 成就系列ID
 * @returns {Promise<string>} 成就名片
 */
async function getSeriesNameCard(id: string): Promise<string> {
  const db = await TGSqlite.getDB();
  type resType = { nameCard: string };
  const res = await db.select<resType>("SELECT nameCard FROM AchievementSeries WHERE id = ?;", [
    id,
  ]);
  return res[0].nameCard;
}

/**
 * @description 查找成就数据
 * @since Beta v0.4.8
 * @param {string} keyword 关键词
 * @returns {Promise<TGApp.Sqlite.Achievement.SingleTable[]>} 成就数据
 */
async function searchAchievements(
  keyword: string,
): Promise<TGApp.Sqlite.Achievement.SingleTable[]> {
  if (keyword === "") return await getAchievements();
  const db = await TGSqlite.getDB();
  const versionReg = /^v\d+(\.\d+)?$/;
  if (versionReg.test(keyword)) {
    const version = keyword.replace("v", "");
    return await db.select<TGApp.Sqlite.Achievement.SingleTable>(
      "SELECT * FROM Achievements WHERE version LIKE ? ORDER BY isCompleted,`order`;",
      [`%${version}%`],
    );
  }
  return await db.select<TGApp.Sqlite.Achievement.SingleTable>(
    "SELECT * FROM Achievements WHERE name LIKE ? OR description LIKE ? ORDER BY isCompleted,`order`;",
    [`%${keyword}%`, `%${keyword}%`],
  );
}

/**
 * @description 更新成就数据
 * @since Beta v0.4.7
 * @param {TGApp.Sqlite.Achievement.SingleTable} data UIAF数据
 * @returns {Promise<void>}
 */
async function updateAchievement(data: TGApp.Sqlite.Achievement.SingleTable): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("UPDATE Achievements SET isCompleted = ?, completedTime = ? WHERE id = ?;", [
    data.isCompleted,
    data.completedTime.toString(),
    data.id,
  ]);
}

/**
 * @description 将数据库数据转换为UIAF数据
 * @since Beta v0.4.7
 * @param {TGApp.Sqlite.Achievement.SingleTable} data 数据库数据
 * @returns {TGApp.Plugins.UIAF.Achievement} UIAF数据
 */
function transDb2Uiaf(data: TGApp.Sqlite.Achievement.SingleTable): TGApp.Plugins.UIAF.Achievement {
  const isCompleted = data.isCompleted === 1;
  let timestamp = 0;
  if (isCompleted) timestamp = new Date(data.completedTime).getTime();
  const status = getUiafStatus(isCompleted, data.progress);
  return {
    id: data.id,
    timestamp: timestamp,
    current: data.progress,
    status,
  };
}

/**
 * @description 获取UIAF数据
 * @since Beta v0.4.7
 * @returns {Promise<TGApp.Plugins.UIAF.Achievement[]>}
 */
async function getUIAF(): Promise<TGApp.Plugins.UIAF.Achievement[]> {
  const db = await TGSqlite.getDB();
  const data = await db.select<TGApp.Sqlite.Achievement.SingleTable>("SELECT * FROM Achievements;");
  const res: TGApp.Plugins.UIAF.Achievement[] = [];
  for (const item: TGApp.Sqlite.Achievement.SingleTable of data) {
    res.push(transDb2Uiaf(item));
  }
  return res;
}

/**
 * @description 合并UIAF数据
 * @since Beta v0.4.7
 * @param {TGApp.Plugins.UIAF.Achievement[]} data UIAF数据
 * @returns {Promise<void>}
 */
async function mergeUIAF(data: TGApp.Plugins.UIAF.Achievement[]): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const item of data) {
    const sql = importUIAFData(item);
    await db.execute(sql);
  }
}

const TSUserAchi = {
  getOverview,
  getLatestAchiVersion,
  getSeries,
  getSeriesNameCard,
  getAchievements,
  searchAchievements,
  updateAchievement,
  getUIAF,
  mergeUIAF,
};

export default TSUserAchi;
