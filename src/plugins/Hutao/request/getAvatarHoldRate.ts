/**
 * @file plugins Hutao request getAvatarHoldRate.ts
 * @description Hutao API 获取角色持有率数据请求方法
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取角色持有率数据
 * @since Alpha v0.2.0
 * @returns {Promise<TGApp.Plugins.Hutao.AbyssAvatarHoldRate[]>}
 */
async function getAvatarHoldRate (): Promise<TGApp.Plugins.Hutao.AbyssAvatarHoldRate[]> {
  const url = HutaoApi.Abyss.avatar.holdRate;
  return await http.fetch<TGApp.Plugins.Hutao.AbyssAvatarHoldRateResponse>(url, {
    method: "GET",
  }).then((res) => {
    return res.data.data;
  });
}

export default getAvatarHoldRate;
