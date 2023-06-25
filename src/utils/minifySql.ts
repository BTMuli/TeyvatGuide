/**
 * @file utils minifySql.ts
 * @description 减少 sql 语句体积的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

/**
 * @description 减少 sql 语句体积的工具函数
 * @function minifySql
 * @param {string} sql - sql 语句
 * @return {string} minifiedSql - 减少体积后的 sql 语句
 */
function minifySql(sql: string): string {
  return sql.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

export default minifySql;
