/**
 * @file core database utils.ts
 * @description SQLite 数据库相关工具函数
 * @since Alpha v0.1.4
 */

// tauri
import { fs } from "@tauri-apps/api";

/**
 * @description 检测数据库是否存在
 * @since Alpha v0.1.4
 * @returns {Promise<boolean>}
 */
export async function checkDatabase (): Promise<boolean> {
  return await fs.exists("tauri-genshin.db", { dir: fs.BaseDirectory.AppConfig });
}

/**
 * @description 删除数据库
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function deleteDatabase (): Promise<void> {
  if (await checkDatabase()) {
    await fs.removeFile("tauri-genshin.db", { dir: fs.BaseDirectory.AppConfig });
  }
}
