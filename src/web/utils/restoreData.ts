/**
 * @file web utils restoreData.ts
 * @description 数据恢复
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { fs, path } from "@tauri-apps/api";
// utils
import TGSqlite from "../../utils/TGSqlite";

/**
 * @description 恢复 Cookie 数据
 * @since Alpha v0.2.0
 * @returns {Promise<boolean>}
 */
export async function restoreCookieData (): Promise<boolean> {
  const cookiePath = `${await path.appLocalDataDir()}\\userData\\cookie.json`;
  if (!await fs.exists(cookiePath)) return false;
  const cookieData = await fs.readTextFile(cookiePath);
  await TGSqlite.saveAppData("cookie", JSON.stringify(JSON.parse(cookieData)));
  return true;
}
