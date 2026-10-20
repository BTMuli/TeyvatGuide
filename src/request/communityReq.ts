/**
 * 米游社个人中心请求
 * @since Beta v0.12.6
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const communityApiBaseUrl: Readonly<string> = "https://bbs-api.miyoushe.com/";
/**
 * 米游社原神社区 ID
 * @since Beta v0.12.6
 */
const communityGameId: Readonly<number> = 2;
const communityPageSize: Readonly<number> = 20;

/**
 * 个人中心读取请求查询参数
 * @since Beta v0.12.6
 */
type CommunityQuery = Record<string, string | number>;

/**
 * 提取个人中心读取请求所需的最小 Cookie
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @returns 用于请求头签名的最小 Cookie
 */
function getCommunityCookie(cookie: TGApp.App.Account.Cookie): Record<string, string> {
  return { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
}

/**
 * 判断 UID 是否指向当前登录用户
 * @since Beta v0.12.6
 * @param cookie - 当前账户 Cookie
 * @param uid - 待请求的用户 ID
 * @returns 是否为当前登录用户
 */
function isCurrentUser(cookie: TGApp.App.Account.Cookie, uid: string): boolean {
  const normalizedUid = uid.trim();
  if (!normalizedUid) return false;
  return [cookie.account_id, cookie.ltuid, cookie.stuid].some(
    (currentUid) => currentUid.trim() === normalizedUid,
  );
}

/**
 * 创建符合官网个人中心契约的用户筛选参数
 * @since Beta v0.12.6
 * @param cookie - 当前账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @returns 用户筛选参数
 */
function getUserQuery(cookie: TGApp.App.Account.Cookie, uid?: string): CommunityQuery {
  const normalizedUid = uid?.trim();
  if (!normalizedUid || isCurrentUser(cookie, normalizedUid)) return {};
  return { uid: normalizedUid };
}

/**
 * 获取自己的帖子
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param offset - 下一页偏移量
 * @returns 自己的帖子响应数据
 */
async function getPosts(
  cookie: TGApp.App.Account.Cookie,
  offset?: string,
): Promise<TGApp.BBS.Post.UserPostResp> {
  const params: CommunityQuery = { size: communityPageSize };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Post.UserPostResp>(
    `${communityApiBaseUrl}painter/wapi/userPostList`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取我的评论
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页偏移量
 * @returns 我的评论响应数据
 */
async function getComments(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.CommentsResp> {
  const params: CommunityQuery = { size: communityPageSize, ...getUserQuery(cookie, uid) };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.CommentsResp>(
    `${communityApiBaseUrl}post/wapi/userReply`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取我的合集
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页偏移量
 * @returns 我的合集响应数据
 */
async function getCollections(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.CollectionsResp> {
  const params: CommunityQuery = {
    gids: communityGameId,
    size: communityPageSize,
    ...getUserQuery(cookie, uid),
  };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.CollectionsResp>(
    `${communityApiBaseUrl}collection/wapi/collection/userList`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取收藏的帖子
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页偏移量
 * @returns 收藏帖子响应数据
 */
async function getFavorites(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.FavoritesResp> {
  const params: CommunityQuery = { size: communityPageSize, ...getUserQuery(cookie, uid) };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.FavoritesResp>(
    `${communityApiBaseUrl}post/wapi/userFavouritePost`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取收藏的合集
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页偏移量
 * @returns 收藏合集响应数据
 */
async function getFavoriteCollections(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.FavoriteCollectionsResp> {
  const params: CommunityQuery = {
    gids: communityGameId,
    size: communityPageSize,
    ...getUserQuery(cookie, uid),
  };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.FavoriteCollectionsResp>(
    `${communityApiBaseUrl}collection/wapi/collection/followingList`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取我的关注
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页最后 ID
 * @returns 我的关注响应数据
 */
async function getFollowing(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.FollowingResp> {
  const params: CommunityQuery = {
    gids: communityGameId,
    page_size: communityPageSize,
    ...getUserQuery(cookie, uid),
  };
  if (offset) params.last_id = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.FollowingResp>(
    `${communityApiBaseUrl}user/wapi/following`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取我的粉丝
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param uid - 用户 ID；当前用户按官网约定省略
 * @param offset - 下一页最后 ID
 * @returns 我的粉丝响应数据
 */
async function getFollowers(
  cookie: TGApp.App.Account.Cookie,
  uid?: string,
  offset?: string,
): Promise<TGApp.BBS.Community.FollowersResp> {
  const params: CommunityQuery = {
    gids: communityGameId,
    page_size: communityPageSize,
    ...getUserQuery(cookie, uid),
  };
  if (offset) params.last_id = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.FollowersResp>(
    `${communityApiBaseUrl}user/wapi/followers`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

const communityReq = {
  posts: getPosts,
  comments: getComments,
  collections: getCollections,
  favorites: getFavorites,
  favoriteCollections: getFavoriteCollections,
  following: getFollowing,
  followers: getFollowers,
};

export default communityReq;
