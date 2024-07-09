/**
 * @file plugins/Hutao/request/getAvatarUseRate.ts
 * @description 获取角色使用率
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色使用率
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>}
 */
async function getAvatarUseRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]> {
  const url = HutaoApi.Abyss.avatar.useRate;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUseResponse>(url, { method: "GET" });
  return resp.data;
}

export default getAvatarUseRate;
