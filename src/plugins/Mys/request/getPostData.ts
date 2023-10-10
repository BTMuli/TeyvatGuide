/**
 * @file plugins Mys request getPostData.ts
 * @description Mys帖子请求
 * @since Alpha v0.2.1
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取帖子信息
 * @since Alpha v0.2.1
 * @param {number} postId 帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Post.FullData>}
 */
async function getPostData(postId: number): Promise<TGApp.Plugins.Mys.Post.FullData> {
  const url = MysApi.Post.Api.replace("{postId}", postId.toString());
  return await http
    .fetch<TGApp.Plugins.Mys.Post.Response>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: MysApi.Post.Referer,
      },
    })
    .then((res) => {
      return res.data.data.post;
    });
}

export default getPostData;
