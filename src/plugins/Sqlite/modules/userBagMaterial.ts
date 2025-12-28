/**
 * 用户背包材料模块
 * @since Beta v0.9.1
 */
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

import { WikiMaterialData } from "@/data/index.js";

export const SKIP_BAG_TYPES: ReadonlyArray<string> = [
  "系统开放",
  "好感成长",
  "风之翼",
  /**TODO:数据获取*/
  "挑战结算道具",
];
export const BAG_TYPE_LIST: ReadonlyArray<string> = [
  "高级兑换券",
  "普通兑换券",
  "限定祈愿道具",
  "祈愿道具",
  "稀有货币",
  "通用货币",
  "任务道具",
  "七国徽印",
  "冒险道具",
  "消耗品",
  "角色经验素材",
  "武器强化素材",
  "锻造用矿石",
  "角色天赋素材",
  "角色突破素材",
  "武器突破素材",
  "角色培养素材",
  "角色与武器培养素材",
  "蒙德区域特产",
  "璃月区域特产",
  "稻妻区域特产",
  "须弥区域特产",
  "枫丹区域特产",
  "纳塔区域特产",
  "挪德卡莱区域特产",
  "食材",
  "素材",
  "药剂",
  "小道具",
];

/**
 * 获取有效材料ID
 * @since Beta v0.9.0
 * @returns ID列表
 */
function getValidMIds(): Array<number> {
  const filter = WikiMaterialData.filter((m) => !SKIP_BAG_TYPES.includes(m.type));
  return filter.map((f) => f.id);
}

/**
 * 获取插入Sql
 * @since Beta v0.9.0
 * @param  tb -表格
 * @returns sql
 */
function getInsertSql(tb: TGApp.Sqlite.UserBag.MaterialRaw): string {
  return `
      INSERT INTO UserBagMaterial(uid, id, count, records, updated)
      VALUES (${tb.uid}, ${tb.id}, ${tb.count}, '${tb.records}', '${tb.updated}')
      ON CONFLICT(uid, id) DO UPDATE
          SET count   = ${tb.count},
              records = '${tb.records}',
              updated = '${tb.updated}';
  `;
}

/**
 * 插入或更新材料数据
 * @since Beta v0.9.0
 * @param uid - 存档UID
 * @param itemId - 材料ID
 * @param count - 材料数量
 * @param records - 更新记录
 * @param manual - 是否手动
 * @returns 无返回值
 */
async function insertMaterial(
  uid: number,
  itemId: number,
  count: number,
  records: Array<TGApp.Sqlite.UserBag.MaterialRecord> = [],
  manual: boolean = false,
): Promise<void> {
  const now = Date.now();
  const newRecord: TGApp.Sqlite.UserBag.MaterialRecord = {
    count: count,
    time: Math.floor(now / 1000),
  };
  if (manual) newRecord.manual = true;
  const newRecords = [...records, newRecord];
  const newTable: TGApp.Sqlite.UserBag.MaterialRaw = {
    uid: uid,
    id: itemId,
    count: count,
    records: JSON.stringify(newRecords),
    updated: timestampToDate(now),
  };
  const db = await TGSqlite.getDB();
  const sql = getInsertSql(newTable);
  await db.execute(sql);
}

/**
 * 删除记录
 * @since Beta v0.9.1
 * @param uid - 存档UID
 * @param itemId - 材料ID
 * @param count - 材料数量
 * @returns 无返回值
 */
async function deleteRecord(uid: number, itemId: number, count: number): Promise<void> {
  const now = Date.now();
  const newRecord: TGApp.Sqlite.UserBag.MaterialRecord = {
    count: count,
    time: Math.floor(now / 1000),
  };
  const newTable: TGApp.Sqlite.UserBag.MaterialRaw = {
    uid: uid,
    id: itemId,
    count: count,
    records: JSON.stringify([newRecord]),
    updated: timestampToDate(now),
  };
  const db = await TGSqlite.getDB();
  const sql = getInsertSql(newTable);
  await db.execute(sql);
}

/**
 * 获取UID列表
 * @since Beta v0.9.0
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserBagMaterial");
  return res.map((u) => u.uid);
}

/**
 * 删除指定UID数据
 * @since Beta v0.9.0
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserBagMaterial WHERE uid = ?;", [uid]);
}

/**
 * 解析表格数据
 * @since Beta v0.9.0
 * @param raw - 原始数据
 * @returns 解析数据
 */
function parseMaterial(raw: TGApp.Sqlite.UserBag.MaterialRaw): TGApp.Sqlite.UserBag.MaterialTable {
  return {
    ...raw,
    records: (<Array<TGApp.Sqlite.UserBag.MaterialRecord>>JSON.parse(raw.records)).sort(
      (a, b) => b.time - a.time,
    ),
  };
}

/**
 * 获取指定UID的材料数据
 * @since Beta v0.9.0
 * @param uid - 存档UID
 * @param id - 材料ID
 * @returns 材料数据
 */
async function getMaterial(
  uid: number,
  id?: number,
): Promise<Array<TGApp.Sqlite.UserBag.MaterialTable>> {
  const db = await TGSqlite.getDB();
  let res: Array<TGApp.Sqlite.UserBag.MaterialRaw>;
  // TODO: 排序
  if (id !== undefined) {
    res = await db.select<Array<TGApp.Sqlite.UserBag.MaterialRaw>>(
      "SELECT * FROM UserBagMaterial WHERE uid = ? AND id = ?;",
      [uid, id],
    );
  } else {
    res = await db.select<Array<TGApp.Sqlite.UserBag.MaterialRaw>>(
      "SELECT * FROM UserBagMaterial WHERE uid =?;",
      [uid],
    );
  }
  const list = res.map(parseMaterial);
  const ids = new Set<number>(getValidMIds());
  for (const item of list) if (ids.has(item.id)) ids.delete(item.id);
  for (const item of ids) list.push({ uid: uid, id: item, count: 0, records: [], updated: "" });
  return list;
}

/**
 * 保存Yae获取的材料数据
 * @since Beta v0.9.0
 * @param uid - 存档UID
 * @param list - 材料数据
 * @returns 无返回值
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.BagItemMaterial>,
): Promise<number> {
  let skip = 0;
  const ids = new Set<number>(getValidMIds());
  // 移除货币数据
  ids.delete(201);
  ids.delete(202);
  ids.delete(203);
  ids.delete(204);
  const newList = list;
  for (const item of list) if (ids.has(item.item_id)) ids.delete(item.item_id);
  // 处理0数据
  for (const item of ids.values()) {
    newList.push({ item_id: item, kind: "material", info: { count: 0 } });
  }
  for (const item of newList) {
    const read = await getMaterial(uid, item.item_id);
    if (read.length === 0) {
      await insertMaterial(uid, item.item_id, item.info.count);
      continue;
    }
    const local = read[0];
    // 数量相同，不更新
    if (item.info.count === local.count) {
      skip++;
      continue;
    }
    await insertMaterial(uid, item.item_id, item.info.count, local.records);
  }
  return skip;
}

/**
 * 保存货币数据
 * @since Beta v0.9.1
 * @param uid - 存档UID
 * @param id - 货币ID
 * @param cnt - 货币数量
 * @returns 无返回值
 */
async function saveYaeCoin(uid: number, id: number, cnt: number): Promise<void> {
  const read = await getMaterial(uid, id);
  if (read.length === 0) {
    await insertMaterial(uid, id, cnt);
    return;
  }
  const local = read[0];
  if (cnt === local.count) return;
  await insertMaterial(uid, id, cnt, local.records);
}

const TSUserBagMaterial = {
  getAllUid,
  delUid,
  saveYaeData,
  saveYaeCoin,
  getMaterial,
  insertMaterial,
  deleteRecord,
  getValidMIds,
};

export default TSUserBagMaterial;
