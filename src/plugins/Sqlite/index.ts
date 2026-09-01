/**
 * Sqlite 数据库操作类
 * @since Beta v0.12.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import { app } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import TGLogger from "@utils/TGLogger.js";

import createTable from "./sql/createTable.sql?raw";
import initDataSql from "./sql/initData.js";

type TableColumn = {
  name: string;
  notnull: number;
  pk: number;
};

const CoreSchemaMigrations = <const>[
  "GameAccount.v2",
  "HardChallenge.v2",
  "UserRecordRaw.v1",
  "Achievements.v2",
];
const CoreSchemaVersion = "2026.08.p0.6";

const GameAccountLegacyTable = "GameAccount_legacy_v0_11_2";
const LegacyTablesForReset = <const>[GameAccountLegacyTable, "UserRecord"];
const GameAccountColumns = <const>[
  "uid",
  "gameBiz",
  "gameUid",
  "isChosen",
  "isOfficial",
  "level",
  "nickname",
  "region",
  "regionName",
  "updated",
];
const HardChallengeColumns = <const>[
  "uid",
  "id",
  "startTime",
  "endTime",
  "name",
  "single",
  "mp",
  "blings",
  "updated",
];
const UserRecordRawColumns = <const>["uid", "rawData", "updated"];
const AchievementsColumns = <const>[
  "id",
  "uid",
  "isCompleted",
  "completedTime",
  "progress",
  "status",
  "updated",
];

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
    "GameInstallation",
    "HardChallenge",
    "RoleCombat",
    "SpiralAbyss",
    "UFCollection",
    "UFMap",
    "UFPost",
    "UserAccount",
    "UserCharacters",
    "UserRecordRaw",
    "UserBagMaterial",
    "UserBagWeapon",
    "UserBagRelic",
    "UserBagAvatar",
  ];
  private db: Database | null = null;
  private coreSchemaUpdate: Promise<void> | null = null;
  private cultivationEntrySchemaUpdate: Promise<void> | null = null;
  private static instance: Sqlite | null = null;

  static getInstance(): Sqlite {
    if (this.instance === null) this.instance = new Sqlite();
    return this.instance;
  }

  /**
   * 获取数据库实例
   * @since Beta v0.12.0
   * @returns 数据库实例
   */
  public async getDB(): Promise<Database> {
    const db = await this.getRawDB();
    await this.ensureCoreSchema();
    return db;
  }

  /**
   * 检测数据库表是否存在
   * @since Beta v0.12.0
   * @param tableName - 表名
   * @returns 表是否存在
   */
  public async hasTable(tableName: string): Promise<boolean> {
    const db = await this.getDB();
    const result = await db.select<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = $1;",
      [tableName],
    );
    return result.length > 0;
  }

  private async getRawDB(): Promise<Database> {
    if (this.db === null) this.db = await Database.load(this.dbPath);
    return this.db;
  }

  /**
   * 在任意数据库消费者运行前校验并迁移核心表结构。
   * @since Beta v0.12.0
   * @returns 无返回值
   */
  private async ensureCoreSchema(): Promise<void> {
    if (this.coreSchemaUpdate === null) this.coreSchemaUpdate = this.migrateCoreSchema();
    try {
      await this.coreSchemaUpdate;
    } catch (error) {
      this.coreSchemaUpdate = null;
      throw error;
    }
  }

  private async migrateCoreSchema(): Promise<void> {
    const db = await this.getRawDB();
    try {
      // 首次初始化仍由现有建表清单负责；既有表会在下方逐项迁移。
      await db.execute(createTable);
      for (const migration of CoreSchemaMigrations) {
        switch (migration) {
          case "GameAccount.v2":
            await this.migrateGameAccountSchema();
            break;
          case "HardChallenge.v2":
            await this.migrateHardChallengeSchema();
            break;
          case "UserRecordRaw.v1":
            await this.migrateUserRecordRawSchema();
            break;
          case "Achievements.v2":
            await this.migrateAchievementsSchema();
            break;
        }
      }
      await db.execute(
        `INSERT INTO AppData (key, value, updated)
         VALUES ($1, $2, datetime('now', 'localtime'))
         ON CONFLICT(key) DO UPDATE SET
           value = $2,
           updated = datetime('now', 'localtime')
         WHERE AppData.value IS NOT $2;`,
        ["coreSchemaVersion", CoreSchemaVersion],
      );
    } catch (error) {
      const log = {
        scope: "Sqlite.coreSchema",
        migrations: CoreSchemaMigrations,
        message: error instanceof Error ? error.message : String(error),
      };
      await TGLogger.Error(JSON.stringify(log));
      showSnackbar.error(
        "数据库结构迁移失败。请备份数据库后重新启动应用，问题持续时请联系支持。",
        6000,
      );
      throw error;
    }
  }

  private async getTableColumns(tableName: string): Promise<Array<TableColumn>> {
    const db = await this.getRawDB();
    return await db.select<Array<TableColumn>>(`PRAGMA table_info(${tableName});`);
  }

  private async migrateGameAccountSchema(): Promise<void> {
    const db = await this.getRawDB();
    const columns = await this.getTableColumns("GameAccount");
    const columnMap = new Map(columns.map((column) => [column.name, column]));
    const hasExpectedColumns = GameAccountColumns.every((name) => columnMap.has(name));
    const hasExpectedPrimaryKey = ["uid", "gameBiz", "gameUid"].every(
      (name, index) => columnMap.get(name)?.pk === index + 1,
    );
    const identityColumnsAreRequired = ["uid", "gameBiz", "gameUid"].every(
      (name) => (columnMap.get(name)?.notnull ?? 0) !== 0,
    );
    if (hasExpectedColumns && hasExpectedPrimaryKey && identityColumnsAreRequired) return;

    const selectValues = GameAccountColumns.map((name) =>
      columnMap.has(name) ? `"${name}"` : `NULL AS "${name}"`,
    ).join(", ");
    const hasIdentityColumns = ["uid", "gameBiz", "gameUid"].every((name) => columnMap.has(name));
    const quarantineCountQuery = hasIdentityColumns
      ? `SELECT COUNT(*) AS count
         FROM GameAccount
         WHERE uid IS NULL OR trim(uid) = ''
            OR gameBiz IS NULL OR trim(gameBiz) = ''
            OR gameUid IS NULL OR trim(gameUid) = '';`
      : "SELECT COUNT(*) AS count FROM GameAccount;";
    const quarantineCountResult = await db.select<Array<{ count: number }>>(quarantineCountQuery);
    const quarantineCount = quarantineCountResult[0]?.count ?? 0;
    const insertStatement = hasIdentityColumns
      ? `INSERT INTO GameAccount (${GameAccountColumns.join(", ")})
         SELECT ${selectValues}
         FROM ${GameAccountLegacyTable}
         WHERE uid IS NOT NULL AND trim(uid) <> ''
           AND gameBiz IS NOT NULL AND trim(gameBiz) <> ''
           AND gameUid IS NOT NULL AND trim(gameUid) <> '';`
      : undefined;
    const createStatement = `CREATE TABLE GameAccount (
      uid TEXT NOT NULL,
      gameBiz TEXT NOT NULL,
      gameUid TEXT NOT NULL,
      isChosen BOOLEAN,
      isOfficial BOOLEAN,
      level INTEGER,
      nickname TEXT,
      region TEXT,
      regionName TEXT,
      updated TEXT,
      PRIMARY KEY (uid, gameBiz, gameUid)
    );`;
    const statements: Array<TGApp.App.Sqlite.SqlStatement> = [
      { query: `ALTER TABLE GameAccount RENAME TO ${GameAccountLegacyTable};` },
      { query: createStatement },
    ];
    if (insertStatement !== undefined) statements.push({ query: insertStatement });
    await this.executeRawTransaction(statements);
    await TGLogger.Warn(
      JSON.stringify({
        scope: "Sqlite.GameAccountMigration",
        legacyTable: GameAccountLegacyTable,
        copiedIdentities: hasIdentityColumns,
      }),
    );
    if (quarantineCount > 0) {
      showSnackbar.warn(
        `有 ${quarantineCount} 条旧游戏账号关系无法确认归属，已安全保留。请重新拉取/刷新账号关系。`,
        6000,
      );
    }
  }

  private async migrateHardChallengeSchema(): Promise<void> {
    const columns = await this.getTableColumns("HardChallenge");
    const columnNames = new Set(columns.map((column) => column.name));
    const additions = <const>[
      { name: "single", sql: "ALTER TABLE HardChallenge ADD single TEXT;" },
      { name: "mp", sql: "ALTER TABLE HardChallenge ADD mp TEXT;" },
      { name: "blings", sql: "ALTER TABLE HardChallenge ADD blings TEXT;" },
    ];
    const statements = additions
      .filter((addition) => !columnNames.has(addition.name))
      .map<TGApp.App.Sqlite.SqlStatement>((addition) => ({ query: addition.sql }));
    if (statements.length > 0) await this.executeRawTransaction(statements);
  }

  private async migrateUserRecordRawSchema(): Promise<void> {
    const columns = await this.getTableColumns("UserRecordRaw");
    const columnMap = new Map(columns.map((column) => [column.name, column]));
    const hasExpectedColumns = UserRecordRawColumns.every((name) => columnMap.has(name));
    const hasExpectedPrimaryKey = columnMap.get("uid")?.pk === 1;
    const columnsAreRequired = UserRecordRawColumns.every(
      (name) => (columnMap.get(name)?.notnull ?? 0) !== 0,
    );
    if (hasExpectedColumns && hasExpectedPrimaryKey && columnsAreRequired) return;
    throw new Error("UserRecordRaw 表结构不符合预期");
  }

  private async migrateAchievementsSchema(): Promise<void> {
    const db = await this.getRawDB();
    const columns = await this.getTableColumns("Achievements");
    const columnNames = new Set(columns.map((column) => column.name));
    const beforeCountResult = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM Achievements;",
    );
    const beforeCount = beforeCountResult[0]?.count ?? 0;
    const statements: Array<TGApp.App.Sqlite.SqlStatement> = [];
    if (!columnNames.has("status")) {
      statements.push({ query: "ALTER TABLE Achievements ADD status INTEGER;" });
      statements.push({
        query: `UPDATE Achievements
                SET status = CASE
                  WHEN isCompleted = 1 AND progress <> 0 THEN 3
                  WHEN isCompleted = 1 THEN 2
                  ELSE 1
                END
                WHERE status IS NULL;`,
      });
    }
    if (statements.length > 0) await this.executeRawTransaction(statements);
    const afterCountResult = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM Achievements;",
    );
    const afterCount = afterCountResult[0]?.count ?? 0;
    if (beforeCount !== afterCount) {
      throw new Error(`Achievements 迁移前后行数不一致：${beforeCount} / ${afterCount}`);
    }
  }

  /**
   * 在同一数据库连接中执行事务语句
   * @since Beta v0.12.0
   * @param statements - 按顺序执行的 SQL 语句
   * @returns 无返回值
   */
  public async executeTransaction(
    statements: ReadonlyArray<TGApp.App.Sqlite.SqlStatement>,
  ): Promise<void> {
    await this.getDB();
    await this.executeRawTransaction(statements);
  }

  private async executeRawTransaction(
    statements: ReadonlyArray<TGApp.App.Sqlite.SqlStatement>,
  ): Promise<void> {
    await this.getRawDB();
    await invoke("execute_sql_transaction", { db: this.dbPath, statements });
  }

  /**
   * 检测是否需要创建数据库
   * @since Beta v0.12.1
   * @returns 是否需要创建数据库
   */
  public async check(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
      const res: Array<{ name: string }> = await db.select(sqlT);
      if (!this.tables.every((item) => res.map((i) => i.name).includes(item))) return false;
      const [gameAccountColumns, hardChallengeColumns, userRecordRawColumns, achievementsColumns] =
        await Promise.all([
          this.getTableColumns("GameAccount"),
          this.getTableColumns("HardChallenge"),
          this.getTableColumns("UserRecordRaw"),
          this.getTableColumns("Achievements"),
        ]);
      const gameAccountMap = new Map(gameAccountColumns.map((column) => [column.name, column]));
      const gameAccountIsValid =
        GameAccountColumns.every((name) => gameAccountMap.has(name)) &&
        ["uid", "gameBiz", "gameUid"].every(
          (name, index) => gameAccountMap.get(name)?.pk === index + 1,
        ) &&
        ["uid", "gameBiz", "gameUid"].every(
          (name) => (gameAccountMap.get(name)?.notnull ?? 0) !== 0,
        );
      const hardChallengeMap = new Map(hardChallengeColumns.map((column) => [column.name, column]));
      const hardChallengeIsValid =
        HardChallengeColumns.every((name) => hardChallengeMap.has(name)) &&
        hardChallengeMap.get("uid")?.pk === 1 &&
        hardChallengeMap.get("id")?.pk === 2;
      const userRecordRawMap = new Map(userRecordRawColumns.map((column) => [column.name, column]));
      const userRecordRawIsValid =
        UserRecordRawColumns.every((name) => userRecordRawMap.has(name)) &&
        userRecordRawMap.get("uid")?.pk === 1 &&
        UserRecordRawColumns.every((name) => (userRecordRawMap.get(name)?.notnull ?? 0) !== 0);
      const achievementsMap = new Map(achievementsColumns.map((column) => [column.name, column]));
      const achievementsIsValid =
        AchievementsColumns.every((name) => achievementsMap.has(name)) &&
        achievementsMap.get("id")?.pk === 1 &&
        achievementsMap.get("uid")?.pk === 2;
      if (
        !gameAccountIsValid ||
        !hardChallengeIsValid ||
        !userRecordRawIsValid ||
        !achievementsIsValid
      ) {
        return false;
      }
      const appVersion = await db.select<Array<{ key: string }>>(
        "SELECT key FROM AppData WHERE key = $1;",
        ["appVersion"],
      );
      return appVersion.length > 0;
    } catch (e) {
      await TGLogger.Error(JSON.stringify(e));
      throw e;
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
   * @since Beta v0.12.0
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
          // 表名只来自受控白名单，SQLite 不支持以绑定参数传入标识符。
          for (const tableName of [...this.tables, ...LegacyTablesForReset]) {
            await db.execute(`DROP TABLE IF EXISTS "${tableName}";`);
          }
          await db.execute("COMMIT;");
        } catch (innerErr) {
          console.error(innerErr);
          try {
            await db.execute("ROLLBACK;");
          } catch (rollbackError) {
            console.error(rollbackError);
          }
          throw innerErr;
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
        throw err;
      }
    }
  }
}

const TGSqlite = Sqlite.getInstance();

export default TGSqlite;
