/**
 * @file plugins/Sqlite/modules/userAbyss.ts
 * @description Sqlite-用户深渊模块
 * @since Beta v0.6.8
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";
import { transCharacterData, transFloorData } from "../utils/transAbyssData.js";

/**
 * @description 直接插入数据
 * @since Beta v0.6.8
 * @param {TGApp.Sqlite.Abyss.TableRaw} tableData - 数据
 * @returns {string}
 */
function getRestoreSql(tableData: TGApp.Sqlite.Abyss.TableData): string {
  const data = data2Raw(tableData);
  const timeNow = timestampToDate(new Date().getTime());
  return `
      INSERT INTO SpiralAbyss (uid, id, startTime, endTime, totalBattleTimes, totalWinTimes,
                               maxFloor, totalStar, isUnlock, revealRank, defeatRank, damageRank,
                               takeDamageRank, normalSkillRank, energySkillRank, floors, updated)
      VALUES ('${data.uid}', ${data.id}, '${data.startTime}', '${data.endTime}', ${data.totalBattleTimes},
              ${data.totalWinTimes}, '${data.maxFloor}', ${data.totalStar},
              ${data.isUnlock}, '${data.revealRank}', '${data.defeatRank}', '${data.damageRank}',
              '${data.takeDamageRank}', '${data.normalSkillRank}', '${data.energySkillRank}', '${data.floors}',
              '${timeNow}') ON CONFLICT(uid, id) DO
      UPDATE
          SET startTime = '${data.startTime}',
          endTime = '${data.endTime}',
          totalBattleTimes = ${data.totalBattleTimes},
          totalWinTimes = ${data.totalWinTimes},
          maxFloor = '${data.maxFloor}',
          totalStar = ${data.totalStar},
          isUnlock = ${data.isUnlock},
          revealRank = '${data.revealRank}',
          defeatRank = '${data.defeatRank}',
          damageRank = '${data.damageRank}',
          takeDamageRank = '${data.takeDamageRank}',
          normalSkillRank = '${data.normalSkillRank}',
          energySkillRank = '${data.energySkillRank}',
          floors = '${data.floors}',
          updated = '${timeNow}';
  `;
}

/**
 * @description 获取深渊数据的插入更新Sql
 * @since Beta v0.6.1
 * @param {string} uid - 用户UID
 * @param {TGApp.Game.Abyss.FullData} data -深渊数据
 * @returns {string}
 */
function getInsertSql(uid: string, data: TGApp.Game.Abyss.FullData): string {
  const startTime = timestampToDate(Number(data.start_time) * 1000);
  const endTime = timestampToDate(Number(data.end_time) * 1000);
  const isUnlock = data.is_unlock ? 1 : 0;
  const revealRank = transCharacterData(data.reveal_rank);
  const defeatRank = transCharacterData(data.defeat_rank);
  const damageRank = transCharacterData(data.damage_rank);
  const takeDamageRank = transCharacterData(data.take_damage_rank);
  const normalSkillRank = transCharacterData(data.normal_skill_rank);
  const energySkillRank = transCharacterData(data.energy_skill_rank);
  const floors = transFloorData(data.floors);
  const skippedFloor = data.skipped_floor;
  const timeNow = timestampToDate(new Date().getTime());
  return `
      INSERT INTO SpiralAbyss (uid, id, startTime, endTime, totalBattleTimes, totalWinTimes, maxFloor,
                               totalStar, isUnlock, revealRank, defeatRank, damageRank, takeDamageRank,
                               normalSkillRank, energySkillRank, floors, skippedFloor, updated)
      VALUES ('${uid}', ${data.schedule_id}, '${startTime}', '${endTime}', ${data.total_battle_times},
              ${data.total_win_times}, '${data.max_floor}', ${data.total_star}, ${isUnlock},
              '${revealRank}', '${defeatRank}', '${damageRank}', '${takeDamageRank}', '${normalSkillRank}',
              '${energySkillRank}', '${floors}', '${skippedFloor}', '${timeNow}') ON CONFLICT(uid, id) DO
      UPDATE
          SET startTime = '${startTime}',
          endTime = '${endTime}',
          totalBattleTimes = ${data.total_battle_times},
          totalWinTimes = ${data.total_win_times},
          maxFloor = '${data.max_floor}',
          totalStar = ${data.total_star},
          isUnlock = ${isUnlock},
          revealRank = '${revealRank}',
          defeatRank = '${defeatRank}',
          damageRank = '${damageRank}',
          takeDamageRank = '${takeDamageRank}',
          normalSkillRank = '${normalSkillRank}',
          energySkillRank = '${energySkillRank}',
          floors = '${floors}',
          skippedFloor = '${skippedFloor}',
          updated = '${timeNow}';
  `;
}

/**
 * @description 原始数据转table数据
 * @since Beta v0.6.1
 * @param {TGApp.Sqlite.Abyss.TableRaw} data - 原始数据
 * @returns {TGApp.Sqlite.Abyss.TableData}
 */
function raw2Data(data: TGApp.Sqlite.Abyss.TableRaw): TGApp.Sqlite.Abyss.TableData {
  return {
    uid: data.uid,
    id: data.id,
    startTime: data.startTime,
    endTime: data.endTime,
    totalBattleTimes: data.totalBattleTimes,
    totalWinTimes: data.totalWinTimes,
    maxFloor: data.maxFloor,
    totalStar: data.totalStar,
    isUnlock: data.isUnlock,
    revealRank: JSON.parse(data.revealRank),
    defeatRank: JSON.parse(data.defeatRank),
    damageRank: JSON.parse(data.damageRank),
    takeDamageRank: JSON.parse(data.takeDamageRank),
    normalSkillRank: JSON.parse(data.normalSkillRank),
    energySkillRank: JSON.parse(data.energySkillRank),
    floors: JSON.parse(data.floors),
    skippedFloor: data.skippedFloor,
    updated: data.updated,
  };
}

/**
 * @description data数据转table数据
 * @since Beta v0.6.8
 * @param {TGApp.Sqlite.Abyss.TableData} data - 原始数据
 * @returns {TGApp.Sqlite.Abyss.TableRaw}
 */
function data2Raw(data: TGApp.Sqlite.Abyss.TableData): TGApp.Sqlite.Abyss.TableRaw {
  return {
    uid: data.uid,
    id: data.id,
    startTime: data.startTime,
    endTime: data.endTime,
    totalBattleTimes: data.totalBattleTimes,
    totalWinTimes: data.totalWinTimes,
    maxFloor: data.maxFloor,
    totalStar: data.totalStar,
    isUnlock: data.isUnlock,
    revealRank: JSON.stringify(data.revealRank),
    defeatRank: JSON.stringify(data.defeatRank),
    damageRank: JSON.stringify(data.damageRank),
    takeDamageRank: JSON.stringify(data.takeDamageRank),
    normalSkillRank: JSON.stringify(data.normalSkillRank),
    energySkillRank: JSON.stringify(data.energySkillRank),
    floors: JSON.stringify(data.floors),
    skippedFloor: data.skippedFloor,
    updated: data.updated,
  };
}

/**
 * @description 获取所有有数据的UID
 * @since Beta v0.6.0
 * @returns {Promise<void>}
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM SpiralAbyss;");
  return res.map((i) => i.uid);
}

/**
 * @description 获取深渊数据
 * @since Beta v0.6.3
 * @param {string} uid - 游戏UID
 * @returns {Promise<TGApp.Sqlite.Abyss.TableRaw[]>}
 */
async function getAbyss(uid?: string): Promise<TGApp.Sqlite.Abyss.TableData[]> {
  const db = await TGSqlite.getDB();
  let res: TGApp.Sqlite.Abyss.TableRaw[];
  if (uid === undefined) {
    res = await db.select<TGApp.Sqlite.Abyss.TableRaw[]>(
      "SELECT * FROM SpiralAbyss order by id DESC;",
    );
  } else {
    res = await db.select<TGApp.Sqlite.Abyss.TableRaw[]>(
      "SELECT * FROM SpiralAbyss WHERE uid = ? order by id DESC;",
      [uid],
    );
  }
  return res.map((i) => raw2Data(i));
}

/**
 * @description 保存深渊数据
 * @since Beta v0.6.0
 * @param {string} uid - 游戏UID
 * @param {TGApp.Game.Abyss.FullData} data - 深渊数据
 * @returns {Promise<void>}
 */
async function saveAbyss(uid: string, data: TGApp.Game.Abyss.FullData): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute(getInsertSql(uid, data));
}

/**
 * @description 删除指定UID存档的数据
 * @since Beta v0.6.0
 * @param {string} uid - 游戏UID
 * @returns {Promise<void>}
 */
async function delAbyss(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM SpiralAbyss WHERE uid = ?;", [uid]);
}

/**
 * @description 备份深渊数据
 * @since Beta v0.6.0
 * @param {string} dir - 备份目录
 * @returns {Promise<void>}
 */
async function backupAbyss(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
    await TGLogger.Warn(`未检测到备份目录，已创建`);
  }
  const data = await getAbyss();
  await writeTextFile(`${dir}${path.sep()}abyss.json`, JSON.stringify(data));
}

/**
 * @description 恢复深渊数据
 * @since Beta v0.6.8
 * @param {string} dir - 备份文件目录
 * @returns {Promise<boolean>}
 */
async function restoreAbyss(dir: string): Promise<boolean> {
  const filePath = `${dir}${path.sep()}abyss.json`;
  if (!(await exists(filePath))) return false;
  try {
    const data: TGApp.Sqlite.Abyss.TableData[] = JSON.parse(await readTextFile(filePath));
    const db = await TGSqlite.getDB();
    for (const abyss of data) {
      await db.execute(getRestoreSql(abyss));
    }
    return true;
  } catch (e) {
    await TGLogger.Error(`恢复深渊数据失败${filePath}`);
    await TGLogger.Error(`${e}`);
    return false;
  }
}

const TSUserAbyss = {
  getAllUid,
  getAbyss,
  saveAbyss,
  delAbyss,
  backupAbyss,
  restoreAbyss,
};

export default TSUserAbyss;
