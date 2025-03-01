/**
 * @file web/request/topicReq.ts
 * @description 话题相关的请求
 * @since Beta v0.7.1
 */
import TGHttp from "@/utils/TGHttp.js";

// BBSApiTopicBaseUrl => batBu
const batBu: Readonly<string> = "https://bbs-api.miyoushe.com/topic/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * @description 获取特定话题信息
 * @since Beta v0.7.1
 * @param {string} gid 游戏分区 ID
 * @param {string} topicId 话题 ID
 * @return {Promise<TGApp.BBS.Topic.InfoRes|TGApp.BBS.Response.Base>}
 */
async function getTopicFullInfo(
  gid: string,
  topicId: string,
): Promise<TGApp.BBS.Topic.InfoRes | TGApp.BBS.Response.Base> {
  const resp = await TGHttp<TGApp.BBS.Topic.InfoResp>(`${batBu}getTopicFullInfo`, {
    method: "GET",
    headers: { referer: Referer },
    query: { gids: gid, id: topicId },
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
  const resp = await TGHttp<TGApp.BBS.Topic.PostResp>(`${batBu}getTopicPostList`, {
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

const topicReq = { info: getTopicFullInfo, posts: getTopicPostList };

export default topicReq;
