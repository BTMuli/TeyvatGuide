/**
 * @file web/request/bbsReq.ts
 * @description BBS 请求模块
 * @since Beta v0.6.3
 */

import TGHttp from "@/utils/TGHttp.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

/**
 * @description 根据 cookie 获取用户信息
 * @since Beta v0.5.0
 * @param {TGApp.App.Account.Cookie} cookie - 账户 cookie
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info>}
 */
async function getUserFullInfo(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { gids: "2" };
  const resp = await TGHttp<TGApp.Plugins.Mys.User.HomeResponse | TGApp.BBS.Response.Base>(
    "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
    { method: "GET", headers: getRequestHeader(ck, "GET", params, "X4", true), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * @description 根据gid和id获取用户信息
 * @since Beta v0.6.7
 * @param {number} gid - gid
 * @param {string} userId - 用户 id
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info>}
 */
async function getOtherUserInfo(
  gid: number,
  userId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info> {
  const params = { gids: gid.toString(), uid: userId };
  const resp = await TGHttp<TGApp.Plugins.Mys.User.HomeResponse | TGApp.BBS.Response.Base>(
    "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
    { method: "GET", headers: getRequestHeader({}, "GET", params, "X4", true), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * @description 获取用户发布帖子
 * @since Beta v0.6.7
 * @param {string} uid - 用户 uid
 * @param [string] offset - 偏移量
 * @returns {Promise<TGApp.BBS.Collection.PostRespData|TGApp.BBS.Response.Base>} 用户发布帖子
 */

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
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { size: "20", uid, offset };
  const resp = await TGHttp<TGApp.BBS.Collection.PostResponse | TGApp.BBS.Response.Base>(
    "https://bbs-api.miyoushe.com/post/wapi/userFavouritePost",
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const BBSApi = {
  userInfo: getUserFullInfo,
  otherUserInfo: getOtherUserInfo,
  lovePost: userFavouritePost,
};

export default BBSApi;
