/**
 * @file plugins Mys request getPostData.ts
 * @description Mys帖子请求
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import MysApi from "../api/index.js";

/**
 * @description 获取帖子信息
 * @since Beta v0.4.5
 * @param {number} postId 帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Post.FullData>}
 */
async function getPostData(postId: number): Promise<TGApp.Plugins.Mys.Post.FullData> {
  const url = "https://bbs-api.mihoyo.com/post/wapi/getPostFull";
  const params = {
    post_id: postId.toString(),
  };
  return await http
    .fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
      query: params,
    })
    .then((res: Response<TGApp.Plugins.Mys.Post.Response>) => res.data.data.post);
}

export default getPostData;
