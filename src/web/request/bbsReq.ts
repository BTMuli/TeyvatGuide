/**
 * @file web/request/bbsReq.ts
 * @description BBS 请求模块
 * @since Beta v0.6.3
 */

import TGHttp from "../../utils/TGHttp.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

/**
 * @description 根据 cookie 获取用户信息
 * @since Beta v0.5.0
 * @param {TGApp.App.Account.Cookie} cookie - 账户 cookie
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info>}
 */
async function getUserFullInfo(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info> {
  const url = "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo";
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { gids: "2" };
  const header = getRequestHeader(ck, "GET", params, "common", true);
  const resp = await TGHttp<TGApp.Plugins.Mys.User.HomeResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * @description 获取用户收藏帖子
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie - 用户 cookie
 * @param {string} uid - 用户 uid
 * @param {string} offset - 偏移量
 * @returns {Promise<TGApp.BBS.Collection.PostRespData|TGApp.BBS.Response.Base>} 用户收藏帖子
 */
async function userFavouritePost(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
  offset: string = "",
): Promise<TGApp.BBS.Collection.PostRespData | TGApp.BBS.Response.Base> {
  const url = "https://bbs-api.miyoushe.com/post/wapi/userFavouritePost";
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { size: "20", uid, offset };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.BBS.Collection.PostResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const BBSApi = {
  userInfo: getUserFullInfo,
  lovePost: userFavouritePost,
};

export default BBSApi;
