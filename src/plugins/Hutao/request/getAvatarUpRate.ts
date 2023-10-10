/**
 * @file plugins Hutao request getAvatarUpRate.ts
 * @description 获取角色上场率数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取角色上场率数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>}
 */
async function getAvatarUpRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]> {
  const url = HutaoApi.Abyss.avatar.upRate;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.AvatarUpResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getAvatarUpRate;
