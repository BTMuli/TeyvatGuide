/**
 * @file plugins/Hakushi/request/itemReq.ts
 * @description Hakushi API 请求
 * @since Beta v0.8.8
 */

import TGHttp from "@utils/TGHttp.js";
import TGLogger from "@utils/TGLogger.js";

const HakushiUrl: Readonly<string> = "https://api.hakush.in/gi/data/";

/**
 * @description 获取角色数据
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.CharacterResponse|false>} 角色数据或 false
 */
export async function getCharacters(): Promise<TGApp.Plugins.Hakushi.CharacterResponse | false> {
  try {
    const resp = await TGHttp<TGApp.Plugins.Hakushi.CharacterResponse>(
      `${HakushiUrl}character.json`,
      { method: "GET" },
    );
    return resp;
  } catch (error) {
    await TGLogger.Error(`Failed to fetch character metadata from Hakushi: ${error}`);
    return false;
  }
}

/**
 * @description 获取武器数据
 * @since Beta v0.8.8
 * @returns {Promise<TGApp.Plugins.Hakushi.WeaponResponse|false>} 武器数据或 false
 */
export async function getWeapons(): Promise<TGApp.Plugins.Hakushi.WeaponResponse | false> {
  try {
    const resp = await TGHttp<TGApp.Plugins.Hakushi.WeaponResponse>(
      `${HakushiUrl}weapon.json`,
      { method: "GET" },
    );
    return resp;
  } catch (error) {
    await TGLogger.Error(`Failed to fetch weapon metadata from Hakushi: ${error}`);
    return false;
  }
}
