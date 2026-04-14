/**
 * 话题相关的请求
 * @since Beta v0.10.1
 */
import TGHttps from "@utils/TGHttps.js";

const batBu: Readonly<string> = "https://bbs-api.miyoushe.com/topic/wapi/";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * 获取特定话题信息
 * @since Beta v0.10.1
 * @param gid - 游戏分区 ID
 * @param topicId - 话题 ID
 * @returns 话题信息响应数据
 */
async function getTopicFullInfo(gid: string, topicId: string): Promise<TGApp.BBS.Topic.InfoResp> {
  const resp = await TGHttps.get<TGApp.BBS.Topic.InfoResp>(`${batBu}getTopicFullInfo`, {
    headers: { referer: Referer, cookie: "" },
    query: { gids: gid, id: topicId },
  });
  return resp.data;
}

const topicReq = { info: getTopicFullInfo };

export default topicReq;
