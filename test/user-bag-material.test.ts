/**
 * 用户背包材料存储回归测试
 * @since Beta v0.13.1
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { DatabaseSync } = <typeof import("node:sqlite")>process.getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(":memory:");

  /**
   * SQLite 内存数据库可接受的绑定值
   * @since Beta v0.13.1
   */
  type SqlInputValue = null | number | bigint | string | NodeJS.ArrayBufferView;

  /**
   * 将应用层参数数组转换为 SQLite 编号参数对象
   * @since Beta v0.13.1
   * @param values - SQL 参数
   * @returns SQLite 命名参数
   */
  function bind(values: Array<SqlInputValue>): Record<string, SqlInputValue> {
    return Object.fromEntries(values.map((value, index) => [String(index + 1), value]));
  }
  const databaseAdapter = {
    /**
     * 查询内存数据库。
     * @since Beta v0.13.1
     * @param query - SQL 语句
     * @param values - SQL 参数
     * @returns 查询结果
     */
    select<T>(query: string, values: Array<SqlInputValue> = []): Promise<T> {
      return Promise.resolve(<T>db.prepare(query).all(bind(values)));
    },
    /**
     * 执行内存数据库语句。
     * @since Beta v0.13.1
     * @param query - SQL 语句
     * @param values - SQL 参数
     * @returns 影响的记录数
     */
    execute(query: string, values: Array<SqlInputValue> = []): Promise<{ rowsAffected: number }> {
      const result = db.prepare(query).run(bind(values));
      return Promise.resolve({ rowsAffected: Number(result.changes) });
    },
  };
  const sqlite = {
    /**
     * 提供内存数据库适配器。
     * @since Beta v0.13.1
     * @returns 数据库适配器
     */
    async getDB(): Promise<typeof databaseAdapter> {
      return databaseAdapter;
    },
    /**
     * 在内存数据库中原子执行语句。
     * @since Beta v0.13.1
     * @param statements - SQL 语句
     */
    async executeTransaction(
      statements: Array<{ query: string; values?: Array<SqlInputValue> }>,
    ): Promise<void> {
      db.exec("BEGIN;");
      try {
        for (const statement of statements) {
          db.prepare(statement.query).run(bind(statement.values ?? []));
        }
        db.exec("COMMIT;");
      } catch (error) {
        db.exec("ROLLBACK;");
        throw error;
      }
    },
  };
  return {
    db,
    sqlite,
    platform: vi.fn(() => "windows"),
    calculateInventory: vi.fn(() => new Map<number, number>()),
    /**
     * 控制历史插入失败的测试触发器。
     * @since Beta v0.13.1
     * @param value - 是否使插入失败
     */
    setHistoryFailure(value: boolean): void {
      db.prepare("UPDATE TestControl SET failHistoryInsert = $1;").run({ 1: value ? 1 : 0 });
    },
  };
});

vi.mock("../src/plugins/Sqlite/index.js", () => ({ default: mocks.sqlite }));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: mocks.platform }));
vi.mock("@utils/display/fmtUtil.js", () => ({
  default: { dateTime: (value: number) => new Date(value).toISOString() },
}));
vi.mock("@utils/game/cultivationPlan.js", () => ({
  getCalculateInventory: mocks.calculateInventory,
}));
vi.mock("@/data/index.js", () => ({
  WikiMaterialData: [{ id: 101, type: "素材" }],
}));

import TSUserBagMaterial from "../src/plugins/Sqlite/modules/userBagMaterial.js";

/**
 * 重置内存数据库
 * @since Beta v0.13.1
 * @returns 无返回值
 */
function resetDatabase(): void {
  mocks.db.exec("DROP TABLE IF EXISTS UserBagMaterialRecord;");
  mocks.db.exec("DROP TABLE IF EXISTS UserBagMaterial;");
  mocks.db.exec("DROP TABLE IF EXISTS TestControl;");
  mocks.db.exec(`
    CREATE TABLE TestControl (failHistoryInsert INTEGER NOT NULL);
    INSERT INTO TestControl VALUES (0);
    CREATE TABLE UserBagMaterial (
      uid INTEGER NOT NULL,
      id INTEGER NOT NULL,
      count INTEGER DEFAULT 0,
      updated TEXT,
      PRIMARY KEY (uid, id)
    );
    CREATE TABLE UserBagMaterialRecord (
      uid INTEGER NOT NULL,
      materialId INTEGER NOT NULL,
      time INTEGER NOT NULL,
      count INTEGER NOT NULL,
      manual INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (uid, materialId, time)
    );
    CREATE TRIGGER FailHistoryInsert
    BEFORE INSERT ON UserBagMaterialRecord
    WHEN (SELECT failHistoryInsert FROM TestControl) = 1
    BEGIN
      SELECT RAISE(ABORT, 'history insert failed');
    END;
  `);
  mocks.setHistoryFailure(false);
}

describe("user bag material storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T00:00:00.000Z"));
    resetDatabase();
    mocks.platform.mockReturnValue("windows");
    mocks.calculateInventory.mockReturnValue(new Map<number, number>());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores current inventory separately from descending history", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(1, 101, 7, true);

    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual([
      {
        uid: 1,
        id: 101,
        count: 7,
        updated: "2026-11-10T00:00:01.000Z",
      },
    ]);
    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 7, time: 1794268801, manual: true },
      { count: 4, time: 1794268800 },
    ]);
  });

  it("rolls back inventory when history insertion fails", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    mocks.setHistoryFailure(true);

    await expect(TSUserBagMaterial.insertMaterial(1, 101, 7)).rejects.toThrow(
      "history insert failed",
    );
    mocks.setHistoryFailure(false);
    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual([
      {
        uid: 1,
        id: 101,
        count: 4,
        updated: "2026-11-10T00:00:00.000Z",
      },
    ]);
    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 4, time: 1794268800 },
    ]);
  });

  it("clears one material history while retaining its latest snapshot", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(1, 101, 7, true);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(2, 101, 9);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.deleteRecord(1, 101, 7);

    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 7, time: 1794268803 },
    ]);
    await expect(TSUserBagMaterial.getRecords(2, 101)).resolves.toEqual([
      { count: 9, time: 1794268802 },
    ]);
  });

  it("deletes one intermediate record without changing inventory", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(1, 101, 7, true);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(1, 101, 10);
    const inventory = await TSUserBagMaterial.getMaterial(1, 101);

    await expect(TSUserBagMaterial.deleteSingleRecord(1, 101, 1794268801)).resolves.toBe(true);
    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 10, time: 1794268802 },
      { count: 4, time: 1794268800 },
    ]);
    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual(inventory);
  });

  it("deletes the latest history without reverting inventory or touching other identities", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(1, 101, 7, true);
    await TSUserBagMaterial.insertMaterial(2, 101, 9);
    await TSUserBagMaterial.insertMaterial(1, 102, 12);
    const inventory = await TSUserBagMaterial.getMaterial(1, 101);

    await expect(TSUserBagMaterial.deleteSingleRecord(1, 101, 1794268801)).resolves.toBe(true);
    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 4, time: 1794268800 },
    ]);
    await expect(TSUserBagMaterial.getRecords(2, 101)).resolves.toEqual([
      { count: 9, time: 1794268801 },
    ]);
    await expect(TSUserBagMaterial.getRecords(1, 102)).resolves.toEqual([
      { count: 12, time: 1794268801 },
    ]);
    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual(inventory);
  });

  it("preserves the last record and reports missing records without affecting other users", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(2, 101, 9);

    await expect(TSUserBagMaterial.deleteSingleRecord(1, 101, 1794268800)).resolves.toBe(false);
    await expect(TSUserBagMaterial.deleteSingleRecord(1, 101, 1794268801)).resolves.toBe(false);
    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([
      { count: 4, time: 1794268800 },
    ]);
    await expect(TSUserBagMaterial.getRecords(2, 101)).resolves.toEqual([
      { count: 9, time: 1794268801 },
    ]);
  });

  it("deletes inventory and history for only the requested UID", async () => {
    await TSUserBagMaterial.insertMaterial(1, 101, 4);
    vi.advanceTimersByTime(1000);
    await TSUserBagMaterial.insertMaterial(2, 101, 9);

    await TSUserBagMaterial.delUid(1);

    await expect(TSUserBagMaterial.getRecords(1, 101)).resolves.toEqual([]);
    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual([]);
    await expect(TSUserBagMaterial.getRecords(2, 101)).resolves.toEqual([
      { count: 9, time: 1794268801 },
    ]);
  });

  it("persists API inventory on macOS without requiring an existing bag", async () => {
    mocks.platform.mockReturnValue("macos");
    mocks.calculateInventory.mockReturnValue(new Map([[101, 6]]));

    const result: TGApp.Game.Calculate.Result = {
      items: [],
      has_user_info: true,
      available_material: [],
      overall_consume: [],
      overall_material_consume: {
        avatar_consume: [],
        avatar_skill_consume: [],
        weapon_consume: [],
      },
      jump_url: "",
      single_role_result: [],
    };
    await expect(TSUserBagMaterial.saveCalculateData(1, result)).resolves.toBe(1);
    await expect(TSUserBagMaterial.getMaterial(1, 101)).resolves.toEqual([
      {
        uid: 1,
        id: 101,
        count: 6,
        updated: "2026-11-10T00:00:00.000Z",
      },
    ]);
  });
});
