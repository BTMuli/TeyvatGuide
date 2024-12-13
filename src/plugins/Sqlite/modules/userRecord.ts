/**
 * @file plugins/Sqlite/modules/userRecord.ts
 * @description Sqlite-用户战绩模块
 * @since Beta v0.6.0
 */

import TGSqlite from "@Sqlite/index.js";
import { transUserRecord } from "@Sqlite/utils/transUserRecord.js";

import { timestampToDate } from "@/utils/toolFunc.js";

/**
 * @description 获取插入Sql
 * @since Beta v0.6.0
 * @param {number} uid - 游戏UID
 * @param {TGApp.Sqlite.Record.SingleTable} data - 战绩数据
 * @returns {string}
 */
function getInsertSql(uid: number, data: TGApp.Sqlite.Record.SingleTable): string {
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
 * @description 解析数据库数据
 * @since Beta v0.6.0
 * @param {TGApp.Sqlite.Record.SingleTable} data - 数据库数据
 * @returns {TGApp.Sqlite.Record.RenderData} 渲染数据
 */
function parseRecord(data: TGApp.Sqlite.Record.SingleTable): TGApp.Sqlite.Record.RenderData {
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
 * @description 转换数据库数据
 * @since Beta v0.6.0
 * @param {number} uid - 游戏UID
 * @param {TGApp.Game.Record.FullData} data - 战绩数据
 * @returns {TGApp.Sqlite.Record.SingleTable}
 */
function transRecord(
  uid: number,
  data: TGApp.Game.Record.FullData,
): TGApp.Sqlite.Record.SingleTable {
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
 * @description 获取UID列表
 * @since Beta v0.6.0
 * @returns {Promise<number[]>}
 */
async function getAllUid(): Promise<number[]> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserRecord;");
  return res.map((e) => e.uid);
}

/**
 * @description 获取指定UID的战绩数据
 * @since Beta v0.6.0
 * @param {number} uid - 游戏UID
 * @returns {Promise<TGApp.Sqlite.Record.RenderData | false>}
 */
async function getRecord(uid: number): Promise<TGApp.Sqlite.Record.RenderData | false> {
  const db = await TGSqlite.getDB();
  const res = await db.select<TGApp.Sqlite.Record.SingleTable[]>(
    "SELECT * FROM UserRecord WHERE uid = ?;",
    [uid],
  );
  if (res.length === 0) return false;
  return parseRecord(res[0]);
}

/**
 * @description 保存战绩数据
 * @since Beta v0.6.0
 * @param {number} uid - 游戏UID
 * @param {TGApp.Game.Record.FullData} data - 战绩数据
 * @returns {Promise<void>}
 */
async function saveRecord(uid: number, data: TGApp.Game.Record.FullData): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = getInsertSql(uid, transRecord(uid, data));
  await db.execute(sql);
}

/**
 * @description 删除战绩数据
 * @since Beta v0.6.0
 * @param {number} uid
 * @returns {Promise<void>}
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
