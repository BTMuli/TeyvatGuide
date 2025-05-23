/**
 * @file request/apiHubReq.ts
 * @description apiHub下的请求
 * @since Beta v0.7.2
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// MysApiHubBaseUrl => Mahbu
const Mahbu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取所有版块
 * @since Beta v0.6.8
 * @return {Promise<Array<TGApp.BBS.Forum.GameForum>>}
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
 * @description 获取所有分区
 * @since Beta v0.6.8
 * @return {Promise<Array<TGApp.BBS.Game.Item>>}
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
 * @description 获取用户米游币任务完成情况
 * @since Beta v0.7.2
 * @param {Record<string,string>} cookie 用户 Cookie
 * @return {Promise<TGApp.BBS.Mission.InfoRes>}
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
 * @description 获取分享配置
 * @since Beta v0.7.0
 * @description **需要验证码登录返回的 Cookie**
 * @param {string} postId 帖子 ID
 * @param {Record<string,string>} cookie 用户 Cookie
 * @return {Promise<TGApp.BBS.Response.Base>}
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
 * @description 获取任务完成情况
 * @since Beta v0.7.2
 * @description **需要验证码登录的 Cookie**
 * @param {Record<string,string>} cookie 用户 Cookie
 * @return {Promise<TGApp.BBS.Mission.StateResp>}
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
 * @description 获取投票信息
 * @since Beta v0.6.2
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.BBS.Vote.Info>}
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
 * @description 获取投票结果
 * @since Beta v0.6.2
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.BBS.Vote.Result>}
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
 * @description 获取首页导航列表
 * @since Beta v0.6.2
 * @param {number} gid GID
 * @return {Promise<TGApp.BBS.Navigator.Navigator[]>}
 */
async function homeNew(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  return (
    await TGHttp<TGApp.BBS.Navigator.HomeResponse>(`${Mahbu}api/home/new`, {
      method: "GET",
      headers: { "x-rpc-client_type": "2" },
      query: { gids: gid },
    })
  ).data.navigator;
}

/**
 * @description 签到
 * @since Beta v0.7.1
 * @description **需要验证码登录获取的 Cookie**
 * @param {Record<string,string>} cookie 用户 Cookie
 * @param {string} gid
 * @param {string} challenge
 * @return {Promise<TGApp.BBS.Response.Base>}
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
 * @description 点赞
 * @since Beta v0.7.0
 * @param {string} id 帖子 ID
 * @param {Record<string,string>} cookie 用户 Cookie
 * @param {boolean} cancel 是否取消点赞
 * @return {Promise<TGApp.BBS.Response.Base>}
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
  home: homeNew,
  forum: getAllGamesForums,
  game: getGameList,
  mission: { list: getMissions, state: getUserMissionsState },
  sign: signIn,
  post: { like: upVotePost, share: getShareConf },
};

export default apiHubReq;
