/**
 * @file plugins/Mys/request/getVoteData.ts
 * @description Mys 插件投票请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import MysApi from "../api/index.js";

/**
 * @description 获取投票信息
 * @since Beta v0.5.0
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Info>}
 */
export async function getVoteInfo(id: string, uid: string): Promise<TGApp.Plugins.Mys.Vote.Info> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/getVotes";
  const params = { owner_uid: uid, vote_ids: id };
  const resp = await TGHttp<TGApp.Plugins.Mys.Vote.InfoResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
    query: params,
  });
  return resp.data.data[0];
}

/**
 * @description 获取投票结果
 * @since Beta v0.5.0
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Result>}
 */
export async function getVoteResult(
  id: string,
  uid: string,
): Promise<TGApp.Plugins.Mys.Vote.Result> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/getVotesResult";
  const params = { owner_uid: uid, vote_ids: id };
  const resp = await TGHttp<TGApp.Plugins.Mys.Vote.ResultResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
    query: params,
  });
  return resp.data.data[0];
}
