/**
 * @file plugins/Hakushi/utils/dataUtil.ts
 * @description Hakushi 数据存储工具
 * @since Beta v0.8.8
 */

import TGSqlite from "@plugins/Sqlite/index.js";
import TGLogger from "@utils/TGLogger.js";

import { getCharacters, getWeapons } from "../request/itemReq.js";

const STORAGE_KEY_CHARACTER = "hakushi_character";
const STORAGE_KEY_WEAPON = "hakushi_weapon";

/**
 * @description 从数据库获取角色数据
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.CharacterResponse|false>}
 */
async function loadCharactersFromDB(): Promise<TGApp.Plugins.Hakushi.CharacterResponse | false> {
  try {
    const db = await TGSqlite.getDB();
    const result = await db.select<Array<{ value: string }>>(
      "SELECT value FROM AppData WHERE key = ?",
      [STORAGE_KEY_CHARACTER],
    );
    if (result.length === 0) return false;
    return JSON.parse(result[0].value);
  } catch (error) {
    await TGLogger.Error(`Failed to load character data from DB: ${error}`);
    return false;
  }
}

/**
 * @description 从数据库获取武器数据
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.WeaponResponse|false>}
 */
async function loadWeaponsFromDB(): Promise<TGApp.Plugins.Hakushi.WeaponResponse | false> {
  try {
    const db = await TGSqlite.getDB();
    const result = await db.select<Array<{ value: string }>>(
      "SELECT value FROM AppData WHERE key = ?",
      [STORAGE_KEY_WEAPON],
    );
    if (result.length === 0) return false;
    return JSON.parse(result[0].value);
  } catch (error) {
    await TGLogger.Error(`Failed to load weapon data from DB: ${error}`);
    return false;
  }
}

/**
 * @description 保存角色数据到数据库
 * @since Beta v0.8.8
 * @param {TGApp.Plugins.Hakushi.CharacterResponse} data - 角色数据
 * @returns {Promise<void>}
 */
async function saveCharactersToDB(data: TGApp.Plugins.Hakushi.CharacterResponse): Promise<void> {
  try {
    const db = await TGSqlite.getDB();
    const value = JSON.stringify(data);
    await db.execute(
      "INSERT OR REPLACE INTO AppData (key, value, updated) VALUES (?, ?, datetime('now', 'localtime'))",
      [STORAGE_KEY_CHARACTER, value],
    );
    await TGLogger.Info("Character data saved to DB");
  } catch (error) {
    await TGLogger.Error(`Failed to save character data to DB: ${error}`);
  }
}

/**
 * @description 保存武器数据到数据库
 * @since Beta v0.8.8
 * @param {TGApp.Plugins.Hakushi.WeaponResponse} data - 武器数据
 * @returns {Promise<void>}
 */
async function saveWeaponsToDB(data: TGApp.Plugins.Hakushi.WeaponResponse): Promise<void> {
  try {
    const db = await TGSqlite.getDB();
    const value = JSON.stringify(data);
    await db.execute(
      "INSERT OR REPLACE INTO AppData (key, value, updated) VALUES (?, ?, datetime('now', 'localtime'))",
      [STORAGE_KEY_WEAPON, value],
    );
    await TGLogger.Info("Weapon data saved to DB");
  } catch (error) {
    await TGLogger.Error(`Failed to save weapon data to DB: ${error}`);
  }
}

/**
 * @description 刷新角色数据（从 API 获取并保存到数据库）
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.CharacterResponse|false>}
 */
export async function refreshCharacters(): Promise<TGApp.Plugins.Hakushi.CharacterResponse | false> {
  const data = await getCharacters();
  if (data) {
    await saveCharactersToDB(data);
  }
  return data;
}

/**
 * @description 刷新武器数据（从 API 获取并保存到数据库）
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.WeaponResponse|false>}
 */
export async function refreshWeapons(): Promise<TGApp.Plugins.Hakushi.WeaponResponse | false> {
  const data = await getWeapons();
  if (data) {
    await saveWeaponsToDB(data);
  }
  return data;
}

/**
 * @description 获取角色数据（优先从数据库获取，如果没有则从 API 获取）
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.CharacterResponse|false>}
 */
export async function getCharacterData(): Promise<TGApp.Plugins.Hakushi.CharacterResponse | false> {
  let data = await loadCharactersFromDB();
  if (!data) {
    data = await refreshCharacters();
  }
  return data;
}

/**
 * @description 获取武器数据（优先从数据库获取，如果没有则从 API 获取）
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.WeaponResponse|false>}
 */
export async function getWeaponData(): Promise<TGApp.Plugins.Hakushi.WeaponResponse | false> {
  let data = await loadWeaponsFromDB();
  if (!data) {
    data = await refreshWeapons();
  }
  return data;
}
