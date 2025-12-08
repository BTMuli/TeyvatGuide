/**
 * 用户背包材料模块
 * @since Beta v0.9.0
 */
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

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
 * @returns {Promise<void>}
 */
async function insertMaterial(
  uid: number,
  itemId: number,
  count: number,
  records: Array<TGApp.Sqlite.UserBag.MaterialRecord> = [],
): Promise<void> {
  const now = Date.now();
  const newRecord: TGApp.Sqlite.UserBag.MaterialRecord = {
    count: count,
    time: Math.floor(now / 1000),
  };
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
    records: JSON.parse(raw.records),
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
  return res.map(parseMaterial);
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
  list: Array<TGApp.Plugins.Yae.BagItem<"material">>,
): Promise<number> {
  let skip = 0;
  for (const item of list) {
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
  saveYaeData,
  getMaterial,
  insertMaterial,
};

export default TSUserBagMaterial;
