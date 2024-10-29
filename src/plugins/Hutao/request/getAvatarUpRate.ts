/**
 * @file plugins/Hutao/request/getAvatarUpRate.ts
 * @description 获取角色上场率数据
 * @since Beta v0.6.2
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色上场率数据
 * @since Beta v0.6.2
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>}
 */
async function getAvatarUpRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]> {
  const url = HutaoApi.Abyss.avatar.upRate;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUpResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

export default getAvatarUpRate;
