/**
 * @file plugins Hutao request getAvatarUseRate.ts
 * @description 获取角色使用率
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取角色使用率
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>}
 */
async function getAvatarUseRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]> {
  const url = HutaoApi.Abyss.avatar.useRate;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.AvatarUseResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getAvatarUseRate;
