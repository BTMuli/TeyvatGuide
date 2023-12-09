/**
 * @file plugins/Mys/request/getHomeNavigator.ts
 * @description Mys 插件首页导航请求
 * @since Beta v0.3.7
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取首页导航列表
 * @since Beta v0.3.7
 * @param {number} gid GID
 * @return {Promise<TGApp.BBS.Navigator.Navigator[]>}
 */
async function getHomeNavigator(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  const url = MysApi.Navigator.replace("{gid}", gid.toString());
  return await http
    .fetch<TGApp.BBS.Navigator.HomeResponse>(url)
    .then((res) => res.data.data.navigator);
}

export default getHomeNavigator;
