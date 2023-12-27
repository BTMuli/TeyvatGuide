/**
 * @file plugins/Mys/request/getCollectionPosts.ts
 * @description Mys 获取合集帖子
 * @since Beta v0.3.9
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取合集信息
 * @since Beta v0.3.9
 * @todo invalid request
 * @param {number} collectionId 合集 ID
 * @returns {Promise<TGApp.Plugins.Mys.Collection.ResponseData>} 合集信息
 */
export async function getCollectionData(
  collectionId: number,
): Promise<TGApp.Plugins.Mys.Collection.ResponseData> {
  const url = `https://bbs-api.miyoushe.com/collection/wapi/collection/detail?id=${collectionId}`;
  console.log(url);
  return await http
    .fetch<TGApp.Plugins.Mys.Collection.Response>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: MysApi.Post.Referer,
      },
    })
    .then((res) => {
      console.log(res.data);
      return res.data.data;
    });
}

/**
 * @description 获取合集帖子
 * @since Beta v0.3.9
 * @param {string} collectionId 合集 ID
 * @returns {Promise<TGApp.Plugins.Mys.Post.FullData[]>}
 */
export async function getCollectionPosts(
  collectionId: string,
): Promise<TGApp.Plugins.Mys.Collection.Data[]> {
  const url = `https://bbs-api.miyoushe.com/post/wapi/getPostFullInCollection?collection_id=${collectionId}`;
  return await http
    .fetch<TGApp.Plugins.Mys.Collection.ResponsePosts>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: MysApi.Post.Referer,
      },
    })
    .then((res) => {
      return res.data.data.posts;
    });
}
