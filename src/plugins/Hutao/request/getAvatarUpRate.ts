/**
 * @file plugins Hutao request getAvatarUpRate.ts
 * @description 获取角色上场率数据
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取角色上场率数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.AbyssAvatarUpRate[]>}
 */
async function getAvatarUpRate (): Promise<TGApp.Plugins.Hutao.AbyssAvatarUpRate[]> {
  const url = HutaoApi.Abyss.avatar.upRate;
  return await http.fetch<TGApp.Plugins.Hutao.AbyssAvatarUpRateResponse>(url, {
    method: "GET",
  }).then((res) => {
    return res.data.data;
  });
}

export default getAvatarUpRate;
