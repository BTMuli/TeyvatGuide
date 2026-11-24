/**
 * 用户背包角色模块
 * @since Beta v0.14.1
 */

import fmtUtil from "@utils/display/fmtUtil.js";

import TGSqlite from "../index.js";

/**
 * 按 Yae 快照同步当前存档正式拥有的角色。
 * @since Beta v0.14.1
 * @param uid - 存档UID
 * @param list - 角色数据列表
 * @returns 导入的角色数量
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.AvatarInfo>,
): Promise<number> {
  const owned = new Map(
    list.filter((item) => item.avatar_type === 1).map((item) => [item.avatar_id, item]),
  );
  // 类型字段缺失或未解析时，保留已有角色记录。
  if (owned.size === 0) return 0;

  const updated = fmtUtil.dateTime(Date.now());
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = Array.from(owned.values(), (item) => ({
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
  // 有未知角色类型时，快照可能缺少可识别的正式角色。
  if (
    list.every(({ avatar_type }) => avatar_type === 1 || avatar_type === 2 || avatar_type === 3)
  ) {
    statements.push({
      query: `DELETE FROM UserBagAvatar
              WHERE uid = $1 AND rid NOT IN (SELECT value FROM json_each($2));`,
      values: [uid, JSON.stringify(Array.from(owned.keys()))],
    });
  }
  await TGSqlite.executeTransaction(statements);
  return owned.size;
}

/**
 * 获取指定UID的角色数据
 * @since Beta v0.12.0
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
 * @since Beta v0.12.0
 * @returns UID列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<{ uid: number }>>("SELECT DISTINCT uid FROM UserBagAvatar");
  return res.map((u) => u.uid);
}

/**
 * 获取装备GUID到角色ID的映射
 * @since Beta v0.12.0
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
 * @since Beta v0.12.0
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
