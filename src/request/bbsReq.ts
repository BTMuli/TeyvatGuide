/**
 * BBS 请求模块
 * @since Beta v0.7.3
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

/* MysBBSBaseUrl => mbBu */
const mbBu: Readonly<string> = "https://bbs-api.miyoushe.com/";

/**
 * 获取表情包列表
 * @since Beta v0.7.3
 * @returns 转换后的表情包列表
 */
async function getEmoticonSet(): Promise<Record<string, string> | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.BBS.Emoji.Resp>(`${mbBu}misc/api/emoticon_set`, {
    method: "GET",
  });
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
 * 根据 cookie 获取用户信息
 * @since Beta v0.5.0
 * @param cookie - 账户 cookie
 * @returns 用户信息
 */
async function getUserFullInfo(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { gids: "2" };
  const resp = await TGHttp<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    method: "GET",
    headers: getRequestHeader(ck, "GET", params, "X4", true),
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * 根据gid和id获取用户信息
 * @since Beta v0.7.2
 * @param gid - gid
 * @param userId - 用户 id
 * @returns 用户信息
 */
async function getOtherUserInfo(
  gid: string,
  userId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.User.Info> {
  const params = { gids: gid.toString(), uid: userId };
  const resp = await TGHttp<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    method: "GET",
    headers: getRequestHeader({}, "GET", params, "X4", true),
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}

/**
 * 获取合集信息
 * @since Beta v0.7.3
 * @TODO salt计算异常
 * @param cid - 合集 id
 * @param gid - gid
 * @returns 合集信息
 */
async function getCollectionDetail(
  cid: string,
  gid: number,
): Promise<TGApp.BBS.Collection.InfoRes | TGApp.BBS.Response.Base> {
  const params = { gids: gid, id: cid };
  const resp = await TGHttp<TGApp.BBS.Collection.InfoResp>(
    `${mbBu}collection/wapi/collection/detail`,
    {
      method: "GET",
      headers: getRequestHeader({}, "GET", params, "X4", true),
      query: params,
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const bbsReq = {
  collection: getCollectionDetail,
  emojis: getEmoticonSet,
  userInfo: getUserFullInfo,
  otherUserInfo: getOtherUserInfo,
};

export default bbsReq;
