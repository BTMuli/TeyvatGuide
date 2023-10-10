/**
 * @file plugins Hutao request getAvatarHoldRate.ts
 * @description Hutao API 获取角色持有率数据请求方法
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取角色持有率数据
 * @since Alpha v0.2.0
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>}
 */
async function getAvatarHoldRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]> {
  const url = HutaoApi.Abyss.avatar.holdRate;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.AvatarHoldResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getAvatarHoldRate;
