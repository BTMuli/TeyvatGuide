/**
 * @file plugins/Sqlite/sql/initData.ts
 * @description Sqlite 初始化数据 sql 语句
 * @since Beta v0.4.5
 */

import { app } from "@tauri-apps/api";

import initTableSql from "./initTable";
import {
  insertAchievementData,
  insertAchievementSeriesData,
  insertNameCardData,
  insertCharacterData,
} from "./insertData";
import {
  AppAchievementsData,
  AppAchievementSeriesData,
  AppNameCardsData,
  AppCharacterData,
} from "../../../data";
import { getBuildTime } from "../../../utils/TGBuild";

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
 * @description 初始化成就系列数据
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
function initAchievementSeriesData(): string[] {
  return AppAchievementSeriesData.map((item) => insertAchievementSeriesData(item));
}

/**
 * @description 初始化成就数据
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
function initAchievementData(): string[] {
  return AppAchievementsData.map((item) => insertAchievementData(item));
}

/**
 * @description 初始化应用名片数据
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
function initNameCardData(): string[] {
  return AppNameCardsData.map((item) => insertNameCardData(item));
}

/**
 * @description 初始化角色数据
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
function initCharacterData(): string[] {
  return AppCharacterData.map((item) => insertCharacterData(item));
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
  sqlRes.push(...initAchievementSeriesData());
  sqlRes.push(...initAchievementData());
  sqlRes.push(...initNameCardData());
  sqlRes.push(...initCharacterData());
  return sqlRes;
}

export default initDataSql;
