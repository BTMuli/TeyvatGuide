/**
 * 米游社版块榜单请求。
 * @since Beta v0.13.2
 */

import { isForumImageRankForumsResp, isForumImageRankPostsResp } from "@req/respValidator.js";
import TGHttps from "@utils/network/TGHttps.js";

const headers = { referer: "https://www.miyoushe.com/" };

/**
 * 获取分区开放榜单的版块与类型。
 * @since Beta v0.13.2
 * @param gid - 分区 ID
 * @param signal - 取消信号
 * @returns 图区榜单目录响应
 */
async function getImageRankForums(
  gid: number,
  signal: AbortSignal,
): Promise<TGApp.BBS.Forum.ImageRankForumsResp> {
  const resp = await TGHttps.get(
    "https://bbs-api.miyoushe.com/forum/wapi/getImagePostInfoList",
    { query: { gids: gid }, headers, signal },
    isForumImageRankForumsResp,
  );
  return resp.data;
}

/**
 * 获取图区榜单帖子与下一页游标。
 * @since Beta v0.13.2
 * @param forumId - 版块 ID
 * @param type - 榜单类型
 * @param offset - 分页游标，首屏为 0
 * @param signal - 取消信号
 * @returns 榜单帖子列表响应
 */
async function getImageRankPosts(
  forumId: number,
  type: number,
  offset: string,
  signal: AbortSignal,
): Promise<TGApp.BBS.Forum.ImageRankPostsResp> {
  const resp = await TGHttps.get(
    "https://bbs-api.miyoushe.com/post/wapi/getImagePostList",
    {
      query: { forum_id: forumId, cate_id: 0, type, last_id: offset, page_size: 20 },
      headers,
      signal,
    },
    isForumImageRankPostsResp,
  );
  return resp.data;
}

const forumRankReq = {
  imageForums: getImageRankForums,
  imagePosts: getImageRankPosts,
};

export default forumRankReq;
