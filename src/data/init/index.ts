/**
 * @file data init index
 * @description data init index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri-pligin
import Database from "tauri-plugin-sql-api";
// local-data
import { Config as AchievementsConfig, getData as getAchievementsData, CTS as ctsAchievement, getInsertSqls as gisAchievement } from "./achievements";
import { Config as SeriesConfig, getData as getSeriesData, CTS as ctsSeries, getInsertSqls as gisSeries } from "./achievementSeries";

export const SqlitePath = "sqlite:tauri-genshin.db";

export const ConfigList = [AchievementsConfig, SeriesConfig];

export const getDataList = [
  {
    name: "Achievements",
    data: getAchievementsData(),
  },
  {
    name: "AchievementSeries",
    data: getSeriesData(),
  },
];

/**
 * @description 初始化数据表
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function initDBT (): Promise<void> {
  const SQlite = await Database.load(SqlitePath);
  // 创建表
  await SQlite.execute(ctsSeries);
  console.log("AchievementSeries 表创建成功");
  await SQlite.execute(ctsAchievement);
  console.log("Achievements 表创建成功");
  // 初始化数据
  const sqls = gisAchievement().concat(gisSeries());
  sqls.map(async (sql) => {
    console.log(sql);
    await SQlite.execute(sql);
  });
  await SQlite.close();
}
