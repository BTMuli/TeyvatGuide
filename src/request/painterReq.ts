/**
 * painter 下的请求
 * @since Beta v0.12.6
 */
import bbsEnum from "@enum/bbs.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

// BBSApiPainterBaseUrl => bapBu
const bapBu: Readonly<string> = "https://bbs-api.miyoushe.com/painter/wapi/";

/**
 * 获取 APK 首页的发现推荐流
 * @since Beta v0.12.6
 * @param gid - 社区 ID
 * @param lastId - 推荐流游标，刷新时留空
 * @param isFirstInitialize - 是否首次加载当前社区的推荐流
 * @param cookie - 用户 Cookie，匿名或无痕浏览时不传
 * @returns 推荐帖子与下一页游标
 * @remarks 参数来自 APK 2.116.0 的 wl.b.l，推荐流不支持版块排序或 page_size。
 */
async function getDiscoverPostList(
  gid: number,
  lastId: string = "",
  isFirstInitialize: boolean = false,
  cookie?: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Forum.DiscoverResp> {
  const params = {
    gids: String(gid),
    last_id: lastId,
    fresh_action: lastId ? 2 : 1,
    is_first_initialize: isFirstInitialize,
    filter: "",
    algorithm_type: 0,
    is_triggered_by_resource: false,
  };
  const auth: Record<string, string> = cookie
    ? { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid }
    : {};
  const headers = {
    ...getRequestHeader(auth, "GET", params, "K2", true),
    "x-rpc-client_type": "2",
  };
  const resp = await TGHttps.get<TGApp.BBS.Forum.DiscoverResp>(
    "https://bbs-api.miyoushe.com/painter/api/feeds/posts",
    { query: params, headers },
  );
  return resp.data;
}

/**
 * 获取 News 列表
 * @since Beta v0.10.0
 * @param gid - GID
 * @param newsType - 资讯类型
 * @param pageSize - 返回数量
 * @param lastId - 上一次请求的最后一条数据的 id
 * @returns News 列表响应数据
 */
async function getNewsList(
  gid: string = "2",
  newsType: TGApp.BBS.Post.NewsTypeEnum = bbsEnum.post.newsType.NEWS,
  pageSize: number = 20,
  lastId: number = 0,
): Promise<TGApp.BBS.Post.NewsResp> {
  const resp = await TGHttps.get<TGApp.BBS.Post.NewsResp>(`${bapBu}getNewsList`, {
    headers: { "Content-Type": "application/json" },
    query: { gids: gid, page_size: pageSize, type: newsType, last_id: lastId },
  });
  return resp.data;
}

/**
 * 获取最近版块热门帖子列表
 * @since Beta v0.10.0
 * @param forumId - 版块 ID
 * @param gid - 社区 ID
 * @param pageSize - 每页数量
 * @param lastId - 最后 ID
 * @param cookie - 请求 CK
 * @returns 帖子列表数据
 */
async function getHotForumPostList(
  forumId: number,
  gid: number,
  lastId?: string,
  pageSize: number = 20,
  cookie?: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Forum.PostForumResp> {
  const params: TGApp.BBS.Forum.PostForumParams = {
    forum_id: forumId,
    gids: gid,
    page_size: pageSize,
    is_good: false,
  };
  if (lastId) params.last_id = lastId;
  let header: Record<string, string> = { cookie: "" };
  if (cookie) header = getRequestHeader(cookie, "GET", params);
  const resp = await TGHttps.get<TGApp.BBS.Forum.PostForumResp>(`${bapBu}getHotForumPostList`, {
    query: params,
    headers: header,
  });
  return resp.data;
}

/**
 * 获取最近版块帖子列表
 * @since Beta v0.10.0
 * @param forumId - 版块 ID
 * @param gid - 社区 ID
 * @param type - 排序方式: 1-最新回复，2-最新发布
 * @param lastId - 最后 ID
 * @param pageSize - 每页数量
 * @param cookie - 用户 Cookie
 * @returns 帖子列表数据
 */
async function getRecentForumPostList(
  forumId: number,
  gid: number,
  type: TGApp.BBS.Post.ForumSortTypeEnum = bbsEnum.post.forumSortType.LATEST_REPLY,
  lastId?: string,
  pageSize: number = 20,
  cookie?: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Forum.PostForumResp> {
  const params: TGApp.BBS.Forum.PostForumParams = {
    forum_id: forumId,
    gids: gid,
    sort_type: type,
    is_good: false,
    page_size: pageSize,
  };
  if (lastId) params.last_id = lastId;
  let header: Record<string, string> = { cookie: "" };
  if (cookie) header = getRequestHeader(cookie, "GET", params);
  const resp = await TGHttps.get<TGApp.BBS.Forum.PostForumResp>(`${bapBu}getRecentForumPostList`, {
    query: params,
    headers: header,
  });
  return resp.data;
}

/**
 * 获取关注动态帖子
 * @since Beta v0.10.0
 * @param cookie - 用户 Cookie
 * @param offset - 偏移量
 * @returns 帖子
 */
async function getTimelineList(
  cookie: TGApp.App.Account.Cookie,
  offset?: number,
): Promise<TGApp.BBS.Post.FollowPostResp> {
  let param: Record<string, number> = { gids: 0, size: 20 };
  if (offset) param = { ...param, offset };
  const ck = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const header = getRequestHeader(ck, "GET", param, "X4", true);
  const resp = await TGHttps.get<TGApp.BBS.Post.FollowPostResp>(`${bapBu}timeline/list`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 获取抽奖信息
 * @since Beta v0.10.0
 * @param lotteryId - 抽奖 ID
 * @returns 抽奖详情
 */
async function lotteryUserShow(lotteryId: string): Promise<TGApp.BBS.Lottery.Resp> {
  const resp = await TGHttps.get<TGApp.BBS.Lottery.Resp>(`${bapBu}lottery/user/show`, {
    headers: { "Content-Type": "application/json" },
    query: { id: lotteryId },
  });
  return resp.data;
}

const painterReq = {
  discover: getDiscoverPostList,
  forum: {
    hot: getHotForumPostList,
    recent: getRecentForumPostList,
  },
  follow: getTimelineList,
  lottery: lotteryUserShow,
  news: getNewsList,
};

export default painterReq;
