/**
 * apiHub下的请求
 * @since Beta v0.10.1
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

// MysApiHubBaseUrl => Mahbu
const Mahbu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * 获取所有版块
 * @since Beta v0.10.1
 * @returns 版块信息响应数据
 */
async function getAllGamesForums(): Promise<TGApp.BBS.Forum.GameForumResp> {
  const resp = await TGHttps.get<TGApp.BBS.Forum.GameForumResp>(`${Mahbu}wapi/getAllGamesForums`, {
    headers: { "Content-Type": "application/json", referer: Referer },
  });
  return resp.data;
}

/**
 * 获取应用配置
 * @since Beta v0.10.1
 * @param gid - 分区ID
 * @returns 应用配置响应数据
 */
async function getAppConfig(gid?: string): Promise<TGApp.BBS.AppConfig.Resp> {
  const query = gid ? { gid } : undefined;
  const resp = await TGHttps.get<TGApp.BBS.AppConfig.Resp>(`${Mahbu}api/getAppConfig`, {
    headers: { "Content-Type": "application/json", referer: Referer },
    query,
  });
  return resp.data;
}

/**
 * 获取所有分区
 * @since Beta v0.10.1
 * @returns 分区信息响应数据
 */
async function getGameList(): Promise<TGApp.BBS.Game.ListResp> {
  const resp = await TGHttps.get<TGApp.BBS.Game.ListResp>(`${Mahbu}wapi/getGameList`, {
    headers: { "Content-Type": "application/json", referer: Referer },
  });
  return resp.data;
}

/**
 * 获取用户米游币任务列表
 * @since Beta v0.10.1
 * @param cookie - 用户 Cookie
 * @returns 用户米游币任务列表响应数据
 */
async function getMissions(cookie: Record<string, string>): Promise<TGApp.BBS.Mission.InfoResp> {
  const param = { point_sn: "myb" };
  const header = getRequestHeader(cookie, "GET", param);
  const resp = await TGHttps.get<TGApp.BBS.Mission.InfoResp>(`${Mahbu}wapi/getMissions`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 获取分享配置
 * @since Beta v0.10.1
 * @remarks **需要验证码登录返回的 Cookie**
 * @param postId - 帖子 ID
 * @param cookie - 用户 Cookie
 * @returns 基础响应数据
 */
async function getShareConf(
  postId: string,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Response.Base> {
  const params = { entity_id: postId, entity_type: 1 };
  const header = {
    ...getRequestHeader(cookie, "GET", params, "K2", true),
    "x-rpc-client_type": "2",
  };
  const resp = await TGHttps.get<TGApp.BBS.Response.Base>(`${Mahbu}api/getShareConf`, {
    headers: header,
    query: params,
  });
  return resp.data;
}

/**
 * 获取用户米游币任务完成状态
 * @since Beta v0.10.1
 * @remarks **需要验证码登录的 Cookie**
 * @param cookie - 用户 Cookie
 * @returns 米游币任务完成状态响应数据
 */
async function getUserMissionsState(
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Mission.StateResp> {
  const param = { point_sn: "myb" };
  const header = getRequestHeader(cookie, "GET", param);
  const resp = await TGHttps.get<TGApp.BBS.Mission.StateResp>(`${Mahbu}wapi/getUserMissionsState`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 获取投票信息
 * @since Beta v0.10.1
 * @param id - 投票 ID
 * @param uid - 用户 ID
 * @returns 投票信息响应数据
 */
async function getVotes(id: string, uid: string): Promise<TGApp.BBS.Vote.InfoResp> {
  const resp = await TGHttps.get<TGApp.BBS.Vote.InfoResp>(`${Mahbu}api/getVotes`, {
    headers: { "Content-Type": "application/json", referer: Referer },
    query: { owner_uid: uid, vote_ids: id },
  });
  return resp.data;
}

/**
 * 获取投票结果
 * @since Beta v0.10.1
 * @param id - 投票 ID
 * @param uid - 用户 ID
 * @returns 投票结果响应数据
 */
async function getVoteResult(id: string, uid: string): Promise<TGApp.BBS.Vote.ResultResp> {
  const resp = await TGHttps.get<TGApp.BBS.Vote.ResultResp>(`${Mahbu}api/getVotesResult`, {
    headers: { "Content-Type": "application/json", referer: Referer },
    query: { owner_uid: uid, vote_ids: id },
  });
  return resp.data;
}

/**
 * 获取首页导航列表
 * @since Beta v0.10.1
 * @param gid - GID
 * @returns 首页导航列表响应数据
 */
async function homeNew(gid: number = 2): Promise<TGApp.BBS.Navigator.HomeResp> {
  const resp = await TGHttps.get<TGApp.BBS.Navigator.HomeResp>(`${Mahbu}api/home/new`, {
    headers: { "x-rpc-client_type": "2" },
    query: { gids: gid },
  });
  return resp.data;
}

/**
 * 签到
 * @since Beta v0.10.1
 * @remarks **需要验证码登录获取的 Cookie**
 * @param cookie - 用户 Cookie
 * @param gid - 分区ID
 * @param challenge - 极验参数
 * @returns 基础响应数据
 */
async function signIn(
  cookie: Record<string, string>,
  gid: number = 2,
  challenge?: string,
): Promise<TGApp.BBS.Response.Base> {
  const data = { gids: gid };
  let header: Record<string, string> = {
    ...getRequestHeader(cookie, "POST", JSON.stringify(data), "X6"),
    "x-rpc-client_type": "2",
  };
  if (challenge) header = { ...header, "x-rpc-challenge": challenge };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(`${Mahbu}app/api/signIn`, {
    headers: header,
    body: data,
  });
  return resp.data;
}

/**
 * 点赞
 * @since Beta v0.10.1
 * @param id - 帖子 ID
 * @param cookie - 用户 Cookie
 * @param cancel - 是否取消点赞
 * @returns 基础响应数据
 */
async function upVotePost(
  id: string,
  cookie: Record<string, string>,
  cancel: boolean = false,
): Promise<TGApp.BBS.Response.Base> {
  const data = { is_cancel: cancel, post_id: id };
  const header = {
    ...getRequestHeader(cookie, "POST", data, "K2", true),
    "x-rpc-client_type": "2",
  };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(`${Mahbu}api/upvotePost`, {
    headers: header,
    body: data,
  });
  return resp.data;
}

const apiHubReq = {
  vote: { info: getVotes, result: getVoteResult },
  appConfig: getAppConfig,
  home: homeNew,
  forum: getAllGamesForums,
  game: getGameList,
  mission: { list: getMissions, state: getUserMissionsState },
  sign: signIn,
  post: { like: upVotePost, share: getShareConf },
};

export default apiHubReq;
