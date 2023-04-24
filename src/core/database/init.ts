/**
 * @file core database init.ts
 * @description SQLite 数据库初始化
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri
import Database from "tauri-plugin-sql-api";
// sql
import initSql from "./init.sql?raw";
// local
import { TGAppData } from "../../data";

export const sqlitePath = "sqlite:tauri-genshin.db";
export const sqliteTBList = ["Achievements", "AchievementSeries"];
export const sqliteTGList = ["SeriesInsert", "SeriesUpdate", "AchievementInsert", "AchievementUpdate"];

/**
 * @description 初始化数据库
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function initDatabase (): Promise<void> {
  const db = await Database.load(sqlitePath);
  // 初始化表格、触发器
  await db.execute(initSql);
  // 初始化数据
  await insertData(db);
  await db.close();
}

/**
 * @description 初始化数据
 * @since Alpha v0.1.4
 * @param {Database} db
 * @returns {Promise<void>}
 */
async function insertData (db: Database): Promise<void> {
  // 插入成就系列数据
  await Promise.all(Object.values(TGAppData.achievementSeries).map(async (item) => {
    let sql;
    if (item.card) {
      sql = `INSERT INTO AchievementSeries (id, \`order\`, name, version, icon, nameCard) VALUES (${item.id}, ${item.order}, '${item.name}', '${item.version}', '${item.icon}', '${item.card}')`;
    } else {
      sql = `INSERT INTO AchievementSeries (id, \`order\`, name, version, icon, nameCard) VALUES (${item.id}, ${item.order}, '${item.name}', '${item.version}', '${item.icon}', NULL)`;
    }
    await db.execute(sql);
  },
  ));
  // 插入成就数据
  await Promise.all(Object.values(TGAppData.achievements).map(async (item) => {
    const sql = `INSERT INTO Achievements (id, series, \`order\`, name, description, reward, version) VALUES (${item.id}, ${item.series}, ${item.order}, '${item.name}', '${item.description}', ${item.reward}, '${item.version}')`;
    await db.execute(sql);
  },
  ));
};

/**
 * @description 删除所有数据，重新创建数据
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function resetDatabase (): Promise<void> {
  const db = await Database.load(sqlitePath);
  // 删除所有触发器
  await Promise.all(sqliteTGList.map(async (trigger) => {
    await db.execute(`DROP TRIGGER IF EXISTS ${trigger}`);
  }));
  // 删除所有表格
  await Promise.all(sqliteTBList.map(async (table) => {
    await db.execute(`DROP TABLE IF EXISTS ${table}`);
  }));
  await db.close();
  await initDatabase();
}

/**
 * @description 检测表单是否完整
 * @since Alpha v0.1.4
 * @returns {Promise<boolean>}
 */
export async function checkDatabase (): Promise<boolean> {
  const db = await Database.load(sqlitePath);
  // 获取所有表格
  const tables: Array<{ name: string }> = await db.select("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  // 获取所有触发器
  const triggers: Array<{ name: string }> = await db.select("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name");
  await db.close();
  let res;
  if (tables.length !== sqliteTBList.length || triggers.length !== sqliteTGList.length) {
    res = false;
  } else if (tables.every((item) => sqliteTBList.includes(item.name)) && triggers.every((item) => sqliteTGList.includes(item.name))) {
    res = true;
  } else {
    res = false;
  }
  return res;
}
