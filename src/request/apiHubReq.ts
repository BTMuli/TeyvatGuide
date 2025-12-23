/**
 * apiHub下的请求
 * @since Beta v0.8.2
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// MysApiHubBaseUrl => Mahbu
const Mahbu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * 获取所有版块
 * @since Beta v0.6.8
 * @returns 版块信息
 */
async function getAllGamesForums(): Promise<Array<TGApp.BBS.Forum.GameForum>> {
  return (
    await TGHttp<TGApp.BBS.Forum.GameForumResp>(`${Mahbu}wapi/getAllGamesForums`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
    })
  ).data.list;
}

/**
 * 获取应用配置
 * @since Beta v0.8.2
 * @param gid - 分区ID
 * @returns 应用配置
 */
async function getAppConfig(
  gid?: string,
): Promise<TGApp.BBS.AppConfig.FullData | TGApp.BBS.Response.Base> {
  let url = `${Mahbu}api/getAppConfig`;
  if (gid) url += `?gid=${gid}`;
  const resp = await TGHttp<TGApp.BBS.AppConfig.Resp | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", referer: Referer },
  });
  if (resp.retcode === 0) return resp.data.config;
  return <TGApp.BBS.Response.Base>resp;
}

/**
 * 获取所有分区
 * @since Beta v0.6.8
 * @returns 分区信息
 */
async function getGameList(): Promise<Array<TGApp.BBS.Game.Item>> {
  return (
    await TGHttp<TGApp.BBS.Game.ListResp>(`${Mahbu}wapi/getGameList`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
    })
  ).data.list;
}

/**
 * 获取用户米游币任务列表
 * @since Beta v0.7.2
 * @param cookie - 用户 Cookie
 * @returns 用户米游币任务列表
 */
async function getMissions(cookie: Record<string, string>): Promise<TGApp.BBS.Mission.InfoResp> {
  const param = { point_sn: "myb" };
  const header = getRequestHeader(cookie, "GET", param);
  return await TGHttp<TGApp.BBS.Mission.InfoResp>(`${Mahbu}wapi/getMissions`, {
    method: "GET",
    headers: header,
    query: param,
  });
}

/**
 * 获取分享配置
 * @since Beta v0.7.0
 * @remarks **需要验证码登录返回的 Cookie**
 * @param postId - 帖子 ID
 * @param cookie - 用户 Cookie
 * @returns 基础响应
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
  return await TGHttp<TGApp.BBS.Response.Base>(`${Mahbu}api/getShareConf`, {
    method: "GET",
    headers: header,
    query: params,
  });
}

/**
 * 获取用户米游币任务完成状态
 * @since Beta v0.7.2
 * @remarks **需要验证码登录的 Cookie**
 * @param cookie - 用户 Cookie
 * @returns 米游币任务完成状态
 */
async function getUserMissionsState(
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Mission.StateResp> {
  const param = { point_sn: "myb" };
  const header = getRequestHeader(cookie, "GET", param);
  return await TGHttp<TGApp.BBS.Mission.StateResp>(`${Mahbu}wapi/getUserMissionsState`, {
    method: "GET",
    headers: header,
    query: param,
  });
}

/**
 * 获取投票信息
 * @since Beta v0.6.2
 * @param id - 投票 ID
 * @param uid - 用户 ID
 * @returns 投票信息
 */
async function getVotes(id: string, uid: string): Promise<TGApp.BBS.Vote.Info> {
  return (
    await TGHttp<TGApp.BBS.Vote.InfoResp>(`${Mahbu}api/getVotes`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
      query: { owner_uid: uid, vote_ids: id },
    })
  ).data.data[0];
}

/**
 * 获取投票结果
 * @since Beta v0.6.2
 * @param id - 投票 ID
 * @param uid - 用户 ID
 * @returns 投票结果
 */
async function getVoteResult(id: string, uid: string): Promise<TGApp.BBS.Vote.Result> {
  return (
    await TGHttp<TGApp.BBS.Vote.ResultResp>(`${Mahbu}api/getVotesResult`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
      query: { owner_uid: uid, vote_ids: id },
    })
  ).data.data[0];
}

/**
 * 获取首页导航列表
 * @since Beta v0.6.2
 * @param gid - GID
 * @returns 首页导航列表
 */
async function homeNew(gid: number = 2): Promise<Array<TGApp.BBS.Navigator.Navigator>> {
  return (
    await TGHttp<TGApp.BBS.Navigator.HomeResp>(`${Mahbu}api/home/new`, {
      method: "GET",
      headers: { "x-rpc-client_type": "2" },
      query: { gids: gid },
    })
  ).data.navigator;
}

/**
 * 签到
 * @since Beta v0.7.1
 * @remarks **需要验证码登录获取的 Cookie**
 * @param cookie - 用户 Cookie
 * @param gid - 分区ID
 * @param challenge - 极验参数
 * @returns 基础响应
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
  return await TGHttp<TGApp.BBS.Response.Base>(`${Mahbu}app/api/signIn`, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
}

/**
 * 点赞
 * @since Beta v0.7.0
 * @param id - 帖子 ID
 * @param cookie - 用户 Cookie
 * @param cancel - 是否取消点赞
 * @returns 基础响应
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
  return await TGHttp<TGApp.BBS.Response.Base>(`${Mahbu}api/upvotePost`, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
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
