/**
 * 背包材料历史表迁移回归检查。
 * @since Beta v0.13.1
 */

import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 测试事务语句。
 * @since Beta v0.13.1
 */
type SqlStatement = {
  query: string;
  values?: Array<SQLInputValue>;
};

/**
 * 内存数据库适配器。
 * @since Beta v0.13.1
 */
type SqliteAdapter = {
  execute(query: string, values?: Array<SQLInputValue>): Promise<void>;
  select<T>(query: string, values?: Array<SQLInputValue>): Promise<T>;
};

let database: DatabaseSync;
let adapter: SqliteAdapter;

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(async () => adapter),
  },
}));

vi.mock("@tauri-apps/api", () => ({
  app: {
    getVersion: vi.fn(async () => "0.13.0"),
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args: { statements: Array<SqlStatement> }) => {
    if (command !== "execute_sql_transaction") throw new Error(`unexpected invoke: ${command}`);
    database.exec("BEGIN;");
    try {
      for (const statement of args.statements) {
        const prepared = database.prepare(statement.query);
        prepared.run(...(statement.values ?? []));
      }
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }),
}));

vi.mock("@comp/func/snackbar.js", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@utils/system/TGLogger.js", () => ({
  default: {
    Error: vi.fn(async () => undefined),
    Warn: vi.fn(async () => undefined),
  },
}));

/**
 * 创建内存数据库适配器。
 * @since Beta v0.13.1
 * @param nextDatabase - 内存数据库
 * @returns 数据库适配器
 */
function createAdapter(nextDatabase: DatabaseSync): SqliteAdapter {
  /**
   * 绑定参数并执行 SQL。
   * @since Beta v0.13.1
   * @param statement - 预编译语句
   * @param query - SQL 语句
   * @param values - SQL 参数
   */
  function bind(
    statement: ReturnType<DatabaseSync["prepare"]>,
    query: string,
    values: Array<SQLInputValue>,
  ): void {
    if (/\$\d+/.test(query)) {
      statement.run(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value])));
      return;
    }
    statement.run(...values);
  }

  /**
   * 查询内存数据库。
   * @since Beta v0.13.1
   * @param query - SQL 语句
   * @param values - SQL 参数
   * @returns 查询结果
   */
  function select<T>(query: string, values: Array<SQLInputValue>): T {
    const statement = nextDatabase.prepare(query);
    if (/\$\d+/.test(query)) {
      const rows = statement.all(
        Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value])),
      );
      return <T>rows;
    }
    return <T>statement.all(...values);
  }

  return {
    execute: async (query: string, values: Array<SQLInputValue> = []): Promise<void> => {
      if (values.length > 0) {
        bind(nextDatabase.prepare(query), query, values);
        return;
      }
      nextDatabase.exec(query);
    },
    select: async <T>(query: string, values: Array<SQLInputValue> = []): Promise<T> =>
      select<T>(query, values),
  };
}

/**
 * 重新加载数据库模块以模拟应用重启。
 * @since Beta v0.13.1
 * @returns 新的数据库实例
 */
async function loadSqlite(): Promise<typeof import("../src/plugins/Sqlite/index.js").default> {
  vi.resetModules();
  return (await import("../src/plugins/Sqlite/index.js")).default;
}

/**
 * 创建旧版材料表。
 * @since Beta v0.13.1
 */
function createLegacyMaterialTable(): void {
  database.exec(`
    CREATE TABLE UserBagMaterial (
      uid INTEGER NOT NULL,
      id INTEGER NOT NULL,
      count INTEGER DEFAULT 0,
      records TEXT,
      updated TEXT,
      PRIMARY KEY (uid, id)
    );
  `);
}

/**
 * 插入旧版材料记录。
 * @since Beta v0.13.1
 * @param uid - 存档 UID
 * @param id - 材料 ID
 * @param count - 当前数量
 * @param records - JSON 历史记录
 * @param updated - 更新时间
 */
function insertLegacyMaterial(
  uid: number,
  id: number,
  count: number,
  records: string | null,
  updated: string,
): void {
  database
    .prepare(
      "INSERT INTO UserBagMaterial(uid, id, count, records, updated) VALUES (?, ?, ?, ?, ?);",
    )
    .run(uid, id, count, records, updated);
}

beforeEach(() => {
  database = new DatabaseSync(":memory:");
  adapter = createAdapter(database);
});

afterEach(() => {
  database.close();
});

describe("UserBagMaterialRecord schema migration", () => {
  it("creates the split material schema for a fresh database", async () => {
    const sqlite = await loadSqlite();
    const db = await sqlite.getDB();

    const materialColumns = await db.select<Array<{ name: string }>>(
      "PRAGMA table_info(UserBagMaterial);",
    );
    expect(materialColumns.map((column) => column.name)).toEqual(["uid", "id", "count", "updated"]);

    const recordColumns = await db.select<Array<{ name: string; required: number; pk: number }>>(
      "SELECT name, \"notnull\" AS required, pk FROM pragma_table_info('UserBagMaterialRecord');",
    );
    expect(recordColumns).toEqual([
      { name: "uid", required: 1, pk: 1 },
      { name: "materialId", required: 1, pk: 2 },
      { name: "time", required: 1, pk: 3 },
      { name: "count", required: 1, pk: 0 },
      { name: "manual", required: 1, pk: 0 },
    ]);
  });

  it("migrates histories for every UID and is idempotent", async () => {
    createLegacyMaterialTable();
    insertLegacyMaterial(
      1001,
      101,
      12,
      JSON.stringify([
        { count: 10, time: 1000 },
        { count: 12, time: 1001, manual: true },
      ]),
      "2026-11-10 10:00:00",
    );
    insertLegacyMaterial(1002, 101, 0, null, "");
    insertLegacyMaterial(1002, 102, 5, "[]", "2026-11-10 10:01:00");

    const sqlite = await loadSqlite();
    const db = await sqlite.getDB();

    const columns = await db.select<Array<{ name: string }>>("PRAGMA table_info(UserBagMaterial);");
    expect(columns.map((column) => column.name)).toEqual(["uid", "id", "count", "updated"]);

    const records = await db.select<Array<Record<string, number>>>(
      "SELECT uid, materialId, time, count, manual FROM UserBagMaterialRecord ORDER BY uid, materialId, time;",
    );
    expect(records).toEqual([
      { uid: 1001, materialId: 101, time: 1000, count: 10, manual: 0 },
      { uid: 1001, materialId: 101, time: 1001, count: 12, manual: 1 },
    ]);

    const inventory = await db.select<Array<Record<string, number | string>>>(
      "SELECT uid, id, count, updated FROM UserBagMaterial ORDER BY uid, id;",
    );
    expect(inventory).toEqual([
      { uid: 1001, id: 101, count: 12, updated: "2026-11-10 10:00:00" },
      { uid: 1002, id: 101, count: 0, updated: "" },
      { uid: 1002, id: 102, count: 5, updated: "2026-11-10 10:01:00" },
    ]);

    const reloadedSqlite = await loadSqlite();
    await reloadedSqlite.getDB();
    const recordCount = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM UserBagMaterialRecord;",
    );
    expect(recordCount[0]?.count).toBe(2);
  });

  it("rolls back malformed history and retries after repair", async () => {
    createLegacyMaterialTable();
    insertLegacyMaterial(1001, 101, 12, '[{"count":12,"time":1001}]', "updated");
    insertLegacyMaterial(1002, 102, 5, "malformed", "updated");

    const sqlite = await loadSqlite();
    await expect(sqlite.getDB()).rejects.toThrow();

    const legacyColumns = <Array<{ name: string }>>(
      database.prepare("PRAGMA table_info(UserBagMaterial);").all()
    );
    expect(legacyColumns.map((column) => column.name)).toContain("records");
    expect(database.prepare("SELECT COUNT(*) AS count FROM UserBagMaterialRecord;").get()).toEqual({
      count: 0,
    });
    expect(
      database.prepare("SELECT count FROM UserBagMaterial WHERE uid = 1001 AND id = 101;").get(),
    ).toEqual({ count: 12 });

    database
      .prepare("UPDATE UserBagMaterial SET records = ? WHERE uid = 1002 AND id = 102;")
      .run('[{"count":5,"time":1002}]');
    await sqlite.getDB();
    expect(database.prepare("SELECT COUNT(*) AS count FROM UserBagMaterialRecord;").get()).toEqual({
      count: 2,
    });
  });

  it("drops the history table during reset and recreates it", async () => {
    createLegacyMaterialTable();
    insertLegacyMaterial(1001, 101, 12, '[{"count":12,"time":1001}]', "updated");

    const sqlite = await loadSqlite();
    await sqlite.getDB();
    await sqlite.reset();

    expect(database.prepare("SELECT COUNT(*) AS count FROM UserBagMaterialRecord;").get()).toEqual({
      count: 0,
    });
    const columns = <Array<{ name: string }>>(
      database.prepare("PRAGMA table_info(UserBagMaterial);").all()
    );
    expect(columns.map((column) => column.name)).toEqual(["uid", "id", "count", "updated"]);
  });
});
