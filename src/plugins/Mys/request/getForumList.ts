/**
 * @file plugins/Mys/request/getForumList.ts
 * @description Mys 插件特定论坛请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取特定论坛列表
 * @since Beta v0.5.0
 * @param {number} forumId 特定论坛 ID
 * @param {number} type 排序方式: 0-按热度排序，1-最新回复，2-按时间排序
 * @return {Promise<TGApp.Plugins.Mys.Forum.FullData>}
 */
async function getForumList(
  forumId: number,
  type: number = 0,
): Promise<TGApp.Plugins.Mys.Forum.FullData> {
  const url = "https://bbs-api.miyoushe.com/post/wapi/getForumPostList";
  const params = { forum_id: forumId.toString(), sort_type: type.toString() };
  const resp = await TGHttp<TGApp.Plugins.Mys.Forum.Response>(url, {
    method: "GET",
    query: params,
  });
  return resp.data;
}

export default getForumList;
