/**
 * 用户战绩模块
 * @since Beta v0.6.0
 */

import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";
import { transUserRecord } from "../utils/transUserRecord.js";

/**
 * 获取插入Sql
 * @since Beta v0.6.0
 * @param uid - 游戏UID
 * @param data - 战绩数据
 * @returns sql
 */
function getInsertSql(uid: number, data: TGApp.Sqlite.Record.TableRaw): string {
  return `
      INSERT INTO UserRecord(uid, role, avatars, stats, worldExplore, homes, updated)
      VALUES (${uid}, '${data.role}', '${data.avatars}', '${data.stats}',
              '${data.worldExplore}', '${data.homes}', '${data.updated}')
      ON CONFLICT(uid) DO UPDATE
          SET role         = '${data.role}',
              avatars      = '${data.avatars}',
              stats        = '${data.stats}',
              worldExplore = '${data.worldExplore}',
              homes        = '${data.homes}',
              updated      = '${data.updated}';
  `;
}

/**
 * 解析数据库数据
 * @since Beta v0.6.0
 * @param data - 数据库数据
 * @returns 渲染数据
 */
function parseRecord(data: TGApp.Sqlite.Record.TableRaw): TGApp.Sqlite.Record.TableTrans {
  return {
    uid: data.uid,
    role: JSON.parse(data.role),
    avatars: JSON.parse(data.avatars),
    stats: JSON.parse(data.stats),
    worldExplore: JSON.parse(data.worldExplore),
    homes: JSON.parse(data.homes),
    updated: data.updated,
  };
}

/**
 * 转换数据库数据
 * @since Beta v0.6.0
 * @param uid - 游戏UID
 * @param data - 战绩数据
 * @returns 数据库数据
 */
function transRecord(uid: number, data: TGApp.Game.Record.FullData): TGApp.Sqlite.Record.TableRaw {
  const transData = transUserRecord(uid, data);
  return {
    uid: uid,
    role: JSON.stringify(transData.role),
    avatars: JSON.stringify(transData.avatars),
    stats: JSON.stringify(transData.stats),
    worldExplore: JSON.stringify(transData.worldExplore),
    homes: JSON.stringify(transData.homes),
    updated: timestampToDate(new Date().getTime()),
  };
}

/**
 * 获取UID列表
 * @since Beta v0.6.0
 * @returns uid列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserRecord;");
  return res.map((e) => e.uid);
}

/**
 * 获取指定UID的战绩数据
 * @since Beta v0.6.0
 * @param uid - 游戏UID
 * @returns 战绩数据
 */
async function getRecord(uid: number): Promise<TGApp.Sqlite.Record.TableTrans | false> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<TGApp.Sqlite.Record.TableRaw>>(
    "SELECT * FROM UserRecord WHERE uid = ?;",
    [uid],
  );
  if (res.length === 0) return false;
  return parseRecord(res[0]);
}

/**
 * 保存战绩数据
 * @since Beta v0.6.0
 * @param uid - 游戏UID
 * @param data - 战绩数据
 * @returns 无返回值
 */
async function saveRecord(uid: number, data: TGApp.Game.Record.FullData): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = getInsertSql(uid, transRecord(uid, data));
  await db.execute(sql);
}

/**
 * 删除战绩数据
 * @since Beta v0.6.0
 * @param uid - uid
 * @returns 无返回值
 */
async function deleteUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserRecord WHERE uid=?;", [uid]);
}

const TSUserRecord = {
  getAllUid,
  getRecord,
  saveRecord,
  deleteUid,
};

export default TSUserRecord;
