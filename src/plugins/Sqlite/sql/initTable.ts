/**
 * @file plugins Sqlite sql initTable.ts
 * @description Sqlite 初始化数据 sql 语句
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// data
import createTable from "./createTable.sql?raw";
import createTrigger from "./createTrigger.sql?raw";

/**
 * @description 初始化数据库表
 * @since Alpha v0.2.0
 * @returns {string[]} sql
 */
function initTableSql(): string[] {
  return [createTable, createTrigger];
}

export default initTableSql;
