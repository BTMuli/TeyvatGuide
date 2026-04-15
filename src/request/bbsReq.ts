/**
 * BBS 请求模块
 * @since Beta v0.10.1
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

/* MysBBSBaseUrl => mbBu */
const mbBu: Readonly<string> = "https://bbs-api.miyoushe.com/";

/**
 * 获取表情包列表
 * @since Beta v0.10.1
 * @returns 表情包列表响应数据
 */
async function getEmoticonSet(): Promise<TGApp.BBS.Emoji.Resp> {
  const resp = await TGHttps.get<TGApp.BBS.Emoji.Resp>(`${mbBu}misc/api/emoticon_set`, {});
  return resp.data;
}

/**
 * 根据 cookie 获取用户信息
 * @since Beta v0.10.1
 * @param cookie - 账户 cookie
 * @returns 用户信息响应数据
 */
async function getUserFullInfo(cookie: TGApp.App.Account.Cookie): Promise<TGApp.BBS.User.InfoResp> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { gids: "2" };
  const resp = await TGHttps.get<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    headers: getRequestHeader(ck, "GET", params, "X4", true),
    query: params,
  });
  return resp.data;
}

/**
 * 根据gid和id获取用户信息
 * @since Beta v0.10.1
 * @param gid - gid
 * @param userId - 用户 id
 * @returns 用户信息响应数据
 */
async function getOtherUserInfo(gid: string, userId: string): Promise<TGApp.BBS.User.InfoResp> {
  const params = { gids: gid.toString(), uid: userId };
  const resp = await TGHttps.get<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    headers: getRequestHeader({}, "GET", params, "X4", true),
    query: params,
  });
  return resp.data;
}

/**
 * 获取合集信息
 * @since Beta v0.10.1
 * @TODO salt计算异常
 * @param cid - 合集 id
 * @param gid - gid
 * @returns 合集信息响应数据
 */
async function getCollectionDetail(
  cid: string,
  gid: number,
): Promise<TGApp.BBS.Collection.InfoResp> {
  const params = { gids: gid, id: cid };
  const resp = await TGHttps.get<TGApp.BBS.Collection.InfoResp>(
    `${mbBu}collection/wapi/collection/detail`,
    {
      headers: getRequestHeader({}, "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

const bbsReq = {
  collection: getCollectionDetail,
  emojis: getEmoticonSet,
  userInfo: getUserFullInfo,
  otherUserInfo: getOtherUserInfo,
};

export default bbsReq;
