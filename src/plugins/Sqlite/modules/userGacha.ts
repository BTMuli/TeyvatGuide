/**
 * @file plugins/Sqlite/modules/userGacha.ts
 * @description 用户祈愿模块
 * @since Beta v0.7.5
 */

import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sqlite/index.js";
import { path } from "@tauri-apps/api";
import { exists, mkdir, readDir } from "@tauri-apps/plugin-fs";

import TGLogger from "@/utils/TGLogger.js";
import { getWikiBrief, timestampToDate } from "@/utils/toolFunc.js";
import { exportUigfData, readUigfData, verifyUigfData } from "@/utils/UIGF.js";

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
              '${gacha.uigf_gacha_type}', datetime('now', 'localtime')) ON CONFLICT (id)
          DO
      UPDATE
          SET uid = '${uid}',
          gachaType = '${gacha.gacha_type}',
          uigfType = '${gacha.uigf_gacha_type}',
          time = '${gacha.time}',
          itemId = '${gacha.item_id ?? null}',
          count = '${gacha.count ?? null}',
          name = '${gacha.name}',
          type = '${gacha.item_type ?? null}',
          rank = '${gacha.rank_type ?? null}',
          updated = datetime('now', 'localtime');
  `;
}

/**
 * @description 传入时间字符串跟对应时区，转成utc8时间字符串
 * @since Beta v0.7.5
 * @param {string} time - 时间字符串
 * @param {number} timezone - 时区
 * @return {string} 转换后的时间戳
 */
function getUtc8Time(time: string, timezone: number): string {
  const date = new Date(time);
  const diffTimezone = -timezone + 8;
  const realDate = new Date(date.getTime() + diffTimezone * 60 * 60 * 1000);
  return timestampToDate(realDate.getTime());
}

/**
 * @description 转换祈愿数据，防止多语言
 * @since Beta v0.7.5
 * @param {TGApp.Plugins.UIGF.GachaItem} gacha - UIGF数据
 * @param {number} timezone - 时区
 * @return {TGApp.Plugins.UIGF.GachaItem} 转换后的数据
 */
function transGacha(
  gacha: TGApp.Plugins.UIGF.GachaItem,
  timezone: number = 8,
): TGApp.Plugins.UIGF.GachaItem {
  const find = getWikiBrief(gacha.item_id);
  if (!find) return gacha;
  return {
    gacha_type: gacha.gacha_type,
    item_id: gacha.item_id,
    count: gacha.count ?? "1",
    time: getUtc8Time(gacha.time, timezone),
    name: find.name,
    item_type: "element" in find ? "角色" : "武器",
    rank_type: find.star.toString(),
    id: gacha.id,
    uigf_gacha_type: gacha.uigf_gacha_type,
  };
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
 * @description 获取用户祈愿记录，并按照日期进行分组排序
 * @since Beta v0.6.8
 * @param {string} uid - UID
 * @param {string} type - 类型
 * @return {Promise<Record<string, TGApp.Sqlite.GachaRecords.SingleTable[]>} 日期分组的祈愿记录
 */
async function getGachaRecordsGroupByDate(
  uid: string,
  type?: string,
): Promise<Record<string, TGApp.Sqlite.GachaRecords.SingleTable[]>> {
  const db = await TGSqlite.getDB();
  type resType = Array<TGApp.Sqlite.GachaRecords.SingleTable>;
  let res: resType;
  if (type) {
    res = await db.select<resType>(
      "SELECT * FROM GachaRecords WHERE uid = ? AND gachaType = ? ORDER BY time;",
      [uid, type],
    );
  } else {
    res = await db.select<resType>("SELECT * FROM GachaRecords WHERE uid = ? ORDER BY time;", [
      uid,
    ]);
  }
  const map: Record<string, TGApp.Sqlite.GachaRecords.SingleTable[]> = {};
  for (const item of res) {
    // key 是 yyyy-MM-dd hh:mm:ss，按照日期分组
    const key = item.time.split(" ")[0];
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
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
 * @description 清理祈愿记录
 * @since Beta v0.6.4
 * @param {string} uid - UID
 * @param {string} pool - 池子
 * @param {Record<string,string[]>} map - 祈愿数据
 * @return {Promise<void>}
 */
async function cleanGachaRecords(
  uid: string,
  pool: string,
  map: Record<string, string[]>,
): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const [time, ids] of Object.entries(map)) {
    const sql = `DELETE
                 FROM GachaRecords
                 WHERE uid = '${uid}'
                   AND gachaType = '${pool}'
                   AND time = '${time}'
                   AND id NOT IN (${ids.map((i) => `'${i}'`).join(",")});
    `;
    const res = await db.execute(sql);
    if (res.rowsAffected > 0) {
      showSnackbar.success(`[${uid}][${pool}][${time}]清理了${res.rowsAffected}条祈愿记录`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
  }
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
    const trans = transGacha(gacha, data.timezone);
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
  getGachaRecordsGroupByDate,
  deleteGachaRecords,
  cleanGachaRecords,
  mergeUIGF,
  mergeUIGF4,
  backUpUigf,
  restoreUigf,
};

export default TSUserGacha;
