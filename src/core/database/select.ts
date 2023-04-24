/**
 * @file core database select.ts
 * @description SQLite 数据库查询操作封装模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri
import Database from "tauri-plugin-sql-api";
// local
import { sqlitePath } from "./init";

/**
 * @description 返回所有成就系列数据
 * @since Alpha v0.1.4
 * @returns {Promise<BTMuli.SQLite.AchievementSeries[]>}
 */
export async function getAllSeries (): Promise<BTMuli.SQLite.AchievementSeries[]> {
  const db = await Database.load(sqlitePath);
  const sql = "SELECT * FROM AchievementSeries ORDER BY `order` ASC";
  const result = await db.select(sql);
  await db.close();
  return result as BTMuli.SQLite.AchievementSeries[];
}

/**
 * @description 查询成就数据，无参默认查询所有成就
 * @since Alpha v0.1.4
 * @param {number} series
 * @returns {Promise<BTMuli.SQLite.Achievements[]>}
 */
export async function getAchievementsBySeries (series?: number): Promise<BTMuli.SQLite.Achievements[]> {
  const db = await Database.load(sqlitePath);
  let sql;
  // 无参默认查询所有成就
  if (!series) {
    sql = "SELECT * FROM Achievements";
  } else {
    sql = `SELECT * FROM Achievements WHERE series = ${series}`;
  }
  const result = await db.select(sql);
  await db.close();
  return result as BTMuli.SQLite.Achievements[];
}

/**
 * @description 条件查询
 * @since Alpha v0.1.4
 * @param {string} search
 * @returns {Promise<BTMuli.SQLite.Achievements[]>}
 */
export async function searchAchievement (search: string): Promise<BTMuli.SQLite.Achievements[]> {
  const db = await Database.load(sqlitePath);
  const sql = `SELECT * FROM Achievements WHERE name LIKE '%${search}%' AND description LIKE '%${search}%'`;
  const result = await db.select(sql);
  await db.close();
  return result as BTMuli.SQLite.Achievements[];
}

/**
 * @description 返回成就概况
 * @since Alpha v0.1.4
 * @returns {Promise<{total: number, fin:number}>}
 */
export async function getAchievementOverview (): Promise<{ total: number, fin: number }> {
  const db = await Database.load(sqlitePath);
  const sql = "SELECT COUNT(*) AS total, SUM(isCompleted) AS fin FROM Achievements";
  const res: Array<{ total: number, fin: number }> = await db.select(sql);
  await db.close();
  return res[0];
}
