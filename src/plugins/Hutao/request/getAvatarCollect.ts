/**
 * @file plugins Hutao request getAvatarCollect.ts
 * @description 获取角色搭配数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取角色搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]>}
 */
async function getAvatarCollect(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]> {
  const url = HutaoApi.Abyss.avatar.collect;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.AvatarCollocationResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getAvatarCollect;
