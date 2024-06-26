/**
 * @file plugins Hutao request getAvatarUpRate.ts
 * @description 获取角色上场率数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取角色上场率数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>}
 */
async function getAvatarUpRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]> {
  const url = HutaoApi.Abyss.avatar.upRate;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.AvatarUpResponse>) => {
      return res.data.data;
    });
}

export default getAvatarUpRate;
