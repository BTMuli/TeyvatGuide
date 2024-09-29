/**
 * @file plugins/Sqlite/modules/userGacha.ts
 * @description 用户祈愿模块
 * @since Beta v0.6.0
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, readDir } from "@tauri-apps/plugin-fs";

import { AppCharacterData, AppWeaponData } from "../../../data/index.js";
import TGLogger from "../../../utils/TGLogger.js";
import { exportUigfData, readUigfData, verifyUigfData } from "../../../utils/UIGF.js";
import TGSqlite from "../index.js";

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
  const findAvatar = AppCharacterData.find((i) => i.id.toString() === item_id);
  if (findAvatar !== undefined) return ["角色", findAvatar];
  const findWeapon = AppWeaponData.find((i) => i.id.toString() === item_id);
  if (findWeapon !== undefined) return ["武器", findWeapon];
  return ["未知", "未知"];
}

/**
 * @description 获取导入 Sql
 * @since Beta v.6.0
 * @param {string} uid - UID
 * @param {TGApp.Plugins.UIGF.GachaItem} gacha - UIGF数据
 * @returns {string}
 */
function getInsertSql(uid: string, gacha: TGApp.Plugins.UIGF.GachaItem): string {
  return `
      INSERT INTO GachaRecords (uid, gachaType, itemId, count, time, name, type, rank, id, uigfType, updated)
      VALUES ('${uid}', '${gacha.gacha_type}', '${gacha.item_id ?? null}', '${gacha.count ?? null}', '${gacha.time}',
              '${gacha.name}', '${gacha.item_type ?? null}', '${gacha.rank_type ?? null}', '${gacha.id}',
              '${gacha.uigf_gacha_type}', datetime('now', 'localtime'))
      ON CONFLICT (id)
          DO UPDATE
          SET uid       = '${uid}',
              gachaType = '${gacha.gacha_type}',
              uigfType  = '${gacha.uigf_gacha_type}',
              time      = '${gacha.time}',
              itemId    = '${gacha.item_id ?? null}',
              count     = '${gacha.count ?? null}',
              name      = '${gacha.name}',
              type      = '${gacha.item_type ?? null}',
              rank      = '${gacha.rank_type ?? null}',
              updated   = datetime('now', 'localtime');
  `;
}

/**
 * @description 转换祈愿数据，防止多语言
 * @since Beta v0.5.1
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
    const sql = getInsertSql(uid, trans);
    await db.execute(sql);
  }
}

/**
 * @description 合并祈愿数据（v4.0）
 * @since Beta v0.5.0
 * @param {TGApp.Plugins.UIGF.GachaHk4e} data - UIGF数据
 * @return {Promise<void>}
 */
async function mergeUIGF4(data: TGApp.Plugins.UIGF.GachaHk4e): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const gacha of data.list) {
    const trans = transGacha(gacha);
    const sql = getInsertSql(data.uid.toString(), trans);
    await db.execute(sql);
  }
}

/**
 * @description 备份祈愿数据
 * @since Beta v0.6.0
 * @param {string} dir - 备份目录
 * @returns {Promise<void>}
 */
async function backUpUigf(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录，即将创建");
    await mkdir(dir, { recursive: true });
  }
  const uidList = await getUidList();
  for (const uid of uidList) {
    const dataGacha = await getGachaRecords(uid);
    const savePath = `${dir}${path.sep()}UIGF_${uid}.json`;
    await exportUigfData(uid, dataGacha, savePath);
  }
  await TGLogger.Info("祈愿数据备份完成");
}

/**
 * @description 恢复祈愿数据
 * @since Beta v0.6.0
 * @param {string} dir - 备份目录
 * @returns {Promise<boolean>}
 */
async function restoreUigf(dir: string): Promise<boolean> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录");
    return false;
  }
  const filesRead = await readDir(dir);
  // 校验 UIGF_xxx.json 文件
  const fileRegex = /^UIGF_\d+\.json$/;
  const files = filesRead.filter((item) => item.isFile && fileRegex.test(item.name));
  if (files.length === 0) return false;
  try {
    for (const file of files) {
      const filePath = `${dir}${path.sep()}${file.name}`;
      const check = await verifyUigfData(filePath);
      if (!check) {
        await TGLogger.Warn(`UIGF数据校验失败${filePath}`);
        continue;
      }
      const data = await readUigfData(filePath);
      const uid = data.info.uid;
      await mergeUIGF(uid, data.list);
    }
  } catch (e) {
    await TGLogger.Error(`恢复祈愿数据失败${dir}`);
    await TGLogger.Error(typeof e === "string" ? e : JSON.stringify(e));
    return false;
  }
  return true;
}

const TSUserGacha = {
  getUidList,
  getGachaCheck,
  getGachaRecords,
  getGachaItemType,
  deleteGachaRecords,
  mergeUIGF,
  mergeUIGF4,
  backUpUigf,
  restoreUigf,
};

export default TSUserGacha;
