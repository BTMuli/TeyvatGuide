/**
 * @file plugins Mys request getNewsList.ts
 * @description Mys 插件咨讯请求
 * @since Alpha v0.2.1
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取 News 列表
 * @since Alpha v0.2.1
 * @param {string} gid GID
 * @param {string} newsType 咨讯类型: 1 为公告，2 为活动，3 为咨讯
 * @param {number} pageSize 返回数量
 * @param {number} lastId 上一次请求的最后一条数据的 id
 * @return {Promise<TGApp.Plugins.Mys.News.FullData>}
 */
async function getNewsList(
  gid: string = "2",
  newsType: string = "1",
  pageSize: number = 20,
  lastId: number = 0,
): Promise<TGApp.Plugins.Mys.News.FullData> {
  const url = MysApi.News.replace("{pageSize}", pageSize.toString())
    .replace("{gid}", gid)
    .replace("{newsType}", newsType)
    .replace("{lastId}", lastId.toString());
  return await http.fetch<TGApp.Plugins.Mys.News.Response>(url).then((res) => res.data.data);
}

export default getNewsList;
