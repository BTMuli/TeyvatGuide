/**
 * @file plugins/Sqlite/modules/userCombat.ts
 * @description Sqlite-幻想真境剧诗模块
 * @since Beta v0.8.0
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

/**
 * @description 将通过 api 获取到的数据转换为数据库中的数据
 * @since Beta v0.8.0
 * @param {TGApp.Game.Combat.Combat} data - 剧诗数据
 * @returns {TGApp.Sqlite.Combat.SingleTable} 转换后端数据
 */
function transUserCombat(data: TGApp.Game.Combat.Combat): TGApp.Sqlite.Combat.SingleTable {
  return {
    uid: "",
    detail: data.detail,
    endTime: timestampToDate(Number(data.schedule.end_time) * 1000),
    hasData: data.has_data,
    hasDetailData: data.has_detail_data,
    id: data.schedule.schedule_id,
    startTime: timestampToDate(Number(data.schedule.start_time) * 1000),
    stat: data.stat,
    updated: timestampToDate(new Date().getTime()),
  };
}

/**
 * @description 直接插入数据
 * @since Beta v0.6.3
 * @param {TGApp.Sqlite.Combat.SingleTable} data 剧诗数据
 * @param {string} [uid] 用户UID
 * @returns {string}
 */
function getInsertSql(data: TGApp.Sqlite.Combat.SingleTable, uid?: string): string {
  const timeNow = timestampToDate(new Date().getTime());
  const hasData = data.hasData ? 1 : 0;
  const hasDetailData = data.hasDetailData ? 1 : 0;
  return `
      INSERT INTO RoleCombat(uid, id, startTime, endTime, hasData, hasDetailData, stat, detail, updated)
      VALUES ('${uid ?? data.uid}', ${data.id}, '${data.startTime}', '${data.endTime}', ${hasData}, ${hasDetailData},
              '${JSON.stringify(data.stat)}', '${JSON.stringify(data.detail)}', '${timeNow}')
      ON CONFLICT(uid,id) DO UPDATE
          SET startTime     = '${data.startTime}',
              endTime       = '${data.endTime}',
              hasData       = ${hasData},
              hasDetailData = ${hasDetailData},
              stat          = '${JSON.stringify(data.stat)}',
              detail        = '${JSON.stringify(data.detail)}',
              updated       = '${timeNow}'
  `;
}

/**
 * @description 获取所有有数据的UID
 * @since Beta v0.6.3
 * @returns {Promise<Array<string>>}
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM RoleCombat;");
  return res.map((i) => i.uid);
}

/**
 * @description 获取剧诗数据
 * @since Beta v0.8.0
 * @param {string} [uid] - 游戏UID
 * @returns {Promise<TGApp.Sqlite.Abyss.TableRaw[]>}
 */
async function getCombat(uid?: string): Promise<TGApp.Sqlite.Combat.SingleTable[]> {
  const db = await TGSqlite.getDB();
  let resR: Array<TGApp.Sqlite.Combat.RawTable>;
  if (uid === undefined) {
    resR = await db.select<Array<TGApp.Sqlite.Combat.RawTable>>(
      "SELECT * FROM RoleCombat ORDER BY id DESC;",
    );
  } else {
    resR = await db.select<Array<TGApp.Sqlite.Combat.RawTable>>(
      "SELECT * FROM RoleCombat WHERE uid = ? ORDER BY id DESC;",
      [uid],
    );
  }
  const res: TGApp.Sqlite.Combat.SingleTable[] = [];
  for (const raw of resR) {
    res.push({
      uid: raw.uid,
      detail: JSON.parse(raw.detail),
      endTime: raw.endTime,
      hasData: raw.hasData === 1,
      hasDetailData: raw.hasDetailData === 1,
      id: raw.id,
      startTime: raw.startTime,
      stat: JSON.parse(raw.stat),
      updated: raw.updated,
    });
  }
  return res;
}

/**
 * @description 保存剧诗数据
 * @since Beta v0.6.3
 * @param {string} uid - 游戏UID
 * @param {TGApp.Game.Abyss.FullData} data - 深渊数据
 * @returns {Promise<void>}
 */
async function saveCombat(uid: string, data: TGApp.Game.Combat.Combat): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(getInsertSql(transUserCombat(data), uid));
}

/**
 * @description 删除指定UID存档的数据
 * @since Beta v0.6.3
 * @param {string} uid - 游戏UID
 * @returns {Promise<void>}
 */
async function delCombat(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM RoleCombat WHERE uid = ?;", [uid]);
}

/**
 * 备份剧诗数据
 * @since Beta v0.9.0
 * @param {string} dir - 备份目录
 * @returns {Promise<void>}
 */
async function backupCombat(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
    await TGLogger.Warn(`[TSUserCombat][Backup] 未检测到备份目录，已创建`);
  }
  const data = await getCombat();
  await writeTextFile(`${dir}${path.sep()}combat.json`, JSON.stringify(data, null, 2));
}

/**
 * @description 恢复剧诗数据
 * @since Beta v0.8.0
 * @param {string} dir - 备份文件目录
 * @returns {Promise<boolean>}
 */
async function restoreCombat(dir: string): Promise<boolean> {
  const filePath = `${dir}${path.sep()}combat.json`;
  if (!(await exists(filePath))) return false;
  try {
    const data: Array<TGApp.Sqlite.Combat.SingleTable> = JSON.parse(await readTextFile(filePath));
    const db = await TGSqlite.getDB();
    for (const abyss of data) await db.execute(getInsertSql(abyss));
    return true;
  } catch (e) {
    await TGLogger.Error(`[TSUserCombat][Restore] 恢复剧诗数据失败${filePath}`);
    await TGLogger.Error(`${e}`);
    return false;
  }
}

const TSUserCombat = {
  getAllUid,
  getCombat,
  saveCombat,
  delCombat,
  backupCombat,
  restoreCombat,
};

export default TSUserCombat;
