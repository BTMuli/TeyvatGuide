/**
 * @file plugins Hutao request getWeaponCollect.ts
 * @description 获取武器搭配
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取武器搭配
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.AbyssWeaponCollocation[]>}
 */
async function getWeaponCollect(): Promise<TGApp.Plugins.Hutao.AbyssWeaponCollocation[]> {
  const url = HutaoApi.Abyss.weapon;
  return await http
    .fetch<TGApp.Plugins.Hutao.AbyssWeaponCollocationResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getWeaponCollect;
