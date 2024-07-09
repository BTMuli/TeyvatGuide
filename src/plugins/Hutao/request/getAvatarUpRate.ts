/**
 * @file plugins/Hutao/request/getAvatarUpRate.ts
 * @description 获取角色上场率数据
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色上场率数据
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>}
 */
async function getAvatarUpRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]> {
  const url = HutaoApi.Abyss.avatar.upRate;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUpResponse>(url, { method: "GET" });
  return resp.data;
}

export default getAvatarUpRate;
