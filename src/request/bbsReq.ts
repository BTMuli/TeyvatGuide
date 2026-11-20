/**
 * BBS 请求模块
 * @since Beta v0.13.2
 */

import { getCookieTokenCookie, getWebAccountCookies } from "@utils/account/accountCookie.js";
import TGBbs from "@utils/bbs/TGBbs.js";
import {
  getAppSignCookie,
  getCollectionRequestHeader,
  getCommunityCookie,
  getRequestHeader,
} from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

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
 * 从米游社原生接口读取登录账号的资料。
 * @since Beta v0.13.2
 * @param cookie - 当前账号的原生凭据
 * @returns 用户信息响应数据
 */
async function getCurrentUserInfo(
  cookie: TGApp.App.Account.SignUidCookie,
): Promise<TGApp.BBS.User.InfoResp> {
  const ck = getAppSignCookie(cookie);
  const params = { uid: ck.stuid };
  const resp = await TGHttps.get<TGApp.BBS.User.InfoResp>(`${mbBu}user/api/getUserFullInfo`, {
    headers: {
      ...getRequestHeader(ck, "GET", params, "K2", true),
      "user-agent": TGBbs.ua,
      "x-rpc-client_type": "2",
    },
    query: params,
  });
  return resp.data;
}

/**
 * 根据 cookie 获取用户信息
 * @since Beta v0.13.2
 * @param cookie - 账户 cookie
 * @param gid - 分区 ID，默认原神分区
 * @returns 用户信息响应数据
 */
async function getUserFullInfo(
  cookie: TGApp.App.Account.Cookie,
  gid: string = "2",
): Promise<TGApp.BBS.User.InfoResp> {
  const ck = getWebAccountCookies(cookie);
  const params = { gids: gid };
  const resp = await TGHttps.get<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    headers: getRequestHeader(ck, "GET", params, "X4", true),
    query: params,
  });
  return resp.data;
}

/**
 * 根据gid和id获取用户信息
 * @since Beta v0.13.2
 * @param gid - gid
 * @param userId - 用户 id
 * @param cookie - 当前账户 cookie，传入后才能获取真实关注关系
 * @returns 用户信息响应数据
 */
async function getOtherUserInfo(
  gid: string,
  userId: string,
  cookie?: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.User.InfoResp> {
  const params = { gids: gid.toString(), uid: userId };
  const ck = cookie === undefined ? {} : getWebAccountCookies(cookie);
  const resp = await TGHttps.get<TGApp.BBS.User.InfoResp>(`${mbBu}user/wapi/getUserFullInfo`, {
    headers: getRequestHeader(ck, "GET", params, "X4", true),
    query: params,
  });
  return resp.data;
}

/**
 * 获取合集信息
 * @since Beta v0.13.0
 * @param cid - 合集 id
 * @param gid - gid
 * @param cookie - 当前账户 cookie，用于获取登录态合集信息
 * @returns 合集信息响应数据
 */
async function getCollectionDetail(
  cid: string,
  gid: number,
  cookie?: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Collection.InfoResp> {
  const params = { gids: gid, id: cid };
  const resp = await TGHttps.get<TGApp.BBS.Collection.InfoResp>(
    `${mbBu}collection/wapi/collection/detail`,
    {
      headers: getCollectionRequestHeader(
        cookie === undefined ? {} : getCommunityCookie(cookie),
        "GET",
        params,
      ),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取米游币消耗/增加记录
 * @since Beta v0.13.2
 * @param cookie - 用户ck
 * @param isCostAction - 是否获取消耗记录
 * @param lastTime - 最后一项的时间戳，初始为0
 * @returns 米游币消耗/增加记录
 */
async function getMybRecordDetail(
  cookie: TGApp.App.Account.Cookie,
  isCostAction: boolean = false,
  lastTime: string = "0",
): Promise<TGApp.BBS.Mission.MybRecResp> {
  const ck = getCookieTokenCookie(cookie);
  const params = {
    app_id: "1",
    point_sn: "myb",
    time: lastTime,
    action: isCostAction ? "2" : "1",
    size: "20",
  };
  const resp = await TGHttps.get<TGApp.BBS.Mission.MybRecResp>(
    `${mbBu}common/homutreasure/v1/web/user/record`,
    {
      headers: getRequestHeader(ck, "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

const bbsReq = {
  collection: getCollectionDetail,
  currentUserInfo: getCurrentUserInfo,
  emojis: getEmoticonSet,
  userInfo: getUserFullInfo,
  otherUserInfo: getOtherUserInfo,
  mybRecord: getMybRecordDetail,
};

export default bbsReq;
