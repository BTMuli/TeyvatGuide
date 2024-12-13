/**
 * @file plugins/Mys/request/apiHubReq.ts
 * @description apiHub下的请求
 * @since Beta v0.6.2
 */

import TGHttp from "@/utils/TGHttp.js";

// MysApiHubApiBaseUrl => Mahabu
const Mahabu: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/api/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取投票信息
 * @since Beta v0.6.2
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Info>}
 */
export async function getVotes(id: string, uid: string): Promise<TGApp.Plugins.Mys.Vote.Info> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Vote.InfoResponse>(`${Mahabu}getVotes`, {
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
 * @return {Promise<TGApp.Plugins.Mys.Vote.Result>}
 */
export async function getVoteResult(
  id: string,
  uid: string,
): Promise<TGApp.Plugins.Mys.Vote.Result> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Vote.ResultResponse>(`${Mahabu}getVotesResult`, {
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
export async function homeNew(gid: number = 2): Promise<TGApp.BBS.Navigator.Navigator[]> {
  return (
    await TGHttp<TGApp.BBS.Navigator.HomeResponse>(`${Mahabu}home/new`, {
      method: "GET",
      headers: { "x-rpc-client_type": "2" },
      query: { gids: gid },
    })
  ).data.navigator;
}
