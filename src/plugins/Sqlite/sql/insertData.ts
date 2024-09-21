/**
 * @file plugins/Sqlite/sql/insertData.ts
 * @description Sqlite 插入数据 sql 语句
 * @since Beta v0.6.0
 */

import { timestampToDate } from "../../../utils/toolFunc.js";
import { transUserRecord } from "../utils/transUserRecord.js";

/**
 * @description 插入应用数据
 * @since Alpha v0.2.0
 * @param {string} key 键
 * @param {string} value 值
 * @returns {string} sql
 */
export function insertAppData(key: string, value: string): string {
  return `
      INSERT INTO AppData (key, value, updated)
      VALUES ('${key}', '${value}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value   = '${value}',
                                     updated = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入原神战绩数据
 * @since Beta v0.6.0
 * @param {TGApp.Game.Record.FullData} data 原神战绩数据
 * @param {string} uid 用户 UID
 * @returns {string} sql
 */
export function insertRecordData(data: TGApp.Game.Record.FullData, uid: string): string {
  const transData = transUserRecord(data);
  const timeNow = timestampToDate(new Date().getTime());
  transData.uid = uid;
  return `
      INSERT INTO UserRecord(uid, role, avatars, stats, worldExplore, homes, updated)
      VALUES ('${transData.uid}', '${transData.role}', '${transData.avatars}', '${transData.stats}',
              '${transData.worldExplore}', '${transData.homes}', '${timeNow}')
      ON CONFLICT(uid) DO UPDATE
          SET role         = '${transData.role}',
              avatars      = '${transData.avatars}',
              stats        = '${transData.stats}',
              worldExplore = '${transData.worldExplore}',
              homes        = '${transData.homes}',
              updated      = '${timeNow}';
  `;
}
