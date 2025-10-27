/**
 * 千星奇域祈愿模块
 * @since Beta v0.8.4
 */

import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sql/index.js";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";

/**
 * 获取导入 Sql
 * @since Beta v0.8.4
 * @param {TGApp.Game.Gacha.GachaBItem} gacha - 抽卡记录数据
 * @returns {string}
 */
function getInsertSql(gacha: TGApp.Game.Gacha.GachaBItem): string {
  return `
      INSERT INTO GachaBRecords(id, uid, region, scheduleId, gachaType,
                                opGachaType, time, itemId, name, type,
                                rank, isUp, updated)
      VALUES ('${gacha.id}', '${gacha.uid}', '${gacha.region}', '${gacha.schedule_id}',
              '${gacha.op_gacha_type === "1000" ? "1000" : "2000"}', '${gacha.op_gacha_type}', '${gacha.time}',
              '${gacha.item_id}', '${gacha.item_name}', '${gacha.item_type}',
              '${gacha.rank_type}', '${gacha.is_up}', datetime('now', 'localtime'))
      ON CONFLICT (id)
          DO UPDATE
          SET uid         = '${gacha.uid}',
              region      = '${gacha.region}',
              scheduleId  = '${gacha.schedule_id}',
              gachaType   = '${gacha.op_gacha_type === "1000" ? "1000" : "2000"}',
              opGachaType = '${gacha.op_gacha_type}',
              time        = '${gacha.time}',
              itemId      = '${gacha.item_id}',
              name        = '${gacha.item_name}',
              type        = '${gacha.item_type}',
              rank        = '${gacha.rank_type}',
              isUp        = '${gacha.is_up}',
              updated     = datetime('now', 'localtime');
  `;
}

/**
 * 插入列表数据
 * @since Beta v0.8.4
 * @param {Array<TGApp.Game.Gacha.GachaBItem>} list - 抽卡记录列表
 * @returns {Promise<void>}
 */
async function insertGachaList(list: Array<TGApp.Game.Gacha.GachaBItem>): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const gacha of list) {
    const sql = getInsertSql(gacha);
    await db.execute(sql);
  }
}

/**
 * 获取数据库UID列表
 * @since Beta v0.8.4
 * @returns {Promise<Array<string>>}
 */
async function getUidList(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM GachaBRecords;");
  return res.map((i) => i.uid);
}

/**
 * 获取增量更新的记录 ID
 * @since Beta v0.8.4
 * @param {string} uid - UID
 * @param {string} type - 类型
 * @returns {Promise<string|undefined>}
 */
async function getGachaCheck(uid: string, type: string): Promise<string | undefined> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ id: string }>;
  const res = await db.select<resType>(
    "SELECT id FROM GachaBRecords WHERE uid = ? AND opGachaType = ? ORDER BY id DESC LIMIT 1;",
    [uid, type],
  );
  if (res.length === 0) return undefined;
  return res[0].id;
}

/**
 * 获取用户祈愿记录
 * @since Beta v0.8.4
 * @param {string} uid - UID
 * @param {string} [type] - 类型
 * @return {Promise<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>}
 */
async function getGachaRecords(
  uid: string,
  type?: string,
): Promise<Array<TGApp.Sqlite.GachaRecords.TableGachaB>> {
  const db = await TGSqlite.getDB();
  if (type) {
    return await db.select("SELECT * FROM GachaBRecords WHERE uid = ? AND opGachaType = ?;", [
      uid,
      type,
    ]);
  }
  return await db.select("SELECT * FROM GachaBRecords WHERE uid = ?;", [uid]);
}

/**
 * 备份祈愿数据
 * @since Beta v0.8.4
 * @param {string} dir - 备份目录
 * @remarks 等UIGF标准最终确定后与TSUserGacha合并
 */
async function backUpUigf(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录，即将创建");
    await mkdir(dir, { recursive: true });
  }
  showSnackbar.error(`千星奇域祈愿数据备份功能尚未实现，请耐心等待后续版本更新。`);
}

/**
 * 恢复祈愿数据
 * @since Beta v0.8.4
 * @param {string} dir - 恢复目录
 * @remarks 等UIGF标准最终确定后与TSUserGacha合并
 */
async function restoreUigf(dir: string): Promise<boolean> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的祈愿备份目录");
    return false;
  }
  return true;
}

/**
 * 删除用户祈愿数据
 * @since Beta v0.8.4
 * @param {string} uid - UID
 * @returns {Promise<void>}
 */
async function deleteRecords(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GachaBRecords WHERE uid = ?;", [uid]);
}

/**
 * 千星奇域祈愿模块
 * @since Beta v0.8.4
 */
const TSUserGachaB = {
  getUidList,
  getGachaCheck,
  getGachaRecords,
  insertGachaList,
  backUpUigf,
  restoreUigf,
  deleteRecords,
};

export default TSUserGachaB;
