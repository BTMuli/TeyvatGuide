/**
 * @file plugins/Sqlite/sql/insertData.ts
 * @description Sqlite 插入数据 sql 语句
 * @since Beta v0.6.0
 */

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
