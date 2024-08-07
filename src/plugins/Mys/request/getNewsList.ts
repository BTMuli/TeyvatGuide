/**
 * @file plugins/Mys/request/getNewsList.ts
 * @description Mys 插件咨讯请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取 News 列表
 * @since Beta v0.5.0
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
  const url = "https://bbs-api.mihoyo.com/post/wapi/getNewsList";
  const params = {
    gids: gid,
    page_size: pageSize.toString(),
    type: newsType,
    last_id: lastId.toString(),
  };
  const resp = await TGHttp<TGApp.Plugins.Mys.News.Response>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    query: params,
  });
  return resp.data;
}

export default getNewsList;
