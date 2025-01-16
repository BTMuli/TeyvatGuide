/**
 * @file web/request/apiHubReq.ts
 * @description apiHub下的请求
 * @since Beta v0.6.8
 */

import TGHttp from "@/utils/TGHttp.js";

// MysApiHubApiBaseUrl => Mahabu
const Mahabu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/api/";
// MysApiHubWapiBaseUrl => Mahwbu
const Mahwbu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取所有版块
 * @since Beta v0.6.8
 * @return {Promise<TGApp.Plugins.Mys.Forum.GamesResp>}
 */
async function getAllGamesForums(): Promise<Array<TGApp.BBS.Forum.GameForum>> {
  return (
    await TGHttp<TGApp.BBS.Forum.GameForumResp>(`${Mahwbu}getAllGamesForums`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
    })
  ).data.list;
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
    await TGHttp<TGApp.BBS.Vote.InfoResp>(`${Mahabu}getVotes`, {
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
    await TGHttp<TGApp.BBS.Vote.ResultResp>(`${Mahabu}getVotesResult`, {
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
    await TGHttp<TGApp.BBS.Navigator.HomeResponse>(`${Mahabu}home/new`, {
      method: "GET",
      headers: { "x-rpc-client_type": "2" },
      query: { gids: gid },
    })
  ).data.navigator;
}

const apiHubReq = {
  vote: { info: getVotes, result: getVoteResult },
  home: homeNew,
  forum: getAllGamesForums,
};

export default apiHubReq;
