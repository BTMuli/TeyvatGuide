/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { AppData } from "../app";

/**
 * @description 成就系列表参数
 * @since Alpha v0.1.2
 * @returns {BTMuli.Genshin.Base.DBConfig}
 */
export const Config: BTMuli.Genshin.Base.DBConfig = {
  storeName: "AchievementSeries",
  keyPath: "id",
  indexes: ["order", "name", "card"],
};

/**
 * @description 成就系列数据
 * @since Alpha v0.1.2
 * @return {BTMuli.Genshin.AchievementSeries[]}
 */
export function getData (): BTMuli.Genshin.AchievementSeries[] {
  const data: Record<number, BTMuli.Genshin.AchievementSeries> = AppData.achievementSeries;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}

/**
 * @description 创建表的 SQL 语句
 * @since Alpha v0.1.4
 * @see BTMuli.Genshin.AchievementSeries
 * @returns {string}
 */
export const CTS = `CREATE TABLE  IF NOT EXISTS ${Config.storeName} (
    id INTEGER PRIMARY KEY,
    'order' INTEGER NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    total INTEGER NOT NULL,
    finished INTEGER NOT NULL,
    card TEXT NOT NULL,
    icon TEXT NOT NULL
  );`;

/**
 * @description 初始化数据的 SQL 语句
 * @since Alpha v0.1.4
 * @see BTMuli.Genshin.AchievementSeries
 * @returns {string[]}
 */
export function getInsertSqls (): string[] {
  const data = getData();
  const sql: string[] = [];
  data.forEach((item) => {
    const card = item.card ? item.card : "";
    sql.push(`INSERT INTO ${Config.storeName} VALUES (
      ${item.id},
      ${item.order},
      "${item.name}",
      "${item.version}",
      ${item.total_count},
      ${item.completed_count},
      "${card}",
      "${item.icon}"
    )`);
  });
  return sql;
}
