/**
 * @file plugins/Mys/request/getForumList.ts
 * @description Mys 插件特定论坛请求
 * @since Beta v0.3.7
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取特定论坛列表
 * @since Beta v0.3.7
 * @param {number} forumId 特定论坛 ID
 * @param {number} gid GID
 * @param {number} type 排序方式: 0-按热度排序，1-最新回复，2-按时间排序
 * @return {Promise<TGApp.Plugins.Mys.Forum.FullData>}
 */
async function getForumList(
  forumId: number,
  gid: number = 2,
  type: number = 0,
): Promise<TGApp.Plugins.Mys.Forum.FullData> {
  const url = MysApi.Forum.replace("{forum}", forumId.toString())
    .replace("{gid}", gid.toString())
    .replace("{type}", type.toString());
  return await http.fetch<TGApp.Plugins.Mys.Forum.Response>(url).then((res) => res.data.data);
}

export default getForumList;
