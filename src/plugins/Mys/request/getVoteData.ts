/**
 * @file plugins/Mys/request/getVoteData.ts
 * @description Mys 插件投票请求
 * @since Beta v0.3.9
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取投票信息
 * @since Beta v0.3.9
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Info>}
 */
export async function getVoteInfo(id: string, uid: string): Promise<TGApp.Plugins.Mys.Vote.Info> {
  const url = `https://bbs-api.miyoushe.com/apihub/api/getVotes?owner_uid=${uid}&vote_ids=${id}`;
  return await http
    .fetch<TGApp.Plugins.Mys.Vote.InfoResponse>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: MysApi.Post.Referer,
      },
    })
    .then((res) => {
      return res.data.data.data[0];
    });
}

/**
 * @description 获取投票结果
 * @since Beta v0.3.9
 * @param {string} id 投票 ID
 * @param {string} uid 用户 ID
 * @return {Promise<TGApp.Plugins.Mys.Vote.Result>}
 */
export async function getVoteResult(
  id: string,
  uid: string,
): Promise<TGApp.Plugins.Mys.Vote.Result> {
  const url = `https://bbs-api.miyoushe.com/apihub/api/getVotesResult?owner_uid=${uid}&vote_ids=${id}`;
  return await http
    .fetch<TGApp.Plugins.Mys.Vote.ResultResponse>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: MysApi.Post.Referer,
      },
    })
    .then((res) => {
      return res.data.data.data[0];
    });
}
