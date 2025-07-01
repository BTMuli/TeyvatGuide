/**
 * @file sqlite/modules/userChallenge.ts
 * @description 幽境危战模块
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
 * @param {TGApp.Game.Challenge.ChallengeItem} data - 挑战数据
 * @returns {TGApp.Sqlite.Challenge.SingleTable} 转换后的数据
 */
function transUserChallenge(
  data: TGApp.Game.Challenge.ChallengeItem,
): TGApp.Sqlite.Challenge.SingleTable {
  return {
    uid: "",
    id: Number(data.schedule.schedule_id),
    startTime: timestampToDate(Number(data.schedule.start_time) * 1000),
    endTime: timestampToDate(Number(data.schedule.end_time) * 1000),
    name: data.schedule.name,
    single: data.single,
    mp: data.mp,
    blings: data.blings,
    updated: timestampToDate(new Date().getTime()),
  };
}

/**
 * @description 直接插入数据
 * @since Beta v0.8.0
 * @param {TGApp.Sqlite.Challenge.SingleTable} data - 挑战数据
 * @param {string} [uid] - 用户UID
 * @returns {string} - 插入 SQL 语句
 */
function getInsertSql(data: TGApp.Sqlite.Challenge.SingleTable, uid?: string): string {
  const timeNow = timestampToDate(new Date().getTime());
  return `
      INSERT INTO HardChallenge(uid, id, startTime, endTime, name, single, mp, blings, updated)
      VALUES ('${uid ?? data.uid}', ${data.id}, '${data.startTime}', '${data.endTime}', '${data.name}',
              '${JSON.stringify(data.single)}', '${JSON.stringify(data.mp)}', '${JSON.stringify(data.blings)}',
              '${timeNow}') 
      ON CONFLICT(uid,id) DO UPDATE
          SET startTime = '${data.startTime}',
          endTime = '${data.endTime}',
          name = '${data.name}',
          single = '${JSON.stringify(data.single)}',
          mp = '${JSON.stringify(data.mp)}',
          blings = '${JSON.stringify(data.blings)}',
          updated = '${timeNow}'
  `;
}

/**
 * @description 获取所有数据的UID
 * @since Beta v0.8.0
 * @return {Promise<Array<string>} - 所有数据的UID
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM HardChallenge;");
  return res.map((i) => i.uid);
}

/**
 * @description 获取挑战数据
 * @since Beta v0.8.0
 * @param {string} [uid] - 游戏UID
 * @return {Promise<Array<TGApp.Sqlite.Challenge.SingleTable>>} - 挑战数据
 */
async function getChallenge(uid?: string): Promise<Array<TGApp.Sqlite.Challenge.SingleTable>> {
  const db = await TGSqlite.getDB();
  let resR: Array<TGApp.Sqlite.Challenge.RawTable>;
  if (uid === undefined) {
    resR = await db.select<Array<TGApp.Sqlite.Challenge.RawTable>>(
      "SELECT * FROM HardChallenge ORDER BY id DESC;",
    );
  } else {
    resR = await db.select<Array<TGApp.Sqlite.Challenge.RawTable>>(
      `SELECT *
       FROM HardChallenge
       WHERE uid = ?;`,
      [uid],
    );
  }
  const res: Array<TGApp.Sqlite.Challenge.SingleTable> = [];
  for (const raw of resR) {
    res.push({
      uid: raw.uid,
      id: raw.id,
      startTime: raw.startTime,
      endTime: raw.endTime,
      name: raw.name,
      single: JSON.parse(raw.single),
      mp: JSON.parse(raw.mp),
      blings: JSON.parse(raw.blings),
      updated: raw.updated,
    });
  }
  return res;
}

/**
 * @description 保存挑战数据
 * @since Beta v0.8.0
 * @param {string} uid - 游戏UID
 * @param {TGApp.Game.Challenge.ChallengeItem} data - 挑战数据
 * @return {Promise<void>}
 */
async function saveChallenge(uid: string, data: TGApp.Game.Challenge.ChallengeItem): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(getInsertSql(transUserChallenge(data), uid));
}

/**
 * @description 删除指定UID的挑战数据
 * @since Beta v0.8.0
 * @param {string} uid - 游戏UID
 * @return {Promise<void>}
 */
async function delChallenge(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM HardChallenge WHERE uid = ?;", [uid]);
}

/**
 * @description 备份挑战数据
 * @since Beta v0.8.0
 * @param {string} dir - 备份目录
 * @return {Promise<void>}
 */
async function backupChallenge(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
    await TGLogger.Warn(`[TSUserChallenge][Backup] 未检测到备份目录，已创建`);
  }
  const data = await getChallenge();
  await writeTextFile(`${dir}${path.sep()}challenge.json`, JSON.stringify(data));
}

/**
 * @description 恢复挑战数据
 * @since Beta v0.8.0
 * @param {string} dir - 备份目录
 * @return {Promise<boolean>}
 */
async function restoreChallenge(dir: string): Promise<boolean> {
  const filePath = `${dir}${path.sep()}challenge.json`;
  if (!(await exists(filePath))) return false;
  try {
    const data: Array<TGApp.Sqlite.Challenge.SingleTable> = JSON.parse(
      await readTextFile(filePath),
    );
    const db = await TGSqlite.getDB();
    for (const challenge of data) await db.execute(getInsertSql(challenge));
    return true;
  } catch (e) {
    await TGLogger.Error(`[TSUserChallenge][Restore] 恢复挑战数据失败: `);
    await TGLogger.Error(`${e}`);
    return false;
  }
}

const TSUserChallenge = {
  getAllUid,
  getChallenge,
  saveChallenge,
  delChallenge,
  backupChallenge,
  restoreChallenge,
};

export default TSUserChallenge;
