/**
 * @file plugins/Hutao/request/getAvatarHoldRate.ts
 * @description Hutao API 获取角色持有率数据请求方法
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色持有率数据
 * @since Beta v0.5.0
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>}
 */
async function getAvatarHoldRate(): Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]> {
  const url = HutaoApi.Abyss.avatar.holdRate;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarHoldResponse>(url, { method: "GET" });
  return resp.data;
}

export default getAvatarHoldRate;
