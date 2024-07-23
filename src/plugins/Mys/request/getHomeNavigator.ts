/**
 * @file plugins/Mys/request/getHomeNavigator.ts
 * @description Mys 插件首页导航请求
 * @since Beta v0.5.1
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取首页导航列表
 * @since Beta v0.5.1
 * @param {number} gid GID
 * @return {Promise<TGApp.BBS.Navigator.Navigator[]>}
 */
async function getHomeNavigator(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/home/new";
  const params = { gids: gid.toString() };
  const header = { "x-rpc-client_type": "2" };
  const resp = await TGHttp<TGApp.BBS.Navigator.HomeResponse>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  return resp.data.navigator;
}

export default getHomeNavigator;
