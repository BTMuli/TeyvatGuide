/**
 * @file core database init.ts
 * @description SQLite 数据库初始化
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri
import Database from "tauri-plugin-sql-api";
// sql
import initSql from "./init.sql?raw";

/**
 * @description 初始化数据库
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function initDatabase (): Promise<void> {
  const db = await Database.load("sqlite:tauri-genshin.db");
  // 执行sql语句
  await db.execute(initSql);
  await db.close();
}
