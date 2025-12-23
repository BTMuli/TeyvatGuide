/**
 * 幻想真境剧诗模块
 * @since Beta v0.8.0
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

/**
 * 将通过 api 获取到的数据转换为数据库中的数据
 * @since Beta v0.8.0
 * @param data - 剧诗数据
 * @returns 转换后端数据
 */
function transUserCombat(data: TGApp.Game.Combat.Combat): TGApp.Sqlite.Combat.TableTrans {
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
 * 直接插入数据
 * @since Beta v0.6.3
 * @param data - 剧诗数据
 * @param uid - 用户UID
 * @returns sql
 */
function getInsertSql(data: TGApp.Sqlite.Combat.TableTrans, uid?: string): string {
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
 * 获取所有有数据的UID
 * @since Beta v0.6.3
 * @returns uid列表
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM RoleCombat;");
  return res.map((i) => i.uid);
}

/**
 * 获取剧诗数据
 * @since Beta v0.8.0
 * @param uid - 游戏UID
 * @returns 剧诗数据
 */
async function getCombat(uid?: string): Promise<Array<TGApp.Sqlite.Combat.TableTrans>> {
  const db = await TGSqlite.getDB();
  let resR: Array<TGApp.Sqlite.Combat.TableRaw>;
  if (uid === undefined) {
    resR = await db.select<Array<TGApp.Sqlite.Combat.TableRaw>>(
      "SELECT * FROM RoleCombat ORDER BY id DESC;",
    );
  } else {
    resR = await db.select<Array<TGApp.Sqlite.Combat.TableRaw>>(
      "SELECT * FROM RoleCombat WHERE uid = ? ORDER BY id DESC;",
      [uid],
    );
  }
  const res: Array<TGApp.Sqlite.Combat.TableTrans> = [];
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
 * 保存剧诗数据
 * @since Beta v0.6.3
 * @param uid - 游戏UID
 * @param data - 深渊数据
 * @returns 无返回值
 */
async function saveCombat(uid: string, data: TGApp.Game.Combat.Combat): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(getInsertSql(transUserCombat(data), uid));
}

/**
 * 删除指定UID存档的数据
 * @since Beta v0.6.3
 * @param uid - 游戏UID
 * @returns 无返回值
 */
async function delCombat(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM RoleCombat WHERE uid = ?;", [uid]);
}

/**
 * 备份剧诗数据
 * @since Beta v0.9.0
 * @param dir - 备份目录
 * @returns 无返回值
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
 * 恢复剧诗数据
 * @since Beta v0.8.0
 * @param dir - 备份文件目录
 * @returns 是否恢复成功
 */
async function restoreCombat(dir: string): Promise<boolean> {
  const filePath = `${dir}${path.sep()}combat.json`;
  if (!(await exists(filePath))) return false;
  try {
    const data: Array<TGApp.Sqlite.Combat.TableTrans> = JSON.parse(await readTextFile(filePath));
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
