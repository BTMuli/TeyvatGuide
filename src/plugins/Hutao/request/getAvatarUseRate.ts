/**
 * @file plugins Hutao request getAvatarUseRate.ts
 * @description 获取角色使用率
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取角色使用率
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>}
 */
async function getAvatarUseRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]> {
  const url = HutaoApi.Abyss.avatar.useRate;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.AvatarUseResponse>) => {
      return res.data.data;
    });
}

export default getAvatarUseRate;
