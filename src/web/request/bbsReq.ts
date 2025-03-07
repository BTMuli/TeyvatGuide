/**
 * @file web/request/bbsReq.ts
 * @description BBS 请求模块
 * @since Beta v0.7.2
 */

import TGHttp from "@/utils/TGHttp.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

/**
 * @description 获取表情包列表
 * @since Beta v0.7.2
 * @return {Promise<Record<string,string>|TGApp.BBS.Response.Base>}
 */
async function getEmoticonSet(): Promise<Record<string, string> | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.BBS.Emoji.Resp>(
    "https://bbs-api-static.miyoushe.com/misc/api/emoticon_set",
    { method: "GET" },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  const emojis: Record<string, string> = {};
  for (const series of resp.data.list) {
    for (const emoji of series.list) {
      emojis[emoji.name] = emoji.icon;
    }
  }
  return emojis;
}

/**
 * @description 根据 cookie 获取用户信息
 * @since Beta v0.5.0
 * @param {TGApp.App.Account.Cookie} cookie - 账户 cookie
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info>}
 */
async function getUserFullInfo(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { gids: "2" };
  const resp = await TGHttp<TGApp.BBS.User.InfoResp>(
    "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
    { method: "GET", headers: getRequestHeader(ck, "GET", params, "X4", true), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * @description 根据gid和id获取用户信息
 * @since Beta v0.7.1
 * @param {number} gid - gid
 * @param {string} userId - 用户 id
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info>}
 */
async function getOtherUserInfo(
  gid: number,
  userId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info> {
  const params = { gids: gid.toString(), uid: userId };
  const resp = await TGHttp<TGApp.BBS.User.InfoResp>(
    "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
    { method: "GET", headers: getRequestHeader({}, "GET", params, "X4", true), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

const BBSApi = {
  emojis: getEmoticonSet,
  userInfo: getUserFullInfo,
  otherUserInfo: getOtherUserInfo,
};

export default BBSApi;
