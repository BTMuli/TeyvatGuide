/**
 * @file web/utils/restoreData.ts
 * @description 数据恢复
 * @since Beta v0.3.9
 */

import { fs, path } from "@tauri-apps/api";

import TGSqlite from "../../plugins/Sqlite";

/**
 * @description 恢复 Cookie 数据
 * @since Alpha v0.2.0
 * @returns {Promise<boolean>}
 */
export async function restoreCookieData(): Promise<boolean> {
  const cookiePath = `${await path.appLocalDataDir()}\\userData\\cookie.json`;
  if (!(await fs.exists(cookiePath))) return false;
  const cookieData = await fs.readTextFile(cookiePath);
  await TGSqlite.saveAppData("cookie", JSON.stringify(JSON.parse(cookieData)));
  return true;
}

/**
 * @description 恢复深渊数据
 * @since Beta v0.3.9
 * @returns {Promise<boolean>}
 */
export async function restoreAbyssData(): Promise<boolean> {
  const abyssPath = `${await path.appLocalDataDir()}\\userData\\abyss.json`;
  if (!(await fs.exists(abyssPath))) return false;
  const abyssData = await fs.readTextFile(abyssPath);
  const parseData = JSON.parse(abyssData);
  if (!parseData || !Array.isArray(parseData)) return false;
  await TGSqlite.restoreAbyss(<TGApp.Sqlite.Abyss.SingleTable[]>parseData);
  return true;
}
