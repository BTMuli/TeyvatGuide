/**
 * 用户背包武器模块
 * @since Beta v0.10.5
 */

import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

/**
 * 获取插入或更新武器数据的SQL语句
 * @since Beta v0.10.5
 * @param tb - 武器表数据
 * @returns SQL语句
 */
function getInsertSql(tb: TGApp.Sqlite.UserBag.WeaponRaw): string {
  return `
      INSERT INTO UserBagWeapon(uid, guid, id, info, updated)
      VALUES (${tb.uid}, '${tb.guid}', ${tb.id}, '${tb.info}', '${tb.updated}')
      ON CONFLICT(uid, guid) DO UPDATE
          SET id      = ${tb.id},
              info    = '${tb.info}',
              updated = '${tb.updated}';
  `;
}

/**
 * 插入或更新武器数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 武器GUID
 * @param itemId - 武器ID
 * @param info - 武器信息
 * @returns 无返回值
 */
async function insertWeapon(
  uid: number,
  guid: string,
  itemId: number,
  info: TGApp.Plugins.Yae.WeaponInfo,
): Promise<void> {
  const now = Date.now();
  const newTable: TGApp.Sqlite.UserBag.WeaponRaw = {
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
 * 获取所有有武器数据的UID列表
 * @since Beta v0.10.5
 * @returns UID列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserBagWeapon");
  return res.map((u) => u.uid);
}

/**
 * 删除指定UID的所有武器数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagWeapon WHERE uid = ?;", [uid]);
}

/**
 * 删除指定UID和GUID的武器数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 武器GUID
 * @returns 无返回值
 */
async function deleteWeapon(uid: number, guid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagWeapon WHERE uid = ? AND guid = ?;", [uid, guid]);
}

/**
 * 解析武器表原始数据
 * @since Beta v0.10.5
 * @param raw - 原始数据
 * @returns 解析后的数据
 */
function parseWeapon(raw: TGApp.Sqlite.UserBag.WeaponRaw): TGApp.Sqlite.UserBag.WeaponTable {
  return {
    ...raw,
    info: <TGApp.Plugins.Yae.WeaponInfo>JSON.parse(raw.info),
  };
}

/**
 * 获取武器数据
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @param guid - 武器GUID（可选）
 * @returns 武器数据列表
 */
async function getWeapon(
  uid: number,
  guid?: string,
): Promise<Array<TGApp.Sqlite.UserBag.WeaponTable>> {
  const db = await TGSqlite.getDB();
  let res: Array<TGApp.Sqlite.UserBag.WeaponRaw>;
  if (guid !== undefined) {
    res = await db.select<Array<TGApp.Sqlite.UserBag.WeaponRaw>>(
      "SELECT * FROM UserBagWeapon WHERE uid = ? AND guid = ?;",
      [uid, guid],
    );
  } else {
    res = await db.select<Array<TGApp.Sqlite.UserBag.WeaponRaw>>(
      "SELECT * FROM UserBagWeapon WHERE uid =?;",
      [uid],
    );
  }
  return res.map(parseWeapon);
}

/**
 * 获取武器GUID集合
 * @since Beta v0.10.5
 * @param uid - 存档UID
 * @returns GUID集合
 */
async function getWeaponSet(uid: number): Promise<Set<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ guid: string }>;
  const res = await db.select<resType>("SELECT guid FROM UserBagWeapon WHERE uid = ?;", [uid]);
  return new Set(res.map((r) => r.guid));
}

/**
 * 保存Yae获取的武器数据
 * @since Beta v0.10.5
 * @remarks 逻辑：先获取本地guid集合，遍历yae数据时存在的更新并移除，不存在的插入，最后删除集合中剩余的
 * @param uid - 存档UID
 * @param list - 武器数据列表
 * @returns 操作结果统计
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.BagItemWeapon>,
): Promise<void> {
  const localGuids = await getWeaponSet(uid);
  for (const item of list) {
    const guid = item.info.guid;
    if (localGuids.has(guid)) {
      localGuids.delete(guid);
      await insertWeapon(uid, guid, item.item_id, item.info);
    } else {
      await insertWeapon(uid, guid, item.item_id, item.info);
    }
  }
  for (const guid of localGuids) {
    await deleteWeapon(uid, guid);
  }
}

const TSUserBagWeapon = {
  getAllUid,
  delUid,
  saveYaeData,
  getWeapon,
  insertWeapon,
};

export default TSUserBagWeapon;
