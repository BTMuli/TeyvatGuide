/**
 * @file plugins/Hutao/request/getAvatarUseRate.ts
 * @description 获取角色使用率
 * @since Beta v0.6.2
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色使用率
 * @since Beta v0.6.2
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>}
 */
async function getAvatarUseRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]> {
  const url = HutaoApi.Abyss.avatar.useRate;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUseResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

export default getAvatarUseRate;
