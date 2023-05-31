/**
 * @file plugins Hutao request getAvatarUseRate.ts
 * @description 获取角色使用率
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取角色使用率
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.AbyssAvatarUseRate[]>}
 */
async function getAvatarUseRate (): Promise<TGApp.Plugins.Hutao.AbyssAvatarUseRate[]> {
  const url = HutaoApi.Abyss.avatar.useRate;
  return await http.fetch<TGApp.Plugins.Hutao.AbyssAvatarUseRateResponse>(url, {
    method: "GET",
  }).then((res) => {
    return res.data.data;
  });
}

export default getAvatarUseRate;