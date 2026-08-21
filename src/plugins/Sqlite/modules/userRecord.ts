/**
 * 用户战绩模块
 * @since Beta v0.11.5
 */

import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";
import { transUserRecord } from "../utils/transUserRecord.js";

type UserRecordSource = "raw" | "legacy" | false;

/**
 * 解析序列化数据
 * @since Beta v0.11.5
 * @param value - 序列化数据
 * @param uid - 用户 UID
 * @param field - 字段名
 * @returns 解析结果
 */
function parseJson<T>(value: string, uid: number, field: string): T {
  try {
    return <T>JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`UID ${uid} 的战绩字段 ${field} 解析失败：${message}`, { cause: error });
  }
}

/**
 * 解析原始战绩数据并在读取侧转换
 * @since Beta v0.11.5
 * @param data - 原始数据库数据
 * @returns 渲染数据
 */
function parseRawRecord(data: TGApp.Sqlite.Record.RawTableRow): TGApp.Sqlite.Record.TableTrans {
  const rawData = parseJson<TGApp.Game.Record.FullData>(data.rawData, data.uid, "rawData");
  const transData = transUserRecord(rawData);
  return {
    uid: data.uid,
    ...transData,
    updated: data.updated,
  };
}

/**
 * 获取 UID 列表
 * @since Beta v0.11.5
 * @returns UID 列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  const hasLegacyTable = await TGSqlite.hasTable("UserRecord");
  type ResType = Array<{ uid: number }>;
  const query = hasLegacyTable
    ? `
      SELECT uid FROM UserRecordRaw
      UNION
      SELECT uid FROM UserRecord
      ORDER BY uid;
    `
    : "SELECT uid FROM UserRecordRaw ORDER BY uid;";
  const res = await db.select<ResType>(query);
  return res.map((item) => item.uid);
}

/**
 * 获取指定 UID 的战绩存储来源
 * @since Beta v0.11.5
 * @param uid - 游戏 UID
 * @returns 原始快照、旧架构数据或不存在
 */
async function getRecordSource(uid: number): Promise<UserRecordSource> {
  const db = await TGSqlite.getDB();
  const rawRes = await db.select<Array<{ uid: number }>>(
    "SELECT uid FROM UserRecordRaw WHERE uid = $1;",
    [uid],
  );
  if (rawRes.length > 0) return "raw";

  if (!(await TGSqlite.hasTable("UserRecord"))) return false;
  const legacyRes = await db.select<Array<{ uid: number }>>(
    "SELECT uid FROM UserRecord WHERE uid = $1;",
    [uid],
  );
  return legacyRes.length > 0 ? "legacy" : false;
}

/**
 * 获取指定 UID 的战绩数据
 * @since Beta v0.11.5
 * @param uid - 游戏 UID
 * @returns 战绩数据；旧架构数据不会在读取层转换
 */
async function getRecord(uid: number): Promise<TGApp.Sqlite.Record.TableTrans | false> {
  const db = await TGSqlite.getDB();
  const rawRes = await db.select<Array<TGApp.Sqlite.Record.RawTableRow>>(
    "SELECT uid, rawData, updated FROM UserRecordRaw WHERE uid = $1;",
    [uid],
  );
  const rawRecord = rawRes[0];
  if (rawRecord === undefined) return false;

  try {
    return parseRawRecord(rawRecord);
  } catch (error) {
    const rawParseError = error instanceof Error ? error : new Error(String(error));
    await TGLogger.Error(
      `[UserRecord][getRecord][${uid}] 原始战绩解析失败：${rawParseError.message}`,
    );
    throw rawParseError;
  }
}

/**
 * 保存原始战绩数据
 * @since Beta v0.11.5
 * @param uid - 游戏 UID
 * @param data - 接口原始战绩数据
 * @returns 无返回值
 * @remarks 仅写入首页接口返回的原始数据
 */
async function saveRawRecord(uid: number, data: TGApp.Game.Record.FullData): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(
    `INSERT INTO UserRecordRaw(uid, rawData, updated)
     VALUES ($1, $2, $3)
     ON CONFLICT(uid) DO UPDATE SET
       rawData = excluded.rawData,
       updated = excluded.updated;`,
    [uid, JSON.stringify(data), timestampToDate(new Date().getTime())],
  );
}

/**
 * 删除指定 UID 的旧架构战绩数据
 * @since Beta v0.11.5
 * @param uid - UID
 * @returns 无返回值
 */
async function deleteLegacyUid(uid: number): Promise<void> {
  if (!(await TGSqlite.hasTable("UserRecord"))) return;
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserRecord WHERE uid = $1;", [uid]);
  await dropLegacyTableIfEmpty();
}

/**
 * 旧架构数据清空后删除旧表
 * @since Beta v0.11.5
 * @returns 无返回值
 */
async function dropLegacyTableIfEmpty(): Promise<void> {
  if (!(await TGSqlite.hasTable("UserRecord"))) return;
  const db = await TGSqlite.getDB();
  const remaining = await db.select<Array<{ uid: number }>>("SELECT uid FROM UserRecord LIMIT 1;");
  if (remaining.length === 0) await db.execute("DROP TABLE IF EXISTS UserRecord;");
}

/**
 * 删除战绩数据
 * @since Beta v0.11.5
 * @param uid - UID
 * @returns 无返回值
 */
async function deleteUid(uid: number): Promise<void> {
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = [
    { query: "DELETE FROM UserRecordRaw WHERE uid = $1;", values: [uid] },
  ];
  if (await TGSqlite.hasTable("UserRecord")) {
    statements.push({ query: "DELETE FROM UserRecord WHERE uid = $1;", values: [uid] });
  }
  await TGSqlite.executeTransaction(statements);
  await dropLegacyTableIfEmpty();
}

const TSUserRecord = {
  getAllUid,
  getRecordSource,
  getRecord,
  saveRawRecord,
  deleteLegacyUid,
  deleteUid,
};

export default TSUserRecord;
