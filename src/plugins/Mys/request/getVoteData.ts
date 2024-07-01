/**
 * @file plugins/Mys/request/getVoteData.ts
 * @description Mys 插件投票请求
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import MysApi from "../api/index.js";

/**
 * @description 获取投票信息
 * @since Beta v0.4.5
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Info>}
 */
export async function getVoteInfo(id: string, uid: string): Promise<TGApp.Plugins.Mys.Vote.Info> {
  const url = "https://bbs-api.miyoushe.com/apihub/api/getVotes";
  const params = { owner_uid: uid, vote_ids: id };
  return await http
    .fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
      query: params,
    })
    .then((res: Response<TGApp.Plugins.Mys.Vote.InfoResponse>) => res.data.data.data[0]);
}

/**
 * @description 获取投票结果
 * @since Beta v0.4.5
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
  return await http
    .fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
      query: params,
    })
    .then((res: Response<TGApp.Plugins.Mys.Vote.ResultResponse>) => res.data.data.data[0]);
}
