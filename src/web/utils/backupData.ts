/**
 * @file web utils backupData.ts
 * @description 数据备份
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

// tauri
import { fs, path } from "@tauri-apps/api";

/**
 * @description 备份 Cookie 数据
 * @since Alpha v0.2.0
 * @param {Record<string, string>} cookie cookie
 * @returns {Promise<void>}
 */
export async function backupCookieData (cookie: Record<string, string>): Promise<void> {
  const savePath = `${await path.appLocalDataDir()}\\userData\\cookie.json`;
  await fs.writeTextFile(savePath, JSON.stringify(cookie, null, 2));
}
