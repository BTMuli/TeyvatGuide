/**
 * 用户背包圣遗物模块
 * @since Beta v0.10.5
 */

import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

/**
 * 获取插入或更新圣遗物数据的SQL语句
 * @since Beta v0.10.5
 * @param tb - 圣遗物表数据
 * @returns SQL语句
 */
function getInsertSql(tb: TGApp.Sqlite.UserBag.RelicRaw): string {
  return `
      INSERT INTO UserBagRelic(uid, guid, id, info, updated)
      VALUES (${tb.uid}, '${tb.guid}', ${tb.id}, '${tb.info}', '${tb.updated}')
      ON CONFLICT(uid, guid) DO UPDATE
          SET id      = ${tb.id},
              info    = '${tb.info}',
              updated = '${tb.updated}';
  `;
}

/**
 * 插入或更新圣遗物数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 圣遗物GUID
 * @param itemId - 圣遗物ID
 * @param info - 圣遗物信息
 * @returns 无返回值
 */
async function insertRelic(
  uid: number,
  guid: string,
  itemId: number,
  info: TGApp.Plugins.Yae.ReliquaryInfo,
): Promise<void> {
  const now = Date.now();
  const newTable: TGApp.Sqlite.UserBag.RelicRaw = {
    uid: uid,
    guid: guid,
    id: itemId,
    info: JSON.stringify(info),
    updated: timestampToDate(now),
  };
  const db = await TGSqlite.getDB();
  const sql = getInsertSql(newTable);
  await db.execute(sql);
}

/**
 * 获取所有有圣遗物数据的UID列表
 * @since Beta v0.10.5
 * @returns UID列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserBagRelic");
  return res.map((u) => u.uid);
}

/**
 * 删除指定UID的所有圣遗物数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagRelic WHERE uid = ?;", [uid]);
}

/**
 * 删除指定UID和GUID的圣遗物数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 圣遗物GUID
 * @returns 无返回值
 */
async function deleteRelic(uid: number, guid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagRelic WHERE uid = ? AND guid = ?;", [uid, guid]);
}

/**
 * 解析圣遗物表原始数据
 * @since Beta v0.10.5
 * @param raw - 原始数据
 * @returns 解析后的数据
 */
function parseRelic(raw: TGApp.Sqlite.UserBag.RelicRaw): TGApp.Sqlite.UserBag.RelicTable {
  return {
    ...raw,
    info: <TGApp.Plugins.Yae.ReliquaryInfo>JSON.parse(raw.info),
  };
}

/**
 * 获取圣遗物数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 圣遗物GUID（可选）
 * @returns 圣遗物数据列表
 */
async function getRelic(
  uid: number,
  guid?: string,
): Promise<Array<TGApp.Sqlite.UserBag.RelicTable>> {
  const db = await TGSqlite.getDB();
  let res: Array<TGApp.Sqlite.UserBag.RelicRaw>;
  if (guid !== undefined) {
    res = await db.select<Array<TGApp.Sqlite.UserBag.RelicRaw>>(
      "SELECT * FROM UserBagRelic WHERE uid = ? AND guid = ?;",
      [uid, guid],
    );
  } else {
    res = await db.select<Array<TGApp.Sqlite.UserBag.RelicRaw>>(
      "SELECT * FROM UserBagRelic WHERE uid =?;",
      [uid],
    );
  }
  return res.map(parseRelic);
}

/**
 * 获取圣遗物GUID集合
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @returns GUID集合
 */
async function getRelicSet(uid: number): Promise<Set<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ guid: string }>;
  const res = await db.select<resType>("SELECT guid FROM UserBagRelic WHERE uid = ?;", [uid]);
  return new Set(res.map((r) => r.guid));
}

/**
 * 保存Yae获取的圣遗物数据
 * @since Beta v0.10.5
 * @remarks 逻辑：先获取本地guid集合，遍历yae数据时存在的更新并移除，不存在的插入，最后删除集合中剩余的
 * @param uid - 存档UID
 * @param list - 圣遗物数据列表
 * @returns 无返回值
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.BagItemRelic>,
): Promise<void> {
  const localGuids = await getRelicSet(uid);
  for (const item of list) {
    const guid = item.info.guid;
    if (localGuids.has(guid)) {
      localGuids.delete(guid);
      await insertRelic(uid, guid, item.item_id, item.info);
    } else {
      await insertRelic(uid, guid, item.item_id, item.info);
    }
  }
  for (const guid of localGuids) {
    await deleteRelic(uid, guid);
  }
}

const TSUserBagRelic = {
  getAllUid,
  delUid,
  saveYaeData,
  getRelic,
  insertRelic,
};

export default TSUserBagRelic;
