/**
 * @file plugins/Mys/request/getHomeNavigator.ts
 * @description Mys 插件首页导航请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取首页导航列表
 * @since Beta v0.5.0
 * @param {number} gid GID
 * @return {Promise<TGApp.BBS.Navigator.Navigator[]>}
 */
async function getHomeNavigator(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/home/new";
  const params = { gids: gid.toString() };
  const resp = await TGHttp<TGApp.BBS.Navigator.HomeResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    query: params,
  });
  return resp.data.navigator;
}

export default getHomeNavigator;
