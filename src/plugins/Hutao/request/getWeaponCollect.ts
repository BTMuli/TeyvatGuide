/**
 * @file plugins/Hutao/request/getWeaponCollect.ts
 * @description 获取武器搭配
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取武器搭配
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.WeaponCollocation[]>}
 */
async function getWeaponCollect(): Promise<TGApp.Plugins.Hutao.Abyss.WeaponCollocation[]> {
  const url = HutaoApi.Abyss.weapon;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.WeaponCollocationResponse>(url, {
    method: "GET",
  });
  return resp.data;
}

export default getWeaponCollect;
