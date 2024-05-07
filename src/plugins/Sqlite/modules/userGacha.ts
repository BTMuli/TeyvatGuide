/**
 * @file plugins/Sqlite/modules/userGacha.ts
 * @description 用户祈愿模块
 * @since Beta v0.4.7
 */

import { AppCharacterData, AppWeaponData } from "../../../data/index";
import TGSqlite from "../index";
import { importUIGFData } from "../sql/updateData";

type gachaItemTypeRes =
  | ["角色", TGApp.App.Character.WikiBriefInfo]
  | ["武器", TGApp.App.Weapon.WikiBriefInfo]
  | ["未知", "未知"];

/**
 * @description 根据 item_id 获取角色/武器类型
 * @since Beta v0.4.7
 * @param {string} item_id - item_id
 * @return {gachaItemTypeRes}
 */
function getGachaItemType(item_id: string): gachaItemTypeRes {
  const findAvatar = AppCharacterData.find((i) => i.id === item_id);
  if (findAvatar !== undefined) return ["角色", findAvatar];
  const findWeapon = AppWeaponData.find((i) => i.id === item_id);
  if (findWeapon !== undefined) return ["武器", findWeapon];
  return ["未知", "未知"];
}

/**
 * @description 转换祈愿数据，防止多语言
 * @since Beta v0.4.7
 * @param {TGApp.Plugins.UIGF.GachaItem} gacha - UIGF数据
 * @return {TGApp.Plugins.UIGF.GachaItem} 转换后的数据
 */
function transGacha(gacha: TGApp.Plugins.UIGF.GachaItem): TGApp.Plugins.UIGF.GachaItem {
  const type = getGachaItemType(gacha.item_id);
  let res = gacha;
  res.item_type = type[0];
  if (type[0] === "角色") {
    const data: TGApp.App.Character.WikiBriefInfo = type[1];
    res = {
      gacha_type: gacha.gacha_type,
      item_id: gacha.item_id,
      count: gacha.count ?? "1",
      time: gacha.time,
      name: data.name,
      item_type: "角色",
      rank_type: data.star.toString(),
      id: gacha.id,
      uigf_gacha_type: gacha.uigf_gacha_type,
    };
  } else if (type[0] === "武器") {
    const data: TGApp.App.Weapon.WikiBriefInfo = type[1];
    res = {
      gacha_type: gacha.gacha_type,
      item_id: gacha.item_id,
      count: gacha.count ?? "1",
      time: gacha.time,
      name: data.name,
      item_type: "武器",
      rank_type: data.star.toString(),
      id: gacha.id,
      uigf_gacha_type: gacha.uigf_gacha_type,
    };
  }
  return res;
}

/**
 * @description 获取数据库的uid列表
 * @since Beta v0.4.7
 * @return {Promise<string[]>}
 */
async function getUidList(): Promise<string[]> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM GachaRecords;");
  return res.map((i) => i.uid);
}

/**
 * @description 获取检测增量更新的记录 ID
 * @since Beta v0.4.7
 * @param {string} uid - UID
 * @param {string} type - 类型
 * @returns {Promise<string|undefined>}
 */
async function getGachaCheck(uid: string, type: string): Promise<string | undefined> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ id: string }>;
  const res = await db.select<resType>(
    "SELECT id FROM GachaRecords WHERE uid = ? AND gachaType = ? ORDER BY id DESC LIMIT 1;",
    [uid, type],
  );
  if (res.length === 0) return undefined;
  return res[0].id;
}

/**
 * @description 获取用户祈愿记录
 * @since Beta v0.4.7
 * @param {string} uid - UID
 * @return {Promise<TGApp.Sqlite.GachaRecords.SingleTable[]>}
 */
async function getGachaRecords(uid: string): Promise<TGApp.Sqlite.GachaRecords.SingleTable[]> {
  const db = await TGSqlite.getDB();
  return await db.select("SELECT * FROM GachaRecords WHERE uid = ?;", [uid]);
}

/**
 * @description 删除指定UID的祈愿记录
 * @since Beta v0.4.7
 * @param {string} uid - UID
 * @return {Promise<void>}
 */
async function deleteGachaRecords(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GachaRecords WHERE uid = ?;", [uid]);
}

/**
 * @description 合并祈愿数据
 * @since Beta v0.4.7
 * @param {string} uid - UID
 * @param {TGApp.Plugins.UIGF.GachaItem[]} data - UIGF数据
 * @return {Promise<void>}
 */
async function mergeUIGF(uid: string, data: TGApp.Plugins.UIGF.GachaItem[]): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const gacha of data) {
    const trans = transGacha(gacha);
    const sql = importUIGFData(uid, trans);
    await db.execute(sql);
  }
}

const TSUserGacha = {
  getUidList,
  getGachaCheck,
  getGachaRecords,
  deleteGachaRecords,
  mergeUIGF,
};

export default TSUserGacha;
