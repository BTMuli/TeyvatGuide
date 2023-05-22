/**
 * @file utils TGSql.ts
 * @description 数据库sql语句
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { app } from "@tauri-apps/api";
import { getBuildTime } from "./TGBuild";
import { TGAppData } from "../data";

/**
 * @description 初始化应用数据表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initAppTable (): string[] {
  const sqlRes = [];
  // 创建应用数据表
  sqlRes.push(`
    CREATE TABLE IF NOT EXISTS AppData
    (
        key     TEXT    PRIMARY KEY,
        value   TEXT    DEFAULT NULL,
        updated TEXT    DEFAULT NULL
    );
  `);
  return sqlRes;
}

/**
 * @description 初始化游戏账号数据表
 * @since Alpha v0.2.0
 * @see BTMuli.User.Game.Account
 * @returns {string[]} sql
 */
function initGameAccountTable (): string[] {
  const sqlRes = [];
  // 创建游戏账号数据表
  sqlRes.push(`
    CREATE TABLE IF NOT EXISTS GameAccount
    (
      game_biz    TEXT NOT NULL,
      game_uid    TEXT NOT NULL,
      is_chosen   BOOLEAN DEFAULT 0,
      is_official BOOLEAN DEFAULT 0,
      level      INTEGER DEFAULT 0,
      nickname   TEXT    DEFAULT NULL,
      region     TEXT    DEFAULT NULL,
      region_name TEXT    DEFAULT NULL,
      updated    TEXT    DEFAULT NULL,
      PRIMARY KEY (game_biz, game_uid)
    );
  `);
  return sqlRes;
}

/**
 * @description 初始化成就系列数据表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initAchievementSeriesTable (): string[] {
  const sqlRes = [];
  // 创建成就系列数据表
  sqlRes.push(`
      CREATE TABLE IF NOT EXISTS AchievementSeries
    (
        id         INTEGER PRIMARY KEY,
        "order"    INTEGER,
        name       TEXT    DEFAULT NULL,
        version    TEXT    DEFAULT NULL,
        totalCount INTEGER DEFAULT 0,
        finCount   INTEGER DEFAULT 0,
        icon       TEXT    NOT NULL,
        nameCard   TEXT    NOT NULL,
        updated    TEXT    DEFAULT NULL
    );
  `);
  return sqlRes;
}

/**
 * @description 初始化成就数据表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initAchievementTable (): string[] {
  const sqlRes = [];
  // 创建成就数据表
  sqlRes.push(`
      CREATE TABLE IF NOT EXISTS Achievements
    (
        id            INTEGER PRIMARY KEY,
        series        INTEGER,
        "order"       INTEGER,
        name          TEXT    DEFAULT NULL,
        description   TEXT    DEFAULT NULL,
        reward        INTEGER DEFAULT 0,
        isCompleted   BOOLEAN DEFAULT 0,
        completedTime TEXT    DEFAULT NULL,
        progress      INTEGER DEFAULT 0,
        version       TEXT    DEFAULT NULL,
        updated       TEXT    DEFAULT NULL
    );
  `);
  // 创建触发器
  sqlRes.push(`
    CREATE TRIGGER IF NOT EXISTS updateAchievement
      AFTER UPDATE ON Achievements
      FOR EACH ROW
      BEGIN
          UPDATE AchievementSeries SET finCount = finCount + 1, updated = datetime('now', 'localtime')
          WHERE id = NEW.series AND NEW.isCompleted = 1 AND OLD.isCompleted = 0;
          UPDATE AchievementSeries SET finCount = finCount - 1, updated = datetime('now', 'localtime')
          WHERE id = NEW.series AND NEW.isCompleted = 0 AND OLD.isCompleted = 1;
      END;
  `);
  sqlRes.push(`
    CREATE TRIGGER IF NOT EXISTS insertAchievement
      AFTER INSERT ON Achievements
      FOR EACH ROW
      BEGIN
          UPDATE AchievementSeries SET totalCount = totalCount + 1, updated = datetime('now', 'localtime')
          WHERE id = NEW.series;
          UPDATE AchievementSeries SET version = NEW.version, updated = datetime('now', 'localtime')
          WHERE id = NEW.series AND NEW.version > version;
      END;
  `);
  return sqlRes;
}

/**
 * @description 初始化名片数据表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initNameCardTable (): string[] {
  const sqlRes = [];
  // 创建名片数据表
  sqlRes.push(`
      CREATE TABLE IF NOT EXISTS NameCard
    (
        name       TEXT    PRIMARY KEY,
        description TEXT    DEFAULT NULL,
        icon       TEXT    NOT NULL,
        bg         TEXT    NOT NULL,
        profile    TEXT    NOT NULL,
        type       INTEGER DEFAULT 0,
        source     TEXT    DEFAULT NULL,
        updated    TEXT    DEFAULT NULL
    );
  `);
  return sqlRes;
}

/**
 * @description 初始化数据库表
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
export function initSQLiteTable (): string[] {
  const sqlRes = [];
  sqlRes.push(...initAppTable());
  sqlRes.push(...initGameAccountTable());
  sqlRes.push(...initAchievementSeriesTable());
  sqlRes.push(...initAchievementTable());
  sqlRes.push(...initNameCardTable());
  return sqlRes;
}

/**
 * @description 初始化应用数据
 * @since Alpha v0.1.4
 * @returns {Promise<string[]>} sql
 */
async function initAppData (): Promise<string[]> {
  const sqlRes = [];
  const appVersion = await app.getVersion();
  const buildTime = getBuildTime();
  const dataUpdated = buildTime.startsWith("dev") ? buildTime.slice(4) : buildTime;
  // 初始化应用版本
  sqlRes.push(`
    INSERT INTO AppData (key, value, updated)
    VALUES ('appVersion', '${appVersion}', datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = '${appVersion}', updated = datetime('now', 'localtime');
  `);
  // 初始化应用数据更新时间
  sqlRes.push(`
    INSERT INTO AppData (key, value, updated)
    VALUES ('dataUpdated', '${dataUpdated}', datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = '${dataUpdated}', updated = datetime('now', 'localtime');
  `);
  // 初始化 cookie
  sqlRes.push(`
    INSERT INTO AppData (key, value, updated)
    VALUES ('cookie', '{}', datetime('now', 'localtime'))
    ON CONFLICT(key) DO NOTHING;
  `);
  return sqlRes;
}

/**
 * @description 初始化成就系列数据
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initAchievementSeriesData (): string[] {
  const sqlRes: string[] = [];
  const oriData = TGAppData.achievementSeries;
  oriData.map((data) => {
    const sql = `
      INSERT OR IGNORE INTO AchievementSeries (id, "order", name, version, icon, nameCard, updated)
      VALUES (${data.id}, ${data.order}, '${data.name}', '${data.version}', '${data.icon}', '${data.card}', datetime('now', 'localtime'));
    `;
    return sqlRes.push(sql);
  });
  return sqlRes;
}

/**
 * @description 初始化成就数据
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initAchievementData (): string[] {
  const sqlRes: string[] = [];
  const oriData = TGAppData.achievements;
  oriData.map((data) => {
    const sql = `
      INSERT OR IGNORE INTO Achievements (id, series, "order", name, description, reward, version, updated)
      VALUES (${data.id}, ${data.series}, ${data.order}, '${data.name}', '${data.description}', ${data.reward}, '${data.version}', datetime('now', 'localtime'));
    `;
    return sqlRes.push(sql);
  });
  return sqlRes;
}

/**
 * @description 初始化名片数据
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initNameCardData (): string[] {
  const sqlRes: string[] = [];
  const oriData = TGAppData.nameCards;
  oriData.map((data) => {
    const sql = `
      INSERT OR IGNORE INTO NameCard (name, description, icon, bg, profile, type, source, updated)
      VALUES ('${data.name}', '${data.description}', '${data.icon}', '${data.bg}', '${data.profile}', ${data.type}, '${data.source}', datetime('now', 'localtime'));
    `;
    return sqlRes.push(sql);
  });
  return sqlRes;
}

/**
 * @description 初始化数据库数据
 * @since Alpha v0.1.4
 * @returns {Promise<string[]>} sql
 */
export async function initSQLiteData (): Promise<string[]> {
  const sqlRes = [];
  sqlRes.push(...initAchievementSeriesData());
  sqlRes.push(...initAchievementData());
  sqlRes.push(...initNameCardData());
  sqlRes.push(...await initAppData());
  return sqlRes;
}

/**
 * @description 导入UIAF数据
 * @since Alpha v0.1.4
 * @param {TGPlugin.UIAF.Achievement[]} data
 * @returns {string[]} sql
 */
export function importUIAFData (data: TGPlugin.UIAF.Achievement[]): string[] {
  const sqlRes: string[] = [];
  data.map((achievement) => {
    let sql;
    // 获取完成状态
    const isCompleted = achievement.status === 2 || achievement.status === 3;
    if (isCompleted) {
      const completedTime = new Date(achievement.timestamp * 1000).toISOString().replace("T", " ").slice(0, 19);
      sql = `
        UPDATE Achievements
        SET isCompleted = 1, completedTime = '${completedTime}', progress = ${achievement.current}, updated = datetime('now', 'localtime')
        WHERE id = ${achievement.id} AND (isCompleted = 0 OR completedTime != '${completedTime}' OR progress != ${achievement.current});
      `;
    } else {
      sql = `
        UPDATE Achievements
        SET progress = ${achievement.current}, updated = datetime('now', 'localtime')
        WHERE id = ${achievement.id} AND progress != ${achievement.current};
      `;
    }
    return sqlRes.push(sql);
  });
  return sqlRes;
}
