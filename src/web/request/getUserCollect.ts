/**
 * @file web/request/getUserCollect.ts
 * @description 获取用户收藏请求模块
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 获取用户收藏帖子
 * @since Beta v0.5.0
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
  const resp = await TGHttp<TGApp.BBS.Collection.PostResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
