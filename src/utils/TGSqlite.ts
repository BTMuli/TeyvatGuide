/**
 * @description 数据库操作类
 * @class TGSqlite
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import Database from "tauri-plugin-sql-api";
// utils
import { importUIAFData, initSQLiteData, initSQLiteTable } from "./TGSql";
import { getUiafStatus } from "./UIAF";
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
    "GameAccount",
    "NameCard",
  ];

  /**
   * @description 初始化数据库
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   * @memberof TGSqlite
   */
  public async init (): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sqlT = initSQLiteTable();
    for (const item of sqlT) {
      await db.execute(item);
    }
    const sqlD = await initSQLiteData();
    for (const item of sqlD) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 获取数据库信息
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<{ key: string, value: string, updated: string }[]>}
   */
  public async getAppData (): Promise<Array<{ key: string, value: string, updated: string }>> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM AppData;";
    const res: Array<{ key: string, value: string, updated: string }> = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 封装-根据 table keys 获取数据
   * @memberof TGSqlite
   * @since Alpha v0.2.0
   * @param {string} table 表名
   * @param {string} keyName 键名
   * @param {string} keyValue 键值
   * @returns {Promise<unknown[]>} 数据
   */
  public async getDataByKey (table: string, keyName: string, keyValue: string): Promise<unknown[]> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM ${table} WHERE ${keyName}='${keyValue}';`;
    const res: unknown[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 封装-保存数据
   * @memberof TGSqlite
   * @since Alpha v0.2.0
   * @param {string} sql sql语句
   * @returns {Promise<void>}
   */
  public async saveData (sql: string): Promise<void> {
    const db = await Database.load(this.dbPath);
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 输入 cookie
   * @memberof TGSqlite
   * @since Alpha v0.2.0
   * @param {string} cookie
   * @returns {Promise<void>}
   */
  public async inputCookie (cookie: string): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = `
    INSERT INTO AppData (key, value, updated)
    VALUES ('cookie', '${cookie}', datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = '${cookie}', updated = datetime('now', 'localtime');`;
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 保存 appData
   * @memberof TGSqlite
   * @since Alpha v0.2.0
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  public async saveAppData (key: string, value: string): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = `
    INSERT INTO AppData (key, value, updated)
    VALUES ('${key}', '${value}', datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = '${value}', updated = datetime('now', 'localtime');`;
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 已有数据表跟触发器不变的情况下，更新数据库数据
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   */
  public async update (): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sqlD = await initSQLiteData();
    for (const item of sqlD) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 检测数据库完整性
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<boolean>}
   */
  public async check (): Promise<boolean> {
    const db = await Database.load(this.dbPath);
    let isVertified = false;
    // 检测数据表是否都存在
    const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
    const res: Array<{ name: string }> = await db.select(sqlT);
    // 考虑到 sqlite_sequence 表，所以需要 +1
    if (res.length === this.tables.length + 1) {
      if (this.tables.every((item) => res.map((i) => i.name).includes(item))) {
        isVertified = true;
      }
    }
    await db.close();
    return isVertified;
  }

  /**
   * @description 重置数据库
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<void>}
   */
  public async reset (): Promise<void> {
    const db = await Database.load(this.dbPath);
    this.tables.map(async (item) => {
      const sql = `DROP TABLE IF EXISTS ${item};`;
      await db.execute(sql);
    });
    await db.close();
    await this.init();
  }

  /**
   * @description 获取数据库版本及构建时间
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<{ version: string, buildTime: string }>}
   */
  public async getMetadata (): Promise<{ version: string, buildTime: string }> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM AppData WHERE key='appVersion' OR key='dataUpdated';";
    const res: Array<{ key: string, value: string }> = await db.select(sql);
    const version = res.find((item) => item.key === "appVersion")?.value ?? "0.0.0";
    const buildTime = res.find((item) => item.key === "dataUpdated")?.value ?? "1970-01-01 00:00:00";
    await db.close();
    return { version, buildTime };
  }

  /**
   * @description 获取成就系列列表
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<BTMuli.SQLite.AchievementSeries[]>}
   */
  public async getAchievementSeries (): Promise<BTMuli.SQLite.AchievementSeries[]> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM AchievementSeries ORDER BY `order` ASC;";
    const res: BTMuli.SQLite.AchievementSeries[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 获取成就系列对应的名片
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @param {number} seriesId 系列 ID
   * @returns {Promise<BTMuli.SQLite.NameCard>}
   */
  public async getNameCard (seriesId: number): Promise<BTMuli.SQLite.NameCard> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM NameCard WHERE name=(SELECT nameCard FROM AchievementSeries WHERE id=${seriesId});`;
    const res: BTMuli.SQLite.NameCard[] = await db.select(sql);
    await db.close();
    return res[0];
  }

  /**
   * @description 获取成就列表
   * @memberof TGSqlite
   * @param {number} [seriesId] 系列 ID
   * @since Alpha v0.1.4
   * @returns {Promise<BTMuli.SQLite.Achievements[]>}
   */
  public async getAchievements (seriesId?: number): Promise<BTMuli.SQLite.Achievements[]> {
    const db = await Database.load(this.dbPath);
    let sql;
    if (seriesId) {
      sql = `SELECT * FROM Achievements WHERE series=${seriesId} ORDER BY isCompleted ASC, \`order\` ASC;`;
    } else {
      sql = "SELECT * FROM Achievements ORDER BY isCompleted ASC, `order` ASC;";
    }
    const res: BTMuli.SQLite.Achievements[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 获取成就概况
   * @since Alpha v0.1.4
   * @memberof TGSqlite
   * @returns {Promise<{total:number,fin:number}>}
   */
  public async getAchievementsOverview (): Promise<{ total: number, fin: number }> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT SUM(totalCount) AS total, SUM(finCount) AS fin FROM AchievementSeries;";
    const res: Array<{ total: number, fin: number }> = await db.select(sql);
    await db.close();
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
    const db = await Database.load(this.dbPath);
    let sql;
    if (keyword.startsWith("v")) {
      const version = keyword.replace("v", "");
      sql = `SELECT * FROM Achievements WHERE version LIKE '%${version}%' ORDER BY isCompleted ASC, \`order\` ASC;`;
    } else {
      sql = `SELECT * FROM Achievements WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%' ORDER BY isCompleted ASC, \`order\` ASC;`;
    }
    const res: BTMuli.SQLite.Achievements[] = await db.select(sql);
    await db.close();
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
    const db = await Database.load(this.dbPath);
    const sql = importUIAFData(achievements);
    for (const item of sql) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 获取 UIAF 数据
   * @memberof TGSqlite
   * @since Alpha v0.1.4
   * @returns {Promise<TGPlugin.UIAF.Achievement[]>}
   */
  public async getUIAF (): Promise<TGPlugin.UIAF.Achievement[]> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM Achievements WHERE isCompleted = 1 OR progress > 0";
    const res: BTMuli.SQLite.Achievements[] = await db.select(sql);
    await db.close();
    const achievements: TGPlugin.UIAF.Achievement[] = [];
    for (const item of res) {
      const completed = item.isCompleted === 1;
      const status = getUiafStatus(completed, item.progress);
      achievements.push({
        id: item.id,
        status,
        timestamp: completed && item.completedTime ? new Date(item.completedTime).getTime() / 1000 : 0,
        current: item.progress,
      });
    }
    return achievements;
  }
}

export default new TGSqlite();
