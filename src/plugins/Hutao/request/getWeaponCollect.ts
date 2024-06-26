/**
 * @file plugins Hutao request getWeaponCollect.ts
 * @description 获取武器搭配
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取武器搭配
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.WeaponCollocation[]>}
 */
async function getWeaponCollect(): Promise<TGApp.Plugins.Hutao.Abyss.WeaponCollocation[]> {
  const url = HutaoApi.Abyss.weapon;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.WeaponCollocationResponse>) => {
      return res.data.data;
    });
}

export default getWeaponCollect;
