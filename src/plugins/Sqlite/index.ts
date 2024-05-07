/**
 * @file plugins/Sqlite/index.ts
 * @description Sqlite 数据库操作类
 * @since Beta v0.4.7
 */

import { app } from "@tauri-apps/api";
import Database from "tauri-plugin-sql-api";

import initDataSql from "./sql/initData";
import {
  importAbyssData,
  insertAbyssData,
  insertAppData,
  insertGameAccountData,
  insertRecordData,
  insertRoleData,
} from "./sql/insertData";

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
    "AchievementSeries",
    "AppCharacters",
    "AppData",
    "GameAccount",
    "NameCard",
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
   * @description 获取 cookie
   * @since Beta v0.3.8
   * @returns {Promise<TGApp.User.Account.Cookie>}
   */
  public async getCookie(): Promise<TGApp.User.Account.Cookie> {
    const db = await this.getDB();
    const sql = "SELECT value FROM AppData WHERE key='cookie';";
    const res: Array<{ value: string }> = await db.select(sql);
    return JSON.parse(res[0].value);
  }

  /**
   * @description 插入 Account 数据
   * @since Beta v0.4.7
   * @param {TGApp.User.Account.Game[]} accounts
   * @returns {Promise<void>}
   */
  public async saveAccount(accounts: TGApp.User.Account.Game[]): Promise<void> {
    const db = await this.getDB();
    await db.execute("DELETE FROM GameAccount WHERE true;");
    for (const a of accounts) {
      const sql = insertGameAccountData(a);
      await db.execute(sql);
    }
  }

  /**
   * @description 获取当前选择的游戏账号
   * @since Beta v0.4.1
   * @returns {Promise<TGApp.Sqlite.Account.Game|false>}
   */
  public async getCurAccount(): Promise<TGApp.Sqlite.Account.Game | false> {
    const db = await this.getDB();
    const check = "SELECT * FROM GameAccount";
    const checkRes: TGApp.Sqlite.Account.Game[] = await db.select(check);
    if (checkRes.length === 0) return false;
    if (checkRes.length === 1) return checkRes[0];
    const res = checkRes.filter((item) => item.isChosen === 1);
    return res.length === 0 ? false : res[0];
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
   * @description 检测数据库完整性
   * @since Beta v0.4.4
   * @returns {Promise<boolean>}
   */
  public async check(): Promise<boolean> {
    const db = await this.getDB();
    let isVerified = false;
    const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
    const res: Array<{ name: string }> = await db.select(sqlT);
    if (this.tables.every((item) => res.map((i) => i.name).includes(item))) {
      isVerified = true;
    }
    return isVerified;
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
   * @description 保存深渊数据
   * @since Beta v0.3.3
   * @param {string} uid 游戏 UID
   * @param {TGApp.Game.Abyss.FullData} data 深渊数据
   * @returns {Promise<void>}
   */
  public async saveAbyss(uid: string, data: TGApp.Game.Abyss.FullData): Promise<void> {
    const db = await this.getDB();
    const sql = insertAbyssData(uid, data);
    await db.execute(sql);
  }

  /**
   * @description 获取深渊数据
   * @since Beta v0.3.3
   * @param {string} uid 游戏 UID
   * @returns {Promise<TGApp.Game.Abyss.FullData>}
   */
  public async getAbyss(uid?: string): Promise<TGApp.Sqlite.Abyss.SingleTable[]> {
    const db = await this.getDB();
    let sql;
    if (uid) {
      sql = `SELECT *
             FROM SpiralAbyss
             WHERE uid = '${uid}'
             order by id desc`;
    } else {
      sql = "SELECT * FROM SpiralAbyss order by uid, id desc";
    }
    return await db.select(sql);
  }

  /**
   * @description 恢复深渊数据
   * @since Beta v0.3.3
   * @param {TGApp.Sqlite.Abyss.SingleTable[]} data 深渊数据
   * @returns {Promise<void>}
   */
  public async restoreAbyss(data: TGApp.Sqlite.Abyss.SingleTable[]): Promise<void> {
    const db = await this.getDB();
    for (const item of data) {
      const sql = importAbyssData(item);
      await db.execute(sql);
    }
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
   * @description 获取角色数据
   * @since Beta v0.3.3
   * @param {number} id 角色 ID
   * @returns {Promise<TGApp.Sqlite.Character.AppData}> 角色数据
   */
  public async getAppCharacter(id: number): Promise<TGApp.Sqlite.Character.AppData> {
    const db = await this.getDB();
    const sql = `SELECT *
                 FROM AppCharacters
                 WHERE id = ${id}`;
    const res: TGApp.Sqlite.Character.AppData[] = await db.select(sql);
    return res[0];
  }

  /**
   * @description 保存用户角色数据
   * @since Beta v0.3.3
   * @param {string} uid 用户 uid
   * @param {TGApp.Game.Character.ListItem[]} data 角色数据
   * @returns {Promise<void>}
   */
  public async saveUserCharacter(
    uid: string,
    data: TGApp.Game.Character.ListItem[],
  ): Promise<void> {
    const db = await this.getDB();
    const sql = insertRoleData(uid, data);
    await db.execute(sql);
  }

  /**
   * @description 保存用户角色天赋数据
   * @since Beta v0.3.3
   * @param {string} uid 用户 uid
   * @param {number} cid 角色 ID
   * @param {TGApp.Sqlite.Character.RoleTalent[]} data 角色天赋数据
   * @returns {Promise<void>}
   */
  public async saveUserCharacterTalent(
    uid: string,
    cid: number,
    data: TGApp.Sqlite.Character.RoleTalent[],
  ): Promise<void> {
    const db = await this.getDB();
    const sql = `UPDATE UserCharacters
                 SET talent  = '${JSON.stringify(data)}',
                     updated = datetime('now', 'localtime')
                 WHERE uid = '${uid}'
                   AND cid = ${cid}`;
    await db.execute(sql);
  }

  /**
   * @description 获取用户角色数据
   * @since Beta v0.3.3
   * @param {string} uid 用户 uid
   * @returns {Promise<TGApp.Sqlite.Character.UserRole[]|false>}
   */
  public async getUserCharacter(uid: string): Promise<TGApp.Sqlite.Character.UserRole[] | false> {
    const db = await this.getDB();
    const sql = `SELECT *
                 FROM UserCharacters
                 WHERE uid = '${uid}'`;
    const res: TGApp.Sqlite.Character.UserRole[] = await db.select(sql);
    if (res.length === 0) return false;
    return res;
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
