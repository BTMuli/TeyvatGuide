/**
 * @file plugins/Mys/request/getCollectionPosts.ts
 * @description Mys 获取合集帖子
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import MysApi from "../api/index.js";

/**
 * @description 获取合集信息
 * @since Beta v0.4.5
 * @todo invalid request
 * @param {number} collectionId 合集 ID
 * @returns {Promise<TGApp.Plugins.Mys.Collection.ResponseData>} 合集信息
 */
export async function getCollectionData(
  collectionId: number,
): Promise<TGApp.Plugins.Mys.Collection.ResponseData> {
  const url = "https://bbs-api.miyoushe.com/collection/wapi/collection/detail";
  const params = {
    id: collectionId.toString(),
  };
  return await http
    .fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
      query: params,
    })
    .then((res: Response<TGApp.Plugins.Mys.Collection.Response>) => {
      console.log(res.data);
      return res.data.data;
    });
}

/**
 * @description 获取合集帖子
 * @since Beta v0.4.5
 * @param {string} collectionId 合集 ID
 * @returns {Promise<TGApp.Plugins.Mys.Post.FullData[]>}
 */
export async function getCollectionPosts(
  collectionId: string,
): Promise<TGApp.Plugins.Mys.Collection.Data[]> {
  const url = "https://bbs-api.miyoushe.com/post/wapi/getPostFullInCollection";
  const params = { collection_id: collectionId };
  return await http
    .fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Referer: MysApi.PostReferer },
      query: params,
    })
    .then((res: Response<TGApp.Plugins.Mys.Collection.ResponsePosts>) => res.data.data.posts);
}
