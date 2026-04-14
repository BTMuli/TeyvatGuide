/**
 * 帖子相关的请求
 * @since Beta v0.10.1
 */
import bbsEnum from "@enum/bbs.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const bapBu: Readonly<string> = "https://bbs-api.miyoushe.com/post/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * 获取单个帖子信息
 * @since Beta v0.10.1
 * @param postId - 帖子 ID
 * @param cookie - Cookie
 * @returns 帖子信息响应数据
 */
async function getPostFull(
  postId: number | string,
  cookie?: Record<string, string>,
): Promise<TGApp.BBS.Post.FullResp> {
  const param = { post_id: postId, read: 1 };
  const header = {
    ...getRequestHeader(cookie ?? {}, "GET", param, "K2", true),
    "x-rpc-client_type": "2",
  };
  const resp = await TGHttps.get<TGApp.BBS.Post.FullResp>(`${bapBu}getPostFull`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 获取合集帖子
 * @since Beta v0.10.1
 * @param collectionId - 合集 ID
 * @returns 合集帖子响应数据
 */
async function getPostFullInCollection(
  collectionId: string,
): Promise<TGApp.BBS.Collection.PostsResp> {
  const resp = await TGHttps.get<TGApp.BBS.Collection.PostsResp>(
    `${bapBu}getPostFullInCollection`,
    {
      headers: { "Content-Type": "application/json", referer: Referer, cookie: "" },
      query: { collection_id: collectionId },
    },
  );
  return resp.data;
}

/**
 * 获取帖子回复信息
 * @since Beta v0.10.1
 * @param postId - 帖子 ID
 * @param gid - 社区 ID
 * @param isHot - 是否热门
 * @param onlyMaster - 是否只看楼主
 * @param orderType - 排序类型
 * @param lastId - 最后 ID
 * @param size - 每页大小
 * @returns 回复信息响应数据
 */
async function getPostReplies(
  postId: string,
  gid: number,
  isHot: boolean = true,
  lastId?: string,
  onlyMaster: boolean = false,
  orderType?: TGApp.BBS.Reply.ReplyOrderTypeEnum,
  size: number = 20,
): Promise<TGApp.BBS.Reply.MainResp> {
  const params: TGApp.BBS.Reply.MainReplyParam = {
    post_id: postId,
    gids: gid,
    is_hot: isHot,
    size: size,
  };
  if (lastId) params.last_id = lastId;
  if (orderType) params.order_type = orderType;
  if (onlyMaster) {
    params.is_hot = false;
    params.only_master = onlyMaster;
    params.order_type = 1;
  }
  const resp = await TGHttps.get<TGApp.BBS.Reply.MainResp>(`${bapBu}getPostReplies`, {
    headers: { referer: Referer },
    query: params,
  });
  return resp.data;
}

/**
 * 获取帖子子回复信息
 * @since Beta v0.10.1
 * @param floorId - 楼层 ID
 * @param gid - 社区 ID
 * @param postId - 帖子 ID
 * @param lastId - 最后 ID
 * @param size - 每页大小
 * @returns 子回复响应数据
 */
async function getSubReplies(
  floorId: number,
  gid: number,
  postId: string,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.BBS.Reply.SubResp> {
  const params: TGApp.BBS.Reply.SubReplyParam = {
    floor_id: floorId,
    gids: gid,
    post_id: postId,
    size: size,
  };
  if (lastId) params.last_id = lastId;
  const resp = await TGHttps.get<TGApp.BBS.Reply.SubResp>(`${bapBu}getSubReplies`, {
    headers: { referer: Referer },
    query: params,
  });
  return resp.data;
}

/**
 * 获取特定话题帖子列表
 * @since Beta v0.10.1
 * @param gid - 游戏分区 ID
 * @param topicId - 话题 ID
 * @param orderType - 排序方式
 * @param lastId - 最后一条帖子 ID
 * @param size - 每页大小
 * @returns 话题帖子列表响应数据
 */
async function getTopicPostList(
  gid: number,
  topicId: string,
  orderType: TGApp.BBS.Post.PostTopicSortTypeEnum = bbsEnum.post.topicSortType.LATEST,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.BBS.Topic.PostResp> {
  const resp = await TGHttps.get<TGApp.BBS.Topic.PostResp>(`${bapBu}getTopicPostList`, {
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
  return resp.data;
}

/**
 * 获取用户发布帖子
 * @since Beta v0.10.1
 * @param uid - 用户 ID
 * @param gid - 社区 ID
 * @param offset - 偏移量
 * @returns 用户帖子响应数据
 */
async function getUserPost(
  uid: string,
  gid: number,
  offset?: string,
): Promise<TGApp.BBS.Post.UserPostResp> {
  const params: Record<string, string | number> = offset
    ? { uid, gids: gid, offset, size: 20 }
    : { uid, gids: gid, size: 20 };
  const resp = await TGHttps.get<TGApp.BBS.Post.UserPostResp>(`${bapBu}userPost`, {
    headers: { referer: Referer },
    query: params,
  });
  return resp.data;
}

/**
 * 搜索帖子
 * @since Beta v0.10.1
 * @param gid - 游戏分区 ID
 * @param keyword - 关键词
 * @param lastId - 最后一条帖子 ID
 * @param orderType - 排序方式 1-最热，2-最新
 * @returns 搜索帖子响应数据
 */
async function searchPosts(
  gid: string = "2",
  keyword: string,
  lastId: string,
  orderType: TGApp.BBS.Post.SearchSortTypeEnum,
): Promise<TGApp.BBS.Post.SearchResp> {
  const resp = await TGHttps.get<TGApp.BBS.Post.SearchResp>(`${bapBu}searchPosts`, {
    headers: { "Content-Type": "application/json" },
    query: { gids: gid, keyword, last_id: lastId, size: 20, order_type: orderType },
  });
  return resp.data;
}

/**
 * 获取用户收藏帖子
 * @since Beta v0.10.1
 * @param cookie - 用户 cookie
 * @param uid - 用户 UID
 * @param offset - 偏移量
 * @returns 用户收藏帖子响应数据
 */
async function userFavouritePost(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
  offset: string = "",
): Promise<TGApp.BBS.Collection.UserPostResp> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { size: "20", uid, offset };
  const resp = await TGHttps.get<TGApp.BBS.Collection.UserPostResp>(`${bapBu}userFavouritePost`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

const postReq = {
  collection: getPostFullInCollection,
  post: getPostFull,
  topic: getTopicPostList,
  reply: { main: getPostReplies, sub: getSubReplies },
  search: searchPosts,
  user: { post: getUserPost, favorite: userFavouritePost },
};

export default postReq;
