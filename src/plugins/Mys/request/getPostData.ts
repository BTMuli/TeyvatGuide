/**
 * @file plugins Mys request getPostData.ts
 * @description Mys帖子请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import MysApi from "../api/index.js";

/**
 * @description 获取帖子信息
 * @since Beta v0.5.0
 * @param {number} postId 帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Post.FullData>}
 */
async function getPostData(postId: number): Promise<TGApp.Plugins.Mys.Post.FullData> {
  const url = "https://bbs-api.mihoyo.com/post/wapi/getPostFull";
  const params = { post_id: postId.toString() };
  const resp = await TGHttp<TGApp.Plugins.Mys.Post.Response>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
    query: params,
  });
  return resp.data.post;
}

export default getPostData;
