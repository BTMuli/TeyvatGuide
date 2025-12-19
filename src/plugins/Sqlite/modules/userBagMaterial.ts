/**
 * 用户背包材料模块
 * @since Beta v0.9.0
 */
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

import { WikiMaterialData } from "@/data/index.js";

export const SKIP_BAG_TYPES: ReadonlyArray<string> = [
  "系统开放",
  "好感成长",
  "风之翼",
  "挑战结算道具",
  "稀有货币",
  "通用货币",
];

/**
 * 获取有效材料ID
 * @since Beta v0.9.0
 * @return {Array<number>}
 */
function getValidMIds(): Array<number> {
  const filter = WikiMaterialData.filter((m) => !SKIP_BAG_TYPES.includes(m.type));
  return filter.map((f) => f.id);
}

/**
 * 获取插入Sql
 * @since Beta v0.9.0
 * @param {TGApp.Sqlite.UserBag.TableMaterialRaw} tb -表格
 * @returns {string}
 */
function getInsertSql(tb: TGApp.Sqlite.UserBag.TableMaterialRaw): string {
  return `
      INSERT INTO UserBagMaterial(uid, id, count, records, updated)
      VALUES (${tb.uid}, ${tb.id}, ${tb.count}, '${tb.records}', '${tb.updated}') ON CONFLICT(uid, id) DO
      UPDATE
          SET count = ${tb.count},
          records = '${tb.records}',
          updated = '${tb.updated}';
  `;
}

/**
 * 插入或更新材料数据
 * @since Beta v0.9.0
 * @param {number} uid - 存档UID
 * @param {number} itemId - 材料ID
 * @param {number} count - 材料数量
 * @param {Array<TGApp.Sqlite.UserBag.MaterialRecord>} [records] - 更新记录
 * @param {boolean} manual - 是否手动
 * @returns {Promise<void>}
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
  const newTable: TGApp.Sqlite.UserBag.TableMaterialRaw = {
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
 * @param {TGApp.Sqlite.UserBag.TableMaterialRaw} raw 原始数据
 * @return {TGApp.Sqlite.UserBag.TableMaterial} 解析数据
 */
function parseMaterial(
  raw: TGApp.Sqlite.UserBag.TableMaterialRaw,
): TGApp.Sqlite.UserBag.TableMaterial {
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
 * @param {number} uid - 存档UID
 * @param {number} [id] - 材料ID
 * @returns {Promise<Array<TGApp.Sqlite.UserBag.TableMaterial>>}
 */
async function getMaterial(
  uid: number,
  id?: number,
): Promise<Array<TGApp.Sqlite.UserBag.TableMaterial>> {
  const db = await TGSqlite.getDB();
  let res: Array<TGApp.Sqlite.UserBag.TableMaterialRaw>;
  // TODO: 排序
  if (id !== undefined) {
    res = await db.select<Array<TGApp.Sqlite.UserBag.TableMaterialRaw>>(
      "SELECT * FROM UserBagMaterial WHERE uid = ? AND id = ?;",
      [uid, id],
    );
  } else {
    res = await db.select<Array<TGApp.Sqlite.UserBag.TableMaterialRaw>>(
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
 * @param {number} uid - 存档UID
 * @param {Array<TGApp.Plugins.Yae.BagItem<"material">>} list - 材料数据
 * @returns {Promise<void>}
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.BagItemMaterial>,
): Promise<number> {
  let skip = 0;
  const ids = new Set<number>(getValidMIds());
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

const TSUserBagMaterial = {
  getAllUid,
  delUid,
  saveYaeData,
  getMaterial,
  insertMaterial,
  getValidMIds,
};

export default TSUserBagMaterial;
