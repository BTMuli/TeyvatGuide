/**
 * @file web/request/postReq.ts
 * @description 帖子相关的请求
 * @since Beta v0.7.4
 */
import TGHttp from "@/utils/TGHttp.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

// BBSApiPostBaseUrl => bapBu
const bapBu: Readonly<string> = "https://bbs-api.miyoushe.com/post/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取单个帖子信息
 * @since Beta v0.7.1
 * @param {number|string} postId 帖子 ID
 * @param {Record<string, string>} cookie Cookie
 * @return {Promise<TGApp.BBS.Post.FullData | TGApp.BBS.Response.Base>}
 */
async function getPostFull(
  postId: number | string,
  cookie?: Record<string, string>,
): Promise<TGApp.BBS.Post.FullData | TGApp.BBS.Response.Base> {
  const param = { post_id: postId, read: 1 };
  let header;
  if (cookie) {
    header = {
      ...getRequestHeader(cookie, "GET", param, "K2", true),
      "x-rpc-client_type": "2",
    };
  } else header = { referer: Referer };
  const resp = await TGHttp<TGApp.BBS.Post.FullResp>(`${bapBu}getPostFull`, {
    method: "GET",
    headers: header,
    query: param,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.post;
}

/**
 * @description 获取合集帖子
 * @since Beta v0.7.1
 * @param {string} collectionId 合集 ID
 * @returns {Promise<Array<TGApp.BBS.Post.FullData>>}
 */
async function getPostFullInCollection(
  collectionId: string,
): Promise<Array<TGApp.BBS.Post.FullData>> {
  return (
    await TGHttp<TGApp.BBS.Collection.PostsResp>(`${bapBu}getPostFullInCollection`, {
      method: "GET",
      headers: { "Content-Type": "application/json", referer: Referer },
      query: { collection_id: collectionId },
    })
  ).data.posts;
}

/**
 * @description 获取帖子回复信息
 * @since Beta v0.7.1
 * @param {string} postId 帖子 ID
 * @param {number} gid 社区 ID
 * @param {boolean} isHot 是否热门
 * @param {boolean} onlyMaster 是否只看楼主
 * @param {number} orderType 排序类型
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.BBS.Reply.MainRes|TGApp.BBS.Response.Base>}
 */
async function getPostReplies(
  postId: string,
  gid: number,
  isHot: boolean = true,
  lastId?: string,
  onlyMaster: boolean = false,
  orderType?: 1 | 2,
  size: number = 20,
): Promise<TGApp.BBS.Reply.MainRes | TGApp.BBS.Response.Base> {
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
  const resp = await TGHttp<TGApp.BBS.Reply.MainResp>(`${bapBu}getPostReplies`, {
    method: "GET",
    headers: { referer: Referer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取帖子子回复信息
 * @since Beta v0.7.1
 * @param {number} floorId 楼层 ID
 * @param {number} gid 社区 ID
 * @param {string} postId 帖子 ID
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.BBS.Reply.SubRes|TGApp.BBS.Response.Base>}
 */
async function getSubReplies(
  floorId: number,
  gid: number,
  postId: string,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.BBS.Reply.SubRes | TGApp.BBS.Response.Base> {
  type GsrParam = {
    floor_id: number;
    gids: number;
    post_id: string;
    size: number;
    last_id?: string;
  };
  const params: GsrParam = { floor_id: floorId, gids: gid, post_id: postId, size: size };
  if (lastId) params.last_id = lastId;
  const resp = await TGHttp<TGApp.BBS.Reply.SubResp>(`${bapBu}getSubReplies`, {
    method: "GET",
    headers: { referer: Referer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取特定话题帖子列表
 * @since Beta v0.7.1
 * @param {number} gid 游戏分区 ID
 * @param {string} topicId 话题 ID
 * @param {string} orderType 排序方式
 * @param {string} lastId 最后一条帖子 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.BBS.Topic.PostRes|TGApp.BBS.Response.Base>}
 */
async function getTopicPostList(
  gid: number,
  topicId: string,
  orderType: number = 0,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.BBS.Topic.PostRes | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.BBS.Topic.PostResp>(`${bapBu}getTopicPostList`, {
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
 * @description 获取用户发布帖子
 * @since Beta v0.7.2
 * @param {string} uid 用户 ID
 * @param {number} gid 社区 ID
 * @param {string} offset 偏移量
 * @returns {Promise<TGApp.BBS.Post.UserPostRes|TGApp.BBS.Response.Base>}
 */
async function getUserPost(
  uid: string,
  gid: number,
  offset?: string,
): Promise<TGApp.BBS.Post.UserPostRes | TGApp.BBS.Response.Base> {
  const params = offset ? { uid, gids: gid, offset, size: 20 } : { uid, gids: gid, size: 20 };
  const resp = await TGHttp<TGApp.BBS.Post.UserPostResp>(`${bapBu}userPost`, {
    method: "GET",
    headers: { referer: Referer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 搜索帖子
 * @since Beta v0.7.1
 * @param {string} gid 游戏分区 ID
 * @param {string} keyword 关键词
 * @param {string} lastId 最后一条帖子 ID
 * @return {Promise<TGApp.BBS.Post.SearchRes>} 返回帖子列表
 */
async function searchPosts(
  gid: string = "2",
  keyword: string,
  lastId: string,
): Promise<TGApp.BBS.Post.SearchRes> {
  return (
    await TGHttp<TGApp.BBS.Post.SearchResp>(`${bapBu}searchPosts`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { gids: gid, keyword, last_id: lastId, size: 20 },
    })
  ).data;
}

/**
 * @description 获取用户收藏帖子
 * @since Beta v0.7.4
 * @param {TGApp.App.Account.Cookie} cookie - 用户 cookie
 * @param {string} uid - 用户 uid
 * @param {string} offset - 偏移量
 * @returns {Promise<TGApp.BBS.Collection.UserPostRes|TGApp.BBS.Response.Base>} 用户收藏帖子
 */
async function userFavouritePost(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
  offset: string = "",
): Promise<TGApp.BBS.Collection.UserPostRes | TGApp.BBS.Response.Base> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { size: "20", uid, offset };
  const resp = await TGHttp<TGApp.BBS.Collection.UserPostResp | TGApp.BBS.Response.Base>(
    `${bapBu}userFavouritePost`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const postReq = {
  collection: getPostFullInCollection,
  post: getPostFull,
  topic: getTopicPostList,
  reply: { main: getPostReplies, sub: getSubReplies },
  search: searchPosts,
  user: { post: getUserPost, collect: userFavouritePost },
};

export default postReq;
