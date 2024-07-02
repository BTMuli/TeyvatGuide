/**
 * @file plugins/Mys/request/searchPost.ts
 * @description 帖子搜索
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 搜索帖子
 * @since Beta v0.5.0
 * @param {string} gid 游戏分区 ID
 * @param {string} keyword 关键词
 * @param {string} last_id 最后一条帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Search.PostsResponseData>} 返回帖子列表
 */
async function searchPosts(
  gid: string = "2",
  keyword: string,
  last_id: string,
): Promise<TGApp.Plugins.Mys.Search.PostsResponseData> {
  const url = "https://bbs-api.miyoushe.com/post/wapi/searchPosts";
  const params = { gids: gid, keyword, last_id, size: "20" };
  const resp = await TGHttp<TGApp.Plugins.Mys.Search.PostsResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    query: params,
  });
  return resp.data;
}

export default searchPosts;
