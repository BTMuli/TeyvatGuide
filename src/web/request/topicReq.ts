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

const topicReq = { info: getTopicFullInfo };

export default topicReq;
