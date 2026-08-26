/**
 * 用户背包角色模块
 * @since Beta v0.11.5
 */

import fmtUtil from "@utils/fmtUtil.js";

import TGSqlite from "../index.js";

/**
 * 保存Yae获取的角色数据
 * @since Beta v0.11.5
 * @param uid - 存档UID
 * @param list - 角色数据列表
 * @returns 无返回值
 */
async function saveYaeData(uid: number, list: Array<TGApp.Plugins.Yae.AvatarInfo>): Promise<void> {
  if (list.length === 0) return;
  const now = Date.now();
  const updated = fmtUtil.dateTime(now);
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = list.map((item) => ({
    query: `INSERT INTO UserBagAvatar(uid, rid, equips, raw, updated)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT(uid, rid) DO UPDATE
                SET equips = $3, raw = $4, updated = $5;`,
    values: [
      uid,
      item.avatar_id,
      JSON.stringify(item.equip_guid_list),
      JSON.stringify(item),
      updated,
    ],
  }));
  await TGSqlite.executeTransaction(statements);
}

/**
 * 获取指定UID的角色数据
 * @since Beta v0.11.5
 * @param uid - 存档UID
 * @returns 角色数据列表
 */
async function getByUid(uid: number): Promise<Array<TGApp.Sqlite.UserBag.AvatarTable>> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<TGApp.Sqlite.UserBag.AvatarRaw>>(
    "SELECT * FROM UserBagAvatar WHERE uid = $1;",
    [uid],
  );
  return res.map((row) => ({
    uid: row.uid,
    rid: row.rid,
    equips: <Array<string>>JSON.parse(row.equips),
    raw: <TGApp.Plugins.Yae.AvatarInfo>JSON.parse(row.raw),
    updated: row.updated,
  }));
}

/**
 * 获取所有有角色数据的UID列表
 * @since Beta v0.11.5
 * @returns UID列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<{ uid: number }>>("SELECT DISTINCT uid FROM UserBagAvatar");
  return res.map((u) => u.uid);
}

/**
 * 获取装备GUID到角色ID的映射
 * @since Beta v0.11.5
 * @param uid - 存档UID
 * @returns 装备GUID到角色ID映射
 */
async function getEquipMap(uid: number): Promise<Map<string, number>> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<Pick<TGApp.Sqlite.UserBag.AvatarRaw, "rid" | "equips">>>(
    "SELECT rid, equips FROM UserBagAvatar WHERE uid = $1;",
    [uid],
  );
  const map = new Map<string, number>();
  for (const row of res) {
    const guids = <Array<string>>JSON.parse(row.equips);
    for (const guid of guids) {
      map.set(guid, row.rid);
    }
  }
  return map;
}

/**
 * 删除指定UID的所有角色数据
 * @since Beta v0.11.5
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagAvatar WHERE uid = $1;", [uid]);
}

const TSUserBagAvatar = {
  saveYaeData,
  getByUid,
  getAllUid,
  getEquipMap,
  delUid,
};

export default TSUserBagAvatar;
