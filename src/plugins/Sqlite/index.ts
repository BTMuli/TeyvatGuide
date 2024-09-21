/**
 * @file plugins/Sqlite/index.ts
 * @description Sqlite 数据库操作类
 * @since Beta v0.6.0
 */

import { app } from "@tauri-apps/api";
import Database from "@tauri-apps/plugin-sql";

import initDataSql from "./sql/initData.js";
import { insertAppData, insertRecordData } from "./sql/insertData.js";

class Sqlite {
  /**
   * @description 数据库地址
   * @since Alpha v0.2.0
   * @private
   */
  private readonly dbPath: string = "sqlite:TeyvatGuide.db";
  /**
   * @description 数据库包含的表
   * @since Alpha v0.2.3
   * @private
   */
  private readonly tables: string[] = [
    "Achievements",
    "AppCharacters",
    "AppData",
    "GameAccount",
    "SpiralAbyss",
    "UserCharacters",
    "UserRecord",
    "GachaRecords",
  ];

  /**
   * @description 内部数据库实例
   * @since Beta v0.3.3
   * @private
   */
  private db: Database | null = null;

  /**
   * @description 获取数据库实例
   * @since Beta v0.3.3
   * @returns {Promise<Database>}
   */
  public async getDB(): Promise<Database> {
    if (this.db === null) {
      this.db = await Database.load(this.dbPath);
    }
    return this.db;
  }

  /**
   * @description 初始化数据库
   * @since Beta v0.4.5
   * @returns {Promise<void>}
   */
  public async initDB(): Promise<void> {
    const db = await this.getDB();
    const sql = await initDataSql();
    for (const item of sql) {
      await db.execute(item);
    }
  }

  /**
   * @description 获取数据库信息
   * @since Beta v0.3.3
   * @returns {Promise<TGApp.Sqlite.AppData.Item[]>}
   */
  public async getAppData(): Promise<TGApp.Sqlite.AppData.Item[]> {
    const db = await this.getDB();
    const sql = "SELECT * FROM AppData;";
    return await db.select(sql);
  }

  /**
   * @description 对比数据判断是否需要更新
   * @since Beta v0.3.3
   * @returns {Promise<boolean>}
   */
  public async checkUpdate(): Promise<boolean> {
    const dbData = await this.getAppData();
    const localVersion = await app.getVersion();
    const dbVersion = dbData.find((item) => item.key === "appVersion")?.value;
    if (dbVersion === undefined) return true;
    return localVersion !== dbVersion;
  }

  /**
   * @description 保存 appData
   * @since Beta v0.3.3
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  public async saveAppData(key: string, value: string): Promise<void> {
    const db = await this.getDB();
    const sql = insertAppData(key, value);
    await db.execute(sql);
  }

  /**
   * @description 已有数据表跟触发器不变的情况下，更新数据库数据
   * @since Beta v0.3.3
   * @returns {Promise<void>}
   */
  public async update(): Promise<void> {
    const db = await this.getDB();
    const sqlD = await initDataSql();
    for (const item of sqlD) {
      await db.execute(item);
    }
  }

  /**
   * @description 重置数据库
   * @since Beta v0.4.0
   * @returns {Promise<void>}
   */
  public async reset(): Promise<void> {
    const db = await this.getDB();
    await Promise.all(
      this.tables.map(async (item) => {
        const sql = `DROP TABLE IF EXISTS ${item};`;
        await db.execute(sql);
      }),
    );
    await this.initDB();
  }

  /**
   * @description 保存战绩数据
   * @since Beta v0.3.3
   * @param {TGApp.Game.Record.FullData} data 战绩数据
   * @param {string} uid 用户 uid
   * @returns {Promise<void>}
   */
  public async saveUserRecord(data: TGApp.Game.Record.FullData, uid: string): Promise<void> {
    const db = await this.getDB();
    const sql = insertRecordData(data, uid);
    await db.execute(sql);
  }

  /**
   * @description 获取战绩数据
   * @since Beta v0.3.3
   * @param {string} uid 用户 uid
   * @returns {Promise<TGApp.Sqlite.Record.SingleTable|false>}
   */
  public async getUserRecord(uid: string): Promise<TGApp.Sqlite.Record.SingleTable | false> {
    const db = await this.getDB();
    const sql = `SELECT *
                 FROM UserRecord
                 WHERE uid = '${uid}'`;
    const res: TGApp.Sqlite.Record.SingleTable[] = await db.select(sql);
    if (res.length === 0) return false;
    return res[0];
  }

  /**
   * @description 检测特定表是否存在
   * @since Beta v0.4.5
   * @param {string} table 表名
   * @returns {Promise<boolean>}
   */
  async checkTableExist(table: string): Promise<boolean> {
    const db = await this.getDB();
    const sql = `SELECT name
                 FROM sqlite_master
                 WHERE type = 'table'
                   AND name = '${table}';`;
    const res: Array<{ name: string }> = await db.select(sql);
    return res.length > 0;
  }
}

const TGSqlite = new Sqlite();

export default TGSqlite;
