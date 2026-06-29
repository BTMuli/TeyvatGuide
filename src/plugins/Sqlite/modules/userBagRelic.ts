/**
 * 用户背包圣遗物模块
 * @since Beta v0.11.0
 */

import { wrMap } from "@/data/index.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";
import relicUtils from "@utils/relicUtils.js";

/**
 * 插入或更新圣遗物数据
 * @since Beta v0.11.0
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
  const relicInfo = wrMap[itemId];
  if (!relicInfo) return;
  const mainProp = relicUtils.mp(info.main_prop_id, relicInfo.star, info.level);
  if (!mainProp) return;
  const now = Date.now();
  const subProps = relicUtils.sp(info.append_prop_id_list);
  const brief = JSON.stringify(relicInfo);
  const mp = JSON.stringify(mainProp);
  const sp = JSON.stringify(subProps);
  const db = await TGSqlite.getDB();
  await db.execute(
    `
        INSERT INTO UserBagRelic (guid, uid, id, sets, brief, mp, sp, is_locked, is_marked, level, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uid, guid) DO UPDATE
            SET id        = EXCLUDED.id,
                sets      = EXCLUDED.sets,
                brief     = EXCLUDED.brief,
                mp        = EXCLUDED.mp,
                sp        = EXCLUDED.sp,
                is_locked = EXCLUDED.is_locked,
                is_marked = EXCLUDED.is_marked,
                level     = EXCLUDED.level,
                updated   = EXCLUDED.updated;
    `,
    [
      guid,
      uid,
      itemId,
      relicInfo.set,
      brief,
      mp,
      sp,
      info.is_locked ?? false,
      info.is_marked ?? false,
      info.level ?? 0,
      timestampToDate(now),
    ],
  );
}

/**
 * 获取所有有圣遗物数据的UID列表
 * @since Beta v0.11.0
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
 * @since Beta v0.11.0
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagRelic WHERE uid = ?;", [uid]);
}

/**
 * 删除指定UID和GUID的圣遗物数据
 * @since Beta v0.11.0
 * @param uid - 存档UID
 * @param guid - 圣遗物GUID
 * @returns 无返回值
 */
async function deleteRelic(uid: number, guid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagRelic WHERE uid = ? AND guid = ?;", [uid, guid]);
}

function parseRelic(raw: TGApp.Sqlite.UserBag.RelicRaw): TGApp.Sqlite.UserBag.RelicTable {
  return {
    ...raw,
    brief: JSON.parse(raw.brief),
    mp: JSON.parse(raw.mp),
    sp: raw.sp ? JSON.parse(raw.sp) : [],
    is_marked: raw.is_marked === "true",
    is_locked: raw.is_locked === "true",
  };
}

/**
 * 获取圣遗物数据
 * @since Beta v0.11.0
 * @param uid - 存档UID
 * @param guid - 圣遗物GUID（可选）
 * @returns 圣遗物数据列表
 */
async function getRelic(
  uid: number,
  guid?: string,
): Promise<Array<TGApp.Sqlite.UserBag.RelicTable>> {
  const db = await TGSqlite.getDB();
  let sql = "SELECT * FROM UserBagRelic WHERE uid = ?";
  const params: Array<number | string> = [uid];

  if (guid !== undefined) {
    sql += " AND guid = ?";
    params.push(guid);
  }

  const res = await db.select<Array<TGApp.Sqlite.UserBag.RelicRaw>>(sql, params);
  return res.map(parseRelic);
}

/**
 * 获取圣遗物GUID集合
 * @since Beta v0.11.0
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
 * @since Beta v0.11.0
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
};

export default TSUserBagRelic;
