/**
 * @file web/request/getUserCollect.ts
 * @description 获取用户收藏请求模块
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";

import TGUtils from "../utils/TGUtils";

/**
 * @description 获取用户收藏帖子
 * @since Beta v0.4.5
 * @param {Record<string, string>} cookie - 用户 cookie
 * @param {string} uid - 用户 uid
 * @param {string} offset - 偏移量
 * @returns {Promise<TGApp.BBS.Collection.PostRespData|TGApp.BBS.Response.Base>} 用户收藏帖子
 */
export async function getUserCollect(
  cookie: Record<string, string>,
  uid: string,
  offset: string = "",
): Promise<TGApp.BBS.Collection.PostRespData | TGApp.BBS.Response.Base> {
  const url = "https://bbs-api.miyoushe.com/post/wapi/userFavouritePost";
  const params = { size: "20", uid, offset };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Collection.PostResponse | TGApp.BBS.Response.Base>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data;
    });
}
