/**
 * @file data init achievement
 * @description data init achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";

/**
 * @description 成就表参数
 * @since Alpha v0.1.2
 * @returns {BTMuli.Genshin.Base.DBConfig}
 */
export const Config: BTMuli.Genshin.Base.DBConfig = {
  storeName: "Achievements",
  keyPath: "id",
  indexes: ["name", "description", "series", "order", "reward", "version"],
};

/**
 * @description 成就数据
 * @since Alpha v0.1.2
 * @return {BTMuli.Genshin.Achievement[]}
 */
export function getData (): BTMuli.Genshin.Achievement[] {
  const data: Record<number, BTMuli.Genshin.Achievement> = AppData.achievements;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}

/**
 * @description 创建表的 SQLite 语句
 * @since Alpha v0.1.4
 * @todo 外键约束
 * @see BTMuli.Genshin.Achievement
 */
export const CTS: string = `CREATE TABLE IF NOT EXISTS ${Config.storeName} (
    id INTEGER PRIMARY KEY,
    series INTEGER NOT NULL,
    'order' INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward INTEGER NOT NULL,
    completed INTEGER NOT NULL,
    completed_time TEXT NOT NULL,
    progress INTEGER NOT NULL,
    version TEXT NOT NULL
  );`;

/**
 * @description 初始化数据的 SQL 语句
 * @since Alpha v0.1.4
 * @see BTMuli.Genshin.Achievement
 * @returns {string[]}
 */
export function getInsertSqls (): string[] {
  const data = getData();
  const sql: string[] = [];
  data.forEach((item) => {
    const completedTime = item.completed_time ? item.completed_time : "";
    const completed = item.completed ? 1 : 0;
    sql.push(`INSERT INTO ${Config.storeName} VALUES (
      ${item.id},
      ${item.series},
      ${item.order},
      '${item.name}',
      '${item.description}',
      ${item.reward},
      ${completed},
      '${completedTime}',
      ${item.progress},
      '${item.version}'
    )`);
  });
  return sql;
}
