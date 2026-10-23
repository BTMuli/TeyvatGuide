/**
 * 米游社个人中心请求
 * @since Beta v0.13.0
 */

import {
  getCollectionRequestHeader,
  getCommunityCookie,
  getRequestHeader,
} from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

const communityApiBaseUrl: Readonly<string> = "https://bbs-api.miyoushe.com/";
/**
 * 米游社原神社区 ID
 * @since Beta v0.13.0
 */
const communityGameId: Readonly<number> = 2;
const communityPageSize: Readonly<number> = 20;

/**
 * 个人中心读取请求查询参数
 * @since Beta v0.13.0
 */
type CommunityQuery = Record<string, string | number>;

/**
 * 判断 UID 是否指向当前登录用户
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
      headers: getCollectionRequestHeader(getCommunityCookie(cookie), "GET", params),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 发出合集管理写请求
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param action - 合集管理接口路径
 * @param body - 请求体
 * @returns 接口响应数据
 */
async function postCollectionManage<T>(
  cookie: TGApp.App.Account.Cookie,
  action: "create" | "edit" | "del" | "list/sort",
  body: Record<string, unknown>,
): Promise<T> {
  const resp = await TGHttps.post<T>(`${communityApiBaseUrl}collection/wapi/collection/${action}`, {
    headers: {
      ...getCollectionRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body)),
      "Content-Type": "application/json",
    },
    body,
  });
  return resp.data;
}

/**
 * 创建合集
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param params - 合集创建参数
 * @returns 创建合集响应数据
 */
async function createCollection(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.BBS.Collection.CreateParams,
): Promise<TGApp.BBS.Collection.CreateResp> {
  return await postCollectionManage<TGApp.BBS.Collection.CreateResp>(cookie, "create", {
    ...params,
  });
}

/**
 * 编辑合集信息
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param params - 合集编辑参数
 * @returns 编辑合集响应数据
 */
async function editCollection(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.BBS.Collection.EditParams,
): Promise<TGApp.BBS.Collection.ManageResp> {
  return await postCollectionManage<TGApp.BBS.Collection.ManageResp>(cookie, "edit", {
    ...params,
  });
}

/**
 * 删除合集
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param id - 合集 ID
 * @returns 删除合集响应数据
 */
async function deleteCollection(
  cookie: TGApp.App.Account.Cookie,
  id: number,
): Promise<TGApp.BBS.Collection.ManageResp> {
  const body: TGApp.BBS.Collection.DeleteParams = { id };
  return await postCollectionManage<TGApp.BBS.Collection.ManageResp>(cookie, "del", body);
}

/**
 * 调整合集排序
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param ids - 按新顺序排列的合集 ID 列表
 * @returns 调整排序响应数据
 */
async function sortCollections(
  cookie: TGApp.App.Account.Cookie,
  ids: Array<number>,
): Promise<TGApp.BBS.Collection.ManageResp> {
  const body: TGApp.BBS.Collection.SortParams = { ids };
  return await postCollectionManage<TGApp.BBS.Collection.ManageResp>(cookie, "list/sort", body);
}

/**
 * 获取收藏的帖子
 * @since Beta v0.13.0
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
 * 取消收藏帖子
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param postId - 帖子 ID
 * @returns 取消收藏响应数据
 */
async function unfavoritePost(
  cookie: TGApp.App.Account.Cookie,
  postId: string,
): Promise<TGApp.BBS.Response.Base> {
  const authCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const body = { post_id: postId, is_cancel: 1 };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(
    `${communityApiBaseUrl}post/wapi/collectPost`,
    {
      headers: {
        ...getRequestHeader(authCookie, "POST", JSON.stringify(body), "K2", true),
        "x-rpc-client_type": "2",
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

/**
 * 获取收藏的合集
 * @since Beta v0.13.0
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
      headers: getCollectionRequestHeader(getCommunityCookie(cookie), "GET", params),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 收藏合集
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param collectionId - 合集 ID
 * @returns 收藏响应数据
 */
async function followCollection(
  cookie: TGApp.App.Account.Cookie,
  collectionId: number,
): Promise<TGApp.BBS.Response.Base> {
  const body = { id: collectionId };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(
    `${communityApiBaseUrl}collection/wapi/collection/follow`,
    {
      headers: {
        ...getCollectionRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body)),
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

/**
 * 取消收藏合集
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param collectionId - 合集 ID
 * @returns 取消收藏响应数据
 */
async function unfollowCollection(
  cookie: TGApp.App.Account.Cookie,
  collectionId: number,
): Promise<TGApp.BBS.Response.Base> {
  const body = { id: collectionId };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(
    `${communityApiBaseUrl}collection/wapi/collection/unfollow`,
    {
      headers: {
        ...getCollectionRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body)),
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

/**
 * 获取我的关注
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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

/**
 * 关注或取消关注指定用户
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param uid - 目标用户 ID
 * @param follow - true 表示关注，false 表示取消关注
 * @returns 关注关系变更响应数据
 */
async function setFollow(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
  follow: boolean,
): Promise<TGApp.BBS.Response.Base> {
  const normalizedUid = uid.trim();
  if (!/^[1-9]\d*$/.test(normalizedUid)) throw new TypeError("用户 ID 必须为正整数");
  if (isCurrentUser(cookie, normalizedUid)) throw new TypeError("不能关注自己");
  const body = { entity_id: normalizedUid };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(
    `${communityApiBaseUrl}timeline/wapi/${follow ? "follow" : "unfollow"}`,
    {
      headers: {
        ...getRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body), "X4", true),
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

/**
 * 获取当前账户的帖子浏览历史
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param offset - 下一页偏移量
 * @returns 浏览历史响应数据
 * @remarks 该接口只识别 SToken 登录态，使用 cookie_token 会返回空列表
 */
async function getHistory(
  cookie: TGApp.App.Account.Cookie,
  offset?: string,
): Promise<TGApp.BBS.Community.HistoryResp> {
  const params: CommunityQuery = { offset: offset ?? "" };
  const ck = { mid: cookie.mid, stoken: cookie.stoken, stuid: cookie.stuid };
  const headers = getRequestHeader(ck, "GET", params, "X4", true);
  headers["x-rpc-client_type"] = "2";
  const resp = await TGHttps.get<TGApp.BBS.Community.HistoryResp>(
    `${communityApiBaseUrl}painter/api/history/list`,
    { headers, query: params },
  );
  return resp.data;
}

/**
 * 删除当前账户的浏览历史
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param params - 删除参数
 * @returns 删除浏览历史响应数据
 * @remarks 该接口只识别 SToken 登录态
 */
async function deleteHistory(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.BBS.Community.HistoryDeleteParams,
): Promise<TGApp.BBS.Response.Base> {
  const ck = { mid: cookie.mid, stoken: cookie.stoken, stuid: cookie.stuid };
  const headers = {
    ...getRequestHeader(ck, "POST", JSON.stringify(params), "X4", true),
    "x-rpc-client_type": "2",
    "Content-Type": "application/json",
  };
  const resp = await TGHttps.post<TGApp.BBS.Response.Base>(
    `${communityApiBaseUrl}history_view/api/history/operate`,
    { headers, body: params },
  );
  return resp.data;
}

/**
 * 搜索指定用户发布的帖子
 * @since Beta v0.13.0
 * @param uid - 用户 ID
 * @param keyword - 搜索关键词
 * @param offset - 下一页偏移量
 * @returns 用户帖子搜索响应数据
 */
async function searchUserPosts(
  uid: string,
  keyword: string,
  offset?: string,
): Promise<TGApp.BBS.Community.PostSearchResp> {
  const params: CommunityQuery = { keyword, uid, size: communityPageSize };
  if (offset) params.offset = offset;
  const resp = await TGHttps.get<TGApp.BBS.Community.PostSearchResp>(
    `${communityApiBaseUrl}painter/api/user_instant/search/list`,
    { headers: { referer: "https://www.miyoushe.com/" }, query: params },
  );
  return resp.data;
}

/**
 * 获取当前账户的消息通知
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param category - 通知分类
 * @param lastId - 下一页最后 ID
 * @returns 消息通知响应数据
 */
async function getNotifications(
  cookie: TGApp.App.Account.Cookie,
  category: TGApp.BBS.Notification.Category,
  lastId?: string,
): Promise<TGApp.BBS.Notification.ListResp> {
  const params: CommunityQuery = { category, gids: communityGameId, page_size: communityPageSize };
  if (category !== "system") params.only_focus = "false";
  if (lastId) params.last_id = lastId;
  const resp = await TGHttps.get<TGApp.BBS.Notification.ListResp>(
    `${communityApiBaseUrl}notification/wapi/getUserGameNotifications`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 获取当前账户的未读消息数
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @returns 未读消息数响应数据
 */
async function getNotificationUnread(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Notification.UnreadResp> {
  const params: CommunityQuery = { gids: communityGameId };
  const resp = await TGHttps.get<TGApp.BBS.Notification.UnreadResp>(
    `${communityApiBaseUrl}notification/wapi/getUserGameUnreadCount`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 清除当前账户指定分类的未读消息
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param category - 通知分类
 * @returns 清除未读响应数据
 */
async function clearNotificationUnread(
  cookie: TGApp.App.Account.Cookie,
  category: TGApp.BBS.Notification.Category,
): Promise<TGApp.BBS.Notification.ClearUnreadResp> {
  const body: TGApp.BBS.Notification.ClearUnreadParams = { category, only_focus: false };
  const resp = await TGHttps.post<TGApp.BBS.Notification.ClearUnreadResp>(
    `${communityApiBaseUrl}notification/wapi/clearUserGameUnread`,
    {
      headers: {
        ...getRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body), "X4", true),
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

/**
 * 获取当前账户的消息设置
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param uid - 当前用户 ID
 * @returns 消息设置响应数据
 */
async function getNotificationSettings(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
): Promise<TGApp.BBS.Notification.SettingsResp> {
  const params: CommunityQuery = { gids: communityGameId, uid };
  const resp = await TGHttps.get<TGApp.BBS.Notification.SettingsResp>(
    `${communityApiBaseUrl}user/wapi/notify/settings`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", params, "X4", true),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 更新当前账户的消息设置
 * @since Beta v0.13.0
 * @param cookie - 账户 Cookie
 * @param settings - 完整消息设置
 * @returns 更新消息设置响应数据
 */
async function updateNotificationSettings(
  cookie: TGApp.App.Account.Cookie,
  settings: TGApp.BBS.Notification.Settings,
): Promise<TGApp.BBS.Notification.SettingsUpdateResp> {
  const body: TGApp.BBS.Notification.SettingsUpdateParams = { settings };
  const resp = await TGHttps.post<TGApp.BBS.Notification.SettingsUpdateResp>(
    `${communityApiBaseUrl}user/wapi/notify/settings/update`,
    {
      headers: {
        ...getRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body), "X4", true),
        "Content-Type": "application/json",
      },
      body,
    },
  );
  return resp.data;
}

const communityReq = {
  posts: getPosts,
  searchPosts: searchUserPosts,
  comments: getComments,
  collections: getCollections,
  createCollection,
  editCollection,
  deleteCollection,
  sortCollections,
  favorites: getFavorites,
  unfavoritePost,
  favoriteCollections: getFavoriteCollections,
  followCollection,
  unfollowCollection,
  following: getFollowing,
  followers: getFollowers,
  setFollow,
  history: getHistory,
  deleteHistory,
  notifications: getNotifications,
  notificationUnread: getNotificationUnread,
  clearNotificationUnread,
  notificationSettings: getNotificationSettings,
  updateNotificationSettings,
};

export default communityReq;
