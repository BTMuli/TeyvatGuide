/**
 * @file plugins/Sqlite/sql/initData.ts
 * @description Sqlite 初始化数据 sql 语句
 * @since Beta v0.6.0
 */

import { app } from "@tauri-apps/api";

import { getBuildTime } from "../../../utils/TGBuild.js";

import initTableSql from "./initTable.js";

/**
 * @description 初始化应用表数据
 * @since Alpha v0.2.2
 * @returns {Promise<string[]>} sql
 */
async function initAppData(): Promise<string[]> {
  const sqlRes: string[] = [];
  const appVersion = await app.getVersion();
  const buildTime: string = getBuildTime();
  // 初始化应用版本
  sqlRes.push(`
      INSERT INTO AppData (key, value, updated)
      VALUES ('appVersion', '${appVersion}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value   = '${appVersion}',
                                     updated = datetime('now', 'localtime');`);
  // 初始化应用数据更新时间
  sqlRes.push(`
      INSERT INTO AppData (key, value, updated)
      VALUES ('dataUpdated', '${buildTime}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value   = '${buildTime}',
                                     updated = datetime('now', 'localtime');`);
  // 初始化 cookie
  sqlRes.push(`
      INSERT INTO AppData (key, value, updated)
      VALUES ('cookie', '{}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO NOTHING;`);
  return sqlRes;
}

/**
 * @description 初始化数据
 * @since Beta v0.4.5
 * @returns {Promise<string[]>} sql
 */
async function initDataSql(): Promise<string[]> {
  const sqlRes: string[] = [];
  sqlRes.push(...initTableSql());
  sqlRes.push(...(await initAppData()));
  return sqlRes;
}

export default initDataSql;
