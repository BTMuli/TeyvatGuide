/**
 * @file request/painterReq.ts
 * @description painter 下的请求
 * @since Beta v0.7.9
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// BBSApiPainterBaseUrl => bapBu
const bapBu: Readonly<string> = "https://bbs-api.miyoushe.com/painter/wapi/";

/**
 * @description 获取 News 列表
 * @since Beta v0.7.1
 * @param {string} gid GID
 * @param {string} newsType 咨讯类型: 1 为公告，2 为活动，3 为咨讯
 * @param {number} pageSize 返回数量
 * @param {number} lastId 上一次请求的最后一条数据的 id
 * @return {Promise<TGApp.BBS.Post.NewsRes>}
 */
async function getNewsList(
  gid: string = "2",
  newsType: string = "1",
  pageSize: number = 20,
  lastId: number = 0,
): Promise<TGApp.BBS.Post.NewsRes> {
  return (
    await TGHttp<TGApp.BBS.Post.NewsResp>(`${bapBu}getNewsList`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { gids: gid, page_size: pageSize, type: newsType, last_id: lastId },
    })
  ).data;
}

/**
 * @description 获取最近版块热门帖子列表
 * @since Beta v0.7.9
 * @param {number} forumId 版块 ID
 * @param {number} gid 社区 ID
 * @param {number} pageSize 每页数量
 * @param {string} lastId 最后 ID
 * @return {Promise<TGApp.BBS.Forum.PostForumRes>}
 */
async function getHotForumPostList(
  forumId: number,
  gid: number,
  lastId?: string,
  pageSize: number = 20,
): Promise<TGApp.BBS.Forum.PostForumRes> {
  type ReqParams = {
    forum_id: number;
    gids: number;
    page_size: number;
    is_good: boolean;
    last_id?: string;
  };
  const params: ReqParams = {
    forum_id: forumId,
    gids: gid,
    page_size: pageSize,
    is_good: false,
  };
  if (lastId) params.last_id = lastId;
  return (
    await TGHttp<TGApp.BBS.Forum.PostForumResp>(`${bapBu}getHotForumPostList`, {
      method: "GET",
      query: params,
      headers: { cookie: "" },
    })
  ).data;
}

/**
 * @description 获取最近版块帖子列表
 * @since Beta v0.7.9
 * @param {number} forumId 版块 ID
 * @param {number} gid 社区 ID
 * @param {number} type 排序方式: 1-最新回复，2-最新发布
 * @param {string} lastId 最后 ID
 * @param {number} pageSize 每页数量
 * @return {Promise<TGApp.BBS.Forum.PostForumRes>}
 */
async function getRecentForumPostList(
  forumId: number,
  gid: number,
  type: number = 1,
  lastId?: string,
  pageSize: number = 20,
): Promise<TGApp.BBS.Forum.PostForumRes> {
  type ReqParams = {
    forum_id: number;
    gids: number;
    sort_type: number;
    is_good: boolean;
    page_size: number;
    last_id?: string;
  };
  const params: ReqParams = {
    forum_id: forumId,
    gids: gid,
    sort_type: type,
    is_good: false,
    page_size: pageSize,
  };
  if (lastId) params.last_id = lastId;
  return (
    await TGHttp<TGApp.BBS.Forum.PostForumResp>(`${bapBu}getRecentForumPostList`, {
      method: "GET",
      query: params,
      headers: { cookie: "" },
    })
  ).data;
}

/**
 * @description 获取关注动态帖子
 * @since Beta v0.7.2
 * @param {TGApp.App.Account.Cookie} cookie 用户 Cookie
 * @param {number} offset
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.BBS.Post.FollowPostRes>}
 */
async function getTimelineList(
  cookie: TGApp.App.Account.Cookie,
  offset?: number,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.Post.FollowPostRes> {
  let param: Record<string, number> = { gids: 0, size: 20 };
  if (offset) param = { ...param, offset };
  const ck = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const header = getRequestHeader(ck, "GET", param, "X4", true);
  const resp = await TGHttp<TGApp.BBS.Response.Base | TGApp.BBS.Post.FollowPostResp>(
    `${bapBu}timeline/list`,
    {
      method: "GET",
      headers: header,
      query: param,
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取抽奖信息
 * @since Beta v0.7.1
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.BBS.Lottery.FullData>}
 */
async function lotteryUserShow(
  lotteryId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.Lottery.FullData> {
  const resp = await TGHttp<TGApp.BBS.Response.Base | TGApp.BBS.Lottery.Resp>(
    `${bapBu}lottery/user/show`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { id: lotteryId },
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.show_lottery;
}

const painterReq = {
  forum: {
    hot: getHotForumPostList,
    recent: getRecentForumPostList,
  },
  follow: getTimelineList,
  lottery: lotteryUserShow,
  news: getNewsList,
};

export default painterReq;
