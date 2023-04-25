/**
 * @description 数据库操作类
 * @class TGSqlite
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

import Database from "tauri-plugin-sql-api";
import TGSql from "./TGSql";
import { getUiafStatus } from "./UIAF";
import { TGAppData } from "../data";

const dbLink = await Database.load("sqlite:tauri-genshin.db");

class TGSqlite {
  /**
   * @description 数据库地址
   * @private
   * @type {string}
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   */
  private readonly dbPath: string = "sqlite:tauri-genshin.db";
  /**
   * @description 数据库实例
   * @private
   * @type {Database}
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   */
  private readonly db: Database;
  /**
   * @description 数据库包含的表
   * @private
   * @type {string[]}
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   */
  private readonly tables: string[] = [
    "AppData",
    "Achievements",
    "AchievementSeries",
    "BBSPost",
  ];

  /**
   * @description 构造函数
   * @constructor
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   */
  constructor () {
    // 异步
    this.db = dbLink;
  }

  /**
   * @description 初始化数据库
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   * @memberof TGSqlite
   */
  public async init (): Promise<void> {
    const sqlT = TGSql.initTable.all;
    for (const item of sqlT) {
      await this.db.execute(item);
    }
    const sqlD = await TGSql.initData.all;
    for (const item of sqlD) {
      await this.db.execute(item);
    }
  }

  /**
   * @description 检测数据库完整性
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<boolean>}
   */
  public async check (): Promise<boolean> {
    // 检测数据表是否都存在
    const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
    const res: Array<{ name: string }> = await this.db.select(sqlT);
    if (res.length !== this.tables.length) return false;
    for (const item of res) {
      if (!this.tables.includes(item.name)) return false;
    }
    return true;
  }

  /**
   * @description 重置数据库
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   */
  public async reset (): Promise<void> {
    this.tables.map(async (item) => {
      const sql = `DROP TABLE IF EXISTS ${item};`;
      await this.db.execute(sql);
    });
    await this.init();
  }

  /**
   * @description 获取数据库版本及构建时间
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<{ version: string, buildTime: string }>}
   */
  public async getMetadata (): Promise<{ version: string, buildTime: string }> {
    const sql = "SELECT * FROM AppData WHERE key='appVersion' OR key='dataUpdated';";
    const res: Array<{ key: string, value: string }> = await this.db.select(sql);
    const version = res.find((item) => item.key === "appVersion")?.value ?? "0.0.0";
    const buildTime = res.find((item) => item.key === "dataUpdated")?.value ?? "1970-01-01 00:00:00";
    return { version, buildTime };
  }

  /**
   * @description 清除 BBSPost 数据
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   */
  public async clearBbsPost (): Promise<void> {
    const sql = [];
    sql.push("DROP TABLE IF EXISTS BBSPost;");
    sql.push(...TGSql.initTable.bbsPost);
    sql.push("UPDATE AppData SET value=datetime('now', 'localtime') WHERE key='bbsPostLine';");
    for (const item of sql) {
      await this.db.execute(item);
    }
  }

  /**
   * @description 获取成就系列列表
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<BTMuli.SQLite.AchievementSeries[]>}
   */
  public async getAchievementSeries (): Promise<BTMuli.SQLite.AchievementSeries[]> {
    const sql = "SELECT * FROM AchievementSeries ORDER BY `order` ASC;";
    const res: BTMuli.SQLite.AchievementSeries[] = await this.db.select(sql);
    return res;
  }

  /**
   * @description 获取成就列表
   * @memberof TGSqlite
   * @param {number} [seriesId] 系列 ID
   * @since Alpha v0.1.4
   * @returns {Promise<BTMuli.SQLite.Achievements[]>}
   */
  public async getAchievements (seriesId?: number): Promise<BTMuli.SQLite.Achievements[]> {
    let sql;
    if (seriesId) {
      sql = `SELECT * FROM Achievements WHERE series=${seriesId} ORDER BY isCompleted DESC, \`order\` ASC;`;
    } else {
      sql = "SELECT * FROM Achievements ORDER BY isCompleted DESC, `order` ASC;";
    }
    const res: BTMuli.SQLite.Achievements[] = await this.db.select(sql);
    return res;
  }

  /**
   * @description 获取成就概况
   * @since Alpha v0.1.4
   * @memberof TGSqlite
   * @returns {Promise<{total:number,fin:number}>}
   */
  public async getAchievementsOverview (): Promise<{ total: number, fin: number }> {
    const sql = "SELECT SUM(totalCount) AS total, SUM(finCount) AS fin FROM AchievementSeries;";
    const res: Array<{ total: number, fin: number }> = await this.db.select(sql);
    return res[0];
  }

  /**
   * @description 查询成就
   * @memberof TGSqlite
   * @param {string} keyword 关键词
   * @since Alpha v0.1.4
   * @returns {Promise<BTMuli.SQLite.Achievements[]>}
   */
  public async searchAchievements (keyword: string): Promise<BTMuli.SQLite.Achievements[]> {
    let sql;
    if (keyword.startsWith("v")) {
      const version = keyword.replace("v", "");
      sql = `SELECT * FROM Achievements WHERE version='${version}' ORDER BY isCompleted DESC, \`order\` ASC;`;
    } else {
      sql = `SELECT * FROM Achievements WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%' ORDER BY isCompleted DESC, \`order\` ASC;`;
    }
    const res: BTMuli.SQLite.Achievements[] = await this.db.select(sql);
    return res;
  }

  /**
   * @description 合并 UIAF 数据
   * @memberof TGSqlite
   * @param {BTMuli.UIAF.Achievement[]} achievements UIAF 数据
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   */
  public async mergeUIAF (achievements: TGPlugin.UIAF.Achievement[]): Promise<void> {
    const sql = TGSql.insert.UIAF(achievements);
    for (const item of sql) {
      await this.db.execute(item);
    }
  }

  /**
   * @description 获取 UIAF 数据
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<TGPlugin.UIAF.Achievement[]>}
   */
  public async getUIAF (): Promise<TGPlugin.UIAF.Achievement[]> {
    const sql = "SELECT * FROM Achievements WHERE isCompleted = 1 OR progress > 0";
    const res: BTMuli.SQLite.Achievements[] = await this.db.select(sql);
    const achievements: TGPlugin.UIAF.Achievement[] = [];
    for (const item of res) {
      const completed = item.isCompleted === 1;
      const status = getUiafStatus(completed, item.progress);
      achievements.push({
        id: item.id,
        status,
        timestamp: completed && item.completedTime ? new Date(item.completedTime).getTime() : 0,
        current: item.progress,
      });
    }
    return achievements;
  }
}

export default new TGSqlite();
