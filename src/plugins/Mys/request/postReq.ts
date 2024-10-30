/**
 * @file plugins/Mys/request/postReq.ts
 * @description 帖子相关的获取
 * @since Beta v0.6.2
 */

import TGHttp from "../../../utils/TGHttp.js";

// MysPostApiBaseUrl => Mpabu
const Mpabu = "https://bbs-api.mihoyo.com/post/wapi/";
const Referer = "https://bbs.mihoyo.com/";

/**
 * @description 获取特定论坛列表
 * @since Beta v0.6.2
 * @param {number} forumId 特定论坛 ID
 * @param {number} type 排序方式: 0-按热度排序，1-最新回复，2-按时间排序
 * @param {number} page_size 每页数量
 * @return {Promise<TGApp.Plugins.Mys.Forum.FullData>}
 */
export async function getForumPostList(
  forumId: number,
  type: number = 0,
  page_size: number = 20,
): Promise<TGApp.Plugins.Mys.Forum.FullData> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Forum.Response>(`${Mpabu}getForumPostList`, {
      method: "GET",
      query: { forum_id: forumId, sort_type: type, page_size: page_size },
    })
  ).data;
}

/**
 * @description 获取单个帖子信息
 * @since Beta v0.6.2
 * @param {number} postId 帖子 ID
 * @return {Promise<TGApp.Plugins.Mys.Post.FullData>}
 */
export async function getPostFull(postId: number): Promise<TGApp.Plugins.Mys.Post.FullData> {
  return (
    await TGHttp<TGApp.Plugins.Mys.Post.Response>(`${Mpabu}getPostFull`, {
      method: "GET",
      headers: { referer: Referer },
      query: { post_id: postId },
    })
  ).data.post;
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
 * @since Beta v0.6.2
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
