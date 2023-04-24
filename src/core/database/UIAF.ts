/**
 * @file core database UIAF.ts
 * @description UIAF 数据导入导出
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri
import Database from "tauri-plugin-sql-api";
// local
import { sqlitePath } from "./init";
// utils
import { timestampToDate, getUiafStatus } from "../../utils/UIAF";

/**
 * @description 根据本地数据跟导入数据获取更新 SQL
 * @since Alpha v0.1.4
 * @param {TGPlugin.UIAF.Achievement} importData - 导入数据
 * @param {BTMuli.SQLite.Achievements} localData - 本地数据
 * @returns {string} SQL
 */
function getUpdateSql (importData: TGPlugin.UIAF.Achievement, localData: BTMuli.SQLite.Achievements): string {
  // 如果本地为未完成状态，直接更新
  if (localData.isCompleted === 0) {
    // 已完成
    if (importData.status === 2 || importData.status === 3) {
      const completedTime = timestampToDate(importData.timestamp);
      return `UPDATE Achievements SET isCompleted = 1, progress = ${importData.current}, completedTime = '${completedTime}' WHERE id = ${importData.id}`;
    } else if (importData.current > localData.progress) {
      return `UPDATE Achievements SET progress = ${importData.current} WHERE id = ${importData.id}`;
    } else {
      return "";
    }
  } else {
    // 本地为已完成状态，判断进度
    if (importData.current > localData.progress) {
      // 进度大于本地进度，更新
      return `UPDATE Achievements SET progress = ${importData.current} WHERE id = ${importData.id}`;
    } else {
      return "";
    }
  }
}

/**
 * @description 导入 UIAF 数据,更新数据库
 * @since Alpha v0.1.4
 * @param {TGPlugin.UIAF.Achievement[]} achievements - 成就列表
 * @returns {Promise<void>}
 */
export async function importUIAFData (achievements: TGPlugin.UIAF.Achievement[]): Promise<void> {
  const db = await Database.load(sqlitePath);
  for (const achievement of achievements) {
    const id = achievement.id;
    const selects: BTMuli.SQLite.Achievements[] = await db.select(`SELECT * FROM Achievements WHERE id = ${id}`);
    if (selects.length === 1) {
      const sql = getUpdateSql(achievement, selects[0]);
      if (sql !== "") await db.execute(sql);
    }
  }
  await db.close();
}

/**
 * @description 导出 UIAF 数据
 * @since Alpha v0.1.4
 * @returns {Promise<TGPlugin.UIAF.Achievement[]>}
 */
export async function exportUIAFData (): Promise<TGPlugin.UIAF.Achievement[]> {
  const db = await Database.load(sqlitePath);
  const sql = "SELECT * FROM Achievements WHERE isCompleted = 1 OR progress > 0";
  const selects: BTMuli.SQLite.Achievements[] = await db.select(sql);
  await db.close();
  const achievements: TGPlugin.UIAF.Achievement[] = [];
  for (const select of selects) {
    const completed = select.isCompleted === 1;
    const status = getUiafStatus(completed, select.progress);
    achievements.push({
      id: select.id,
      status,
      timestamp: completed && select.completedTime ? Math.round(new Date(select.completedTime).getTime() / 1000) : 0,
      current: select.progress,
    });
  }
  return achievements;
}
