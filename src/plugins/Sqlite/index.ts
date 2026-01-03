/**
 * Sqlite 数据库操作类
 * @since Beta v0.9.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import { app } from "@tauri-apps/api";
import Database from "@tauri-apps/plugin-sql";
import TGLogger from "@utils/TGLogger.js";

import initDataSql from "./sql/initData.js";

class Sqlite {
  private readonly dbPath: string = "sqlite:TeyvatGuide.db";
  private readonly tables: Readonly<Array<string>> = [
    "Achievements",
    "AppData",
    "GachaRecords",
    "GachaBRecords",
    "GameAccount",
    "HardChallenge",
    "RoleCombat",
    "SpiralAbyss",
    "UFCollection",
    "UFMap",
    "UFPost",
    "UserAccount",
    "UserCharacters",
    "UserRecord",
    "UserBagMaterial",
  ];
  private db: Database | null = null;
  private static instance: Sqlite | null = null;

  static getInstance(): Sqlite {
    if (this.instance === null) this.instance = new Sqlite();
    return this.instance;
  }

  /**
   * 获取数据库实例
   * @since Beta v0.3.3
   * @returns 数据库实例
   */
  public async getDB(): Promise<Database> {
    if (this.db === null) this.db = await Database.load(this.dbPath);
    return this.db;
  }

  /**
   * 检测是否需要创建数据库
   * @since Beta v0.6.1
   * @returns 是否需要创建数据库
   */
  public async check(): Promise<boolean> {
    try {
      const db = await this.getDB();
      let isVerified = false;
      const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
      const res: Array<{ name: string }> = await db.select(sqlT);
      if (this.tables.every((item) => res.map((i) => i.name).includes(item))) {
        isVerified = true;
      }
      return isVerified;
    } catch (e) {
      await TGLogger.Error(JSON.stringify(e));
      return false;
    }
  }

  /**
   * 初始化数据库
   * @since Beta v0.4.5
   * @returns 无返回值
   */
  public async initDB(): Promise<void> {
    const db = await this.getDB();
    const sql = await initDataSql();
    for (const item of sql) await db.execute(item);
  }

  /**
   * 获取数据库信息
   * @since Beta v0.3.3
   * @TODO 简化或者完善类型
   * @returns AppData表数据
   */
  public async getAppData(): Promise<Array<TGApp.Sqlite.AppData.Item>> {
    const db = await this.getDB();
    const sql = "SELECT * FROM AppData;";
    return await db.select(sql);
  }

  /**
   * 对比数据判断是否需要更新
   * @since Beta v0.3.3
   * @returns 是否需要更新
   */
  public async checkUpdate(): Promise<boolean> {
    const dbData = await this.getAppData();
    const localVersion = await app.getVersion();
    const dbVersion = dbData.find((item) => item.key === "appVersion")?.value;
    if (dbVersion === undefined) return true;
    return localVersion !== dbVersion;
  }

  /**
   * 插入应用数据
   * @since Alpha v0.2.0
   * @param key - 键
   * @param value - 值
   * @returns sql
   */
  insertAppData(key: string, value: string): string {
    return `
        INSERT INTO AppData (key, value, updated)
        VALUES ('${key}', '${value}', datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET value   = '${value}',
                                       updated = datetime('now', 'localtime');
    `;
  }

  /**
   * 保存 appData
   * @since Beta v0.3.3
   * @param key - 键
   * @param value - 值
   * @returns 无返回值
   */
  public async saveAppData(key: string, value: string): Promise<void> {
    const db = await this.getDB();
    const sql = this.insertAppData(key, value);
    await db.execute(sql);
  }

  /**
   * 已有数据表跟触发器不变的情况下，更新数据库数据
   * @since Beta v0.3.3
   * @returns 无返回值
   */
  public async update(): Promise<void> {
    const db = await this.getDB();
    const sqlD = await initDataSql();
    for (const item of sqlD) await db.execute(item);
    // 检测是否存在字段
    await this.updateAbyss();
  }

  /**
   * 更新 SpiralAbyss 表
   * @since Beta v0.6.1
   * @returns 无返回值
   */
  public async updateAbyss(): Promise<void> {
    const db = await this.getDB();
    try {
      await db.select("SELECT skippedFloor FROM SpiralAbyss;");
    } catch (e) {
      await TGLogger.Error(JSON.stringify(e));
      const sql = "ALTER TABLE SpiralAbyss ADD skippedFloor TEXT DEFAULT ''";
      await db.execute(sql);
    }
  }

  /**
   * 重置数据库
   * @since Beta v0.9.1
   * @returns 无返回值
   */
  public async reset(): Promise<void> {
    const db = await this.getDB();
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 让 SQLite 在遇到锁时等待（毫秒）
        await db.execute("PRAGMA busy_timeout = 5000;");
        // 立即获取写锁，减少中途被抢占的概率
        await db.execute("BEGIN IMMEDIATE;");
        try {
          for (const item of this.tables) {
            const sql = `DROP TABLE IF EXISTS "${item}";`;
            await db.execute(sql);
          }
          await db.execute("COMMIT;");
        } catch (innerErr) {
          await db.execute("ROLLBACK;");
          console.error(innerErr);
        }
        await this.initDB();
        return;
      } catch (err: any) {
        const msg = String(err);
        // 如果是 BUSY/LOCKED，做指数退避重试
        if (/BUSY|LOCKED|SQLITE_BUSY|SQLITE_LOCKED/i.test(msg) && attempt < maxAttempts) {
          const wait = 100 * Math.pow(2, attempt - 1); // 100, 200, 400, ...
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        console.error(err);
        showSnackbar.error("数据库重置失败，请退出应用后手动删除数据库文件");
      }
    }
  }
}

const TGSqlite = Sqlite.getInstance();

export default TGSqlite;
