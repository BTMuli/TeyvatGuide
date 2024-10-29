/**
 * @file plugins/Hutao/request/getAvatarCollect.ts
 * @description 获取角色搭配数据
 * @since Beta v0.6.2
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取角色搭配数据
 * @since Beta v0.6.2
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]>}
 */
async function getAvatarCollect(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]> {
  const url = HutaoApi.Abyss.avatar.collect;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarCollocationResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

export default getAvatarCollect;
