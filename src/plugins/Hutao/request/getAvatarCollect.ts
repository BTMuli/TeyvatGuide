/**
 * @file plugins Hutao request getAvatarCollect.ts
 * @description 获取角色搭配数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取角色搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]>}
 */
async function getAvatarCollect(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]> {
  const url = HutaoApi.Abyss.avatar.collect;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.AvatarCollocationResponse>) => {
      return res.data.data;
    });
}

export default getAvatarCollect;
