/**
 * @file request/hakushReq.ts
 * @description Hakush API requests for fallback metadata
 * @since Beta v0.8.8
 */

import TGHttp from "@utils/TGHttp.js";
import TGLogger from "@utils/TGLogger.js";

// Base URL for Hakush API
const hakushBaseUrl = "https://api.hakush.in/gi/data/";

/**
 * @description Hakush API character response type
 * @since Beta v0.8.8
 */
export type HakushCharacter = {
  id: string;
  name: string;
  star: number;
};

/**
 * @description Hakush API weapon response type
 * @since Beta v0.8.8
 */
export type HakushWeapon = {
  id: string;
  name: string;
  star: number;
};

// Cache for character and weapon data
let characterCache: Record<string, HakushCharacter> | null = null;
let weaponCache: Record<string, HakushWeapon> | null = null;

/**
 * @description Fetch character metadata from Hakush API
 * @since Beta v0.8.8
 * @returns {Promise<Record<string, HakushCharacter>|false>} Character metadata or false on error
 */
async function getCharacters(): Promise<Record<string, HakushCharacter> | false> {
  if (characterCache) return characterCache;
  
  try {
    const resp = await TGHttp<Record<string, HakushCharacter>>(
      `${hakushBaseUrl}character.json`,
      { method: "GET" },
    );
    characterCache = resp;
    return resp;
  } catch (error) {
    await TGLogger.Error(`Failed to fetch character metadata from Hakush: ${error}`);
    return false;
  }
}

/**
 * @description Fetch weapon metadata from Hakush API
 * @since Beta v0.8.8
 * @returns {Promise<Record<string, HakushWeapon>|false>} Weapon metadata or false on error
 */
async function getWeapons(): Promise<Record<string, HakushWeapon> | false> {
  if (weaponCache) return weaponCache;
  
  try {
    const resp = await TGHttp<Record<string, HakushWeapon>>(`${hakushBaseUrl}weapon.json`, {
      method: "GET",
    });
    weaponCache = resp;
    return resp;
  } catch (error) {
    await TGLogger.Error(`Failed to fetch weapon metadata from Hakush: ${error}`);
    return false;
  }
}

const HakushApi = {
  character: getCharacters,
  weapon: getWeapons,
};

export default HakushApi;
