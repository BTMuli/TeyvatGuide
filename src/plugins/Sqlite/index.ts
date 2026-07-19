/**
 * Sqlite 数据库操作类
 * @since Beta v0.11.2
 */

import showSnackbar from "@comp/func/snackbar.js";
import { app } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import TGLogger from "@utils/TGLogger.js";

import initDataSql from "./sql/initData.js";

type SqlStatement = {
  query: string;
  values?: Array<unknown>;
};

class Sqlite {
  private readonly dbPath: string = "sqlite:TeyvatGuide.db";
  private readonly tables: Readonly<Array<string>> = [
    "Achievements",
    "AppData",
    "CultivationApiResult",
    "CultivationEntry",
    "CultivationItem",
    "CultivationProject",
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
    "UserBagWeapon",
    "UserBagRelic",
  ];
  private db: Database | null = null;
  private cultivationEntrySchemaUpdate: Promise<void> | null = null;
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
   * 在同一数据库连接中执行事务语句
   * @since Beta v0.11.1
   * @param statements - 按顺序执行的 SQL 语句
   * @returns 无返回值
   */
  public async executeTransaction(statements: ReadonlyArray<SqlStatement>): Promise<void> {
    await this.getDB();
    await invoke("execute_sql_transaction", { db: this.dbPath, statements });
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
   * 保存 appData
   * @since Beta v0.9.9
   * @param key - 键
   * @param value - 值
   * @returns 无返回值
   */
  public async saveAppData(key: string, value: string): Promise<void> {
    const db = await this.getDB();
    await db.execute(
      `
          INSERT INTO AppData (key, value, updated)
          VALUES ($1, $2, datetime('now', 'localtime'))
          ON CONFLICT(key)
              DO UPDATE SET value   = $2,
                            updated = datetime('now', 'localtime');
      `,
      [key, value],
    );
  }

  /**
   * 删除 appData
   * @since Beta v0.11.0
   * @param key - 键
   * @returns 无返回值
   */
  public async deleteAppData(key: string): Promise<void> {
    const db = await this.getDB();
    await db.execute("DELETE FROM AppData WHERE key = $1;", [key]);
  }

  /**
   * 已有数据表跟触发器不变的情况下，更新数据库数据
   * @since Beta v0.10.0
   * @param upt - updateTime 更新时间
   * @returns 无返回值
   */
  public async update(upt?: string): Promise<void> {
    const db = await this.getDB();
    const sqlD = await initDataSql();
    for (const item of sqlD) await db.execute(item);
    // 检测是否存在字段
    await this.updateAbyss();
    await this.updateCultivationEntry();
    if (upt !== undefined) {
      await this.saveAppData("dataUpdated", upt);
    }
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
   * 更新养成目标配置字段与接口计算结果表
   * @since Beta v0.11.2
   * @returns 无返回值
   */
  public async updateCultivationEntry(): Promise<void> {
    if (this.cultivationEntrySchemaUpdate === null) {
      this.cultivationEntrySchemaUpdate = this.ensureCultivationEntrySchema();
    }
    try {
      await this.cultivationEntrySchemaUpdate;
    } catch (error) {
      this.cultivationEntrySchemaUpdate = null;
      throw error;
    }
  }

  private async ensureCultivationEntrySchema(): Promise<void> {
    const db = await this.getDB();
    await db.execute(`CREATE TABLE IF NOT EXISTS CultivationApiResult (
      projectId TEXT NOT NULL,
      avatarEntryId TEXT NOT NULL DEFAULT '',
      weaponEntryId TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL,
      updated TEXT NOT NULL,
      PRIMARY KEY (projectId, avatarEntryId, weaponEntryId)
    );`);
    await db.execute(
      "CREATE INDEX IF NOT EXISTS CultivationApiResultProjectIndex ON CultivationApiResult (projectId);",
    );
    const columns = await db.select<Array<{ name: string }>>(
      "PRAGMA table_info(CultivationEntry);",
    );
    const columnNames = new Set(columns.map((column) => column.name));
    const additions = <const>[
      {
        name: "calculationMode",
        sql: `ALTER TABLE CultivationEntry ADD calculationMode TEXT NOT NULL DEFAULT 'bag';`,
      },
      {
        name: "allowCrafting",
        sql: "ALTER TABLE CultivationEntry ADD allowCrafting BOOLEAN NOT NULL DEFAULT true;",
      },
      {
        name: "useDust",
        sql: "ALTER TABLE CultivationEntry ADD useDust BOOLEAN NOT NULL DEFAULT false;",
      },
      {
        name: "useSolvent",
        sql: "ALTER TABLE CultivationEntry ADD useSolvent BOOLEAN NOT NULL DEFAULT false;",
      },
    ];
    for (const addition of additions) {
      if (!columnNames.has(addition.name)) await db.execute(addition.sql);
    }
    await db.execute(
      `UPDATE CultivationEntry
       SET calculationMode = 'bag'
       WHERE calculationMode IS NULL OR calculationMode NOT IN ('bag', 'api');`,
    );
  }

  /**
   * 重置数据库
   * @since Beta v0.9.5
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
            await db.execute("DROP TABLE IF EXISTS $1", [item]);
          }
          await db.execute("COMMIT;");
        } catch (innerErr) {
          console.error(innerErr);
          await db.execute("ROLLBACK;");
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
