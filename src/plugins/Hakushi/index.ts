/**
 * @file plugins/Hakushi/index.ts
 * @description Hakushi 插件入口
 * @since Beta v0.8.8
 */

import { getCharacters, getWeapons } from "./request/itemReq.js";
import {
  getCharacterData,
  getWeaponData,
  refreshCharacters,
  refreshWeapons,
} from "./utils/dataUtil.js";

const Hakushi = {
  character: {
    get: getCharacterData,
    refresh: refreshCharacters,
  },
  weapon: {
    get: getWeaponData,
    refresh: refreshWeapons,
  },
  request: {
    character: getCharacters,
    weapon: getWeapons,
  },
};

export default Hakushi;
