/**
 * @file plugins/Mys/request/postReq.ts
 * @description 帖子相关的获取
 * @since Beta v0.6.10/v0.7.0
 */

import TGHttp from "@/utils/TGHttp.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

// MysPostApiBaseUrl => Mpabu
const Mpabu: Readonly<string> = "https://bbs-api.mihoyo.com/post/wapi/";
// MysTopicApiBaseUrl => Mtapu
const Mtabu: Readonly<string> = "https://bbs-api.miyoushe.com/topic/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取单个帖子信息
 * @since Beta v0.6.10/v0.7.0
 * @param {number} postId 帖子 ID
 * @param {Record<string, string>} cookie Cookie
 * @return {Promise<TGApp.Plugins.Mys.Post.FullData|TGApp.BBS.Response.Base>}
 */
export async function getPostFull(
  postId: number,
  cookie?: Record<string, string>,
): Promise<TGApp.Plugins.Mys.Post.FullData | TGApp.BBS.Response.Base> {
  const param = { post_id: postId, read: 1 };
  let header;
  if (cookie) {
    header = {
      ...getRequestHeader(cookie, "GET", param, "K2", true),
      "x-rpc-client_type": "2",
    };
  } else header = { referer: Referer };
  const resp = await TGHttp<TGApp.Plugins.Mys.Post.Response>(`${Mpabu}getPostFull`, {
    method: "GET",
    headers: header,
    query: param,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.post;
}

/**
 * @description 获取合集帖子
 * @since Beta v0.6.2
 * @param {string} collectionId 合集 ID
 * @returns {Promise<TGApp.Plugins.Mys.Post.FullData[]>}
 */
export async function getPostFullInCollection(
  collectionId: string,
): Promise<TGApp.Plugins.Mys.Collection.Data[]> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Collection.ResponsePosts>(`${Mpabu}getPostFullInCollection`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
      query: { collection_id: collectionId },
    })
  ).data.posts;
}

/**
 * @description 获取帖子回复信息
 * @since Beta v0.6.4
 * @param {string} postId 帖子 ID
 * @param {number} gid 社区 ID
 * @param {boolean} isHot 是否热门
 * @param {boolean} onlyMaster 是否只看楼主
 * @param {number} orderType 排序类型
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.Plugins.Mys.Reply.ReplyData|TGApp.BBS.Response.Base>}
 */
export async function getPostReplies(
  postId: string,
  gid: number,
  isHot: boolean = true,
  lastId?: string,
  onlyMaster: boolean = false,
  orderType?: 1 | 2,
  size: number = 20,
): Promise<TGApp.Plugins.Mys.Reply.ReplyData | TGApp.BBS.Response.Base> {
  type GprParam = {
    post_id: string;
    gids: number;
    is_hot: boolean;
    size: number;
    last_id?: string;
    order_type?: 1 | 2;
    only_master?: boolean;
  };
  const params: GprParam = { post_id: postId, gids: gid, is_hot: isHot, size: size };
  if (lastId) params.last_id = lastId;
  if (orderType) params.order_type = orderType;
  if (onlyMaster) {
    params.is_hot = false;
    params.only_master = onlyMaster;
    params.order_type = 1;
  }
  const resp = await TGHttp<TGApp.Plugins.Mys.Reply.Response>(`${Mpabu}getPostReplies`, {
    method: "GET",
    headers: { referer: Referer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取帖子子回复信息
 * @since Beta v0.6.2
 * @param {number} floorId 楼层 ID
 * @param {number} gid 社区 ID
 * @param {string} postId 帖子 ID
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.Plugins.Mys.Reply.SubData|TGApp.BBS.Response.Base>}
 */
export async function getSubReplies(
  floorId: number,
  gid: number,
  postId: string,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.Plugins.Mys.Reply.SubData | TGApp.BBS.Response.Base> {
  type GsrParam = {
    floor_id: number;
    gids: number;
    post_id: string;
    size: number;
    last_id?: string;
  };
  const params: GsrParam = { floor_id: floorId, gids: gid, post_id: postId, size: size };
  if (lastId) params.last_id = lastId;
  const resp = await TGHttp<TGApp.Plugins.Mys.Reply.SubResponse>(`${Mpabu}getSubReplies`, {
    method: "GET",
    headers: { referer: Referer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取特定话题信息
 * @since Beta v0.6.3
 * @param {string} gid 游戏分区 ID
 * @param {string} topicId 话题 ID
 * @return {Promise<TGApp.Plugins.Mys.Topic.InfoData|TGApp.BBS.Response.Base>}
 */
export async function getTopicFullInfo(
  gid: string,
  topicId: string,
): Promise<TGApp.Plugins.Mys.Topic.InfoData | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.Plugins.Mys.Topic.InfoResponse>(`${Mtabu}getTopicFullInfo`, {
    method: "GET",
    headers: { referer: Referer },
    query: { gids: gid, id: topicId },
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取特定话题帖子列表
 * @since Beta v0.6.3
 * @param {number} gid 游戏分区 ID
 * @param {string} topicId 话题 ID
 * @param {string} orderType 排序方式
 * @param {string} lastId 最后一条帖子 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.Plugins.Mys.Topic.PostData|TGApp.BBS.Response.Base>}
 */
export async function getTopicPostList(
  gid: number,
  topicId: string,
  orderType: number = 0,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.Plugins.Mys.Topic.PostData | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.Plugins.Mys.Topic.PostResponse>(`${Mpabu}getTopicPostList`, {
    method: "GET",
    headers: { referer: Referer },
    query: {
      gids: gid,
      game_id: gid,
      topic_id: topicId,
      list_type: orderType,
      last_id: lastId ?? "",
      page_size: size,
    },
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 搜索帖子
 * @since Beta v0.6.2
 * @param {string} gid 游戏分区 ID
 * @param {string} keyword 关键词
 * @param {string} lastId 最后一条帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Search.PostsResponseData>} 返回帖子列表
 */
export async function searchPosts(
  gid: string = "2",
  keyword: string,
  lastId: string,
): Promise<TGApp.Plugins.Mys.Search.PostsResponseData> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Search.PostsResponse>(`${Mpabu}searchPosts`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { gids: gid, keyword, last_id: lastId, size: 20 },
    })
  ).data;
}
