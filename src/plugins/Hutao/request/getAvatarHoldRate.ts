/**
 * @file plugins Hutao request getAvatarHoldRate.ts
 * @description Hutao API 获取角色持有率数据请求方法
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取角色持有率数据
 * @since Alpha v0.2.0
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>}
 */
async function getAvatarHoldRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]> {
  const url = HutaoApi.Abyss.avatar.holdRate;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.AvatarHoldResponse>) => {
      return res.data.data;
    });
}

export default getAvatarHoldRate;
