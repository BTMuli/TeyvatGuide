/**
 * Sqlite 初始化数据 sql 语句
 * @since Beta v0.9.1
 */

import { app } from "@tauri-apps/api";

import createTable from "./createTable.sql?raw";

/**
 * 初始化应用表数据
 * @since Alpha v0.2.2
 * @returns sql
 */
async function initAppData(): Promise<Array<string>> {
  const sqlRes: Array<string> = [];
  const appVersion = await app.getVersion();
  // @ts-expect-error import.meta
  const buildTime: string = import.meta.VITE_SENTRY_RELEASE;
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
 * 初始化数据
 * @since Beta v0.7.2
 * @returns sql
 */
async function initDataSql(): Promise<Array<string>> {
  const sqlRes: Array<string> = [];
  sqlRes.push(createTable);
  sqlRes.push(...(await initAppData()));
  return sqlRes;
}

export default initDataSql;
