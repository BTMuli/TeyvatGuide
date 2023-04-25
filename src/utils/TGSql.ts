/**
 * @file utils TGSql.ts
 * @description 数据库sql语句
 * @auther BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

import { app } from "@tauri-apps/api";
import { getBuildTime } from "./TGBuild";
import { TGAppData } from "../data";

const TGSql = {
  initTable: {
    all: initSQLiteTable(),
    app: initAppTable(),
    achievement: initAchievementTable(),
    achievementSeries: initAchievementSeriesTable(),
    bbsPost: initBbsPostTable(),
  },
  initData: {
    all: initSQLiteData(),
    app: initAppData(),
    achievement: initAchievementData(),
    achievementSeries: initAchievementSeriesData(),
  },
  insert: {
    achievement: insertAchievementData,
    achievementSeries: insertAchievementSeriesData,
    bbsPost: insertBBSPostData,
    UIAF: importUIAFData,
  },
  update: {
    achievement: updateAchievementData,
    bbsPost: updateBBSPostData,
  },
};

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
  // 创建触发器
  sqlRes.push(`
    CREATE TRIGGER IF NOT EXISTS updateAppData
      AFTER UPDATE OF value ON AppData
      FOR EACH ROW
      BEGIN
          UPDATE BBSPost SET isRead = 1, updated = datetime('now', 'localtime')
          WHERE created < NEW.value OR modified < NEW.value AND NEW.key = 'bbsPost';
      END;
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
        nameCard   TEXT    DEFAULT NULL,
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
      END;
  `);
  return sqlRes;
}

/**
 * @description 初始化米游社帖子数据表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initBbsPostTable (): string[] {
  const sqlRes = [];
  // 创建米游社帖子数据表
  sqlRes.push(`
      CREATE TABLE IF NOT EXISTS BBSPost
    (
        id         INTEGER PRIMARY KEY,
        created    TEXT    DEFAULT NULL,
        modified   TEXT    DEFAULT NULL,
        isRead     BOOLEAN DEFAULT 0,
        updated    TEXT    DEFAULT NULL
    );
  `);
  return sqlRes;
}

/**
 * @description 初始化数据库表
 * @since Alpha v0.1.4
 * @returns {string[]} sql
 */
function initSQLiteTable (): string[] {
  const sqlRes = [];
  sqlRes.push(...initAppTable());
  sqlRes.push(...initAchievementSeriesTable());
  sqlRes.push(...initAchievementTable());
  sqlRes.push(...initBbsPostTable());
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
    VALUES ('appVersion', '${appVersion}', datetime('now', 'localtime'));
  `);
  // 初始化应用数据更新时间
  sqlRes.push(`
    INSERT INTO AppData (key, value, updated)
    VALUES ('dataUpdated', '${dataUpdated}', datetime('now', 'localtime'));
  `);
  // 初始化米游社帖子数据更新时间
  sqlRes.push(`
    INSERT INTO AppData (key, value, updated)
    VALUES ('bbsPostLine', datetime('now', 'localtime'), datetime('now', 'localtime'));
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
  Object.values(oriData).map((series) => {
    const sql = insertAchievementSeriesData(series);
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
  Object.values(oriData).map((achievement) => {
    const sql = insertAchievementData(achievement);
    return sqlRes.push(sql);
  });
  return sqlRes;
}

/**
 * @description 初始化数据库数据
 * @since Alpha v0.1.4
 * @returns {Promise<string[]>} sql
 */
async function initSQLiteData (): Promise<string[]> {
  const sqlRes = [];
  sqlRes.push(...initAchievementSeriesData());
  sqlRes.push(...initAchievementData());
  sqlRes.push(...await initAppData());
  return sqlRes;
}

/**
 * @description 插入数据-成就系列
 * @since Alpha v0.1.4
 * @param {BTMuli.Genshin.AchievementSeries} data
 * @returns {string} sql
*/
function insertAchievementSeriesData (data: BTMuli.Genshin.AchievementSeries): string {
  let sql;
  if (data.card) {
    sql = `
      INSERT INTO AchievementSeries (id, "order", name, version, icon, nameCard, updated)
      VALUES (${data.id}, ${data.order}, '${data.name}', '${data.version}', '${data.icon}', '${data.card}', datetime('now', 'localtime'));
    `;
  } else {
    sql = `
      INSERT INTO AchievementSeries (id, "order", name, version, icon, updated)
      VALUES (${data.id}, ${data.order}, '${data.name}', '${data.version}', '${data.icon}', datetime('now', 'localtime'));
    `;
  }
  return sql;
}

/**
 * @description 插入数据-成就
 * @since Alpha v0.1.4
 * @param {BTMuli.Genshin.Achievement} data
 * @returns {string} sql
 */
function insertAchievementData (data: BTMuli.Genshin.Achievement): string {
  const sql = `
    INSERT INTO Achievements (id, series, "order", name, description, reward, version, updated)
    VALUES (${data.id}, ${data.series}, ${data.order}, '${data.name}', '${data.description}', ${data.reward}, '${data.version}', datetime('now', 'localtime'));
  `;
  return sql;
}

/**
 * @description 插入数据-米游社帖子
 * @since Alpha v0.1.4
 * @param {BTMuli.SQLite.BBSPost} data
 * @param {string} bbsPostLine 米游社帖子数据更新时间
 * @returns {string} sql
 */
function insertBBSPostData (data: BTMuli.SQLite.BBSPost, bbsPostLine: string): string {
  // 将 bbsPostLine 与 data.created 跟 data.modified 比较，取最新的时间
  const isRead = data.created <= bbsPostLine && data.modified <= bbsPostLine;
  const sql = `
    INSERT INTO BBSPost (id, created, modified, isRead, updated)
    VALUES (${data.id}, '${data.created}', '${data.modified}', ${isRead ? 1 : 0}, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE 
    SET modified = '${data.modified}' WHERE id = ${data.id} AND modified != '${data.modified}';
  `;
  return sql;
}

/**
 * @description 更新数据-成就
 * @since Alpha v0.1.4
 * @param {BTMuli.Genshin.Achievement} data
 * @returns {string} sql
 */
function updateAchievementData (data: BTMuli.Genshin.Achievement): string {
  let sql;
  const isCompleted = data.completed ? 1 : 0;
  if (data.completed && data.completed_time) {
    sql = `
      UPDATE Achievements
      SET completed = ${isCompleted}, completedTime = '${data.completed_time}', progress = ${data.progress}, updated = datetime('now', 'localtime')
      WHERE id = ${data.id};
    `;
  } else {
    sql = `
      UPDATE Achievements
      SET completed = ${isCompleted}, progress = ${data.progress}, updated = datetime('now', 'localtime')
      WHERE id = ${data.id};
    `;
  }
  return sql;
}

/**
 * @description 更新数据-米游社帖子
 * @since Alpha v0.1.4
 * @param {BTMuli.SQLite.BBSPost} data
 * @param {boolean} isRead 是否已读
 * @returns {string} sql
 */
function updateBBSPostData (data: BTMuli.SQLite.BBSPost, isRead: boolean = false): string {
  let sql;
  if (isRead) {
    sql = `
      UPDATE BBSPost
      SET isRead = 1, updated = datetime('now', 'localtime')
      WHERE id = ${data.id};
    `;
  } else {
    sql = `
    UPDATE BBSPost
    SET modified = '${data.modified}', isRead = 0, updated = datetime('now', 'localtime')
    WHERE id = ${data.id} AND OLD.modified != '${data.modified}';
    `;
  }
  return sql;
}

/**
 * @description 导入UIAF数据
 * @since Alpha v0.1.4
 * @param {TGPlugin.UIAF.Achievement[]} data
 * @returns {string[]} sql
 */
function importUIAFData (data: TGPlugin.UIAF.Achievement[]): string[] {
  const sqlRes: string[] = [];
  data.map((achievement) => {
    let sql;
    // 获取完成状态
    const isCompleted = achievement.status === 2 || achievement.status === 3;
    if (isCompleted) {
      const completedTime = new Date(achievement.timestamp * 1000).toISOString().replace("T", " ").replace("Z", "");
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

export default TGSql;
