/**
 * @file plugins/Mys/request/getHomeNavigator.ts
 * @description Mys 插件首页导航请求
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

/**
 * @description 获取首页导航列表
 * @since Beta v0.4.5
 * @param {number} gid GID
 * @return {Promise<TGApp.BBS.Navigator.Navigator[]>}
 */
async function getHomeNavigator(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/home/new";
  const params = { gids: gid.toString() };
  return await http
    .fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, query: params })
    .then((res: Response<TGApp.BBS.Navigator.HomeResponse>) => res.data.data.navigator);
}

export default getHomeNavigator;
