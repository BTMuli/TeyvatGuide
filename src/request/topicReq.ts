/**
 * 话题相关的请求
 * @since Beta v0.12.6
 */
import TGHttps from "@utils/TGHttps.js";

const batBu: Readonly<string> = "https://bbs-api.miyoushe.com/topic/wapi/";
const outerBu: Readonly<string> = "https://bbs-api.miyoushe.com/topic/outerApi/";
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

/**
 * 获取帖子话题推荐
 * @since Beta v0.12.6
 * @param gid - 游戏分区 ID
 * @param forumId - 版块 ID，0 表示不指定版块
 * @param viewType - 帖子类型
 * @param title - 帖子标题
 * @param content - 帖子正文纯文本
 * @param ignoreTopicIds - 已在帖子中选中的话题 ID，不参与推荐
 * @returns 推荐话题响应数据
 */
async function getRecommendedTopics(
  gid: number,
  forumId: number,
  viewType: 1 | 2,
  title: string,
  content: string,
  ignoreTopicIds: Array<string> = [],
): Promise<TGApp.BBS.Topic.RecommendResp> {
  const resp = await TGHttps.post<TGApp.BBS.Topic.RecommendResp>(
    `${outerBu}getRecommendedTopicsForText`,
    {
      headers: { referer: Referer, cookie: "" },
      body: {
        game_id: gid,
        forum_id: forumId,
        view_type: viewType,
        title,
        content,
        limit: 10,
        scene: "post",
        ...(ignoreTopicIds.length > 0 ? { ignore_topic_ids: ignoreTopicIds } : {}),
      },
    },
  );
  return resp.data;
}

/**
 * 搜索米游社话题
 * @since Beta v0.12.6
 * @param keyword - 搜索关键词
 * @param size - 返回数量，默认 10
 * @returns 搜索话题响应数据
 */
async function searchTopics(
  keyword: string,
  size: number = 10,
): Promise<TGApp.BBS.Topic.SearchResp> {
  const resp = await TGHttps.get<TGApp.BBS.Topic.SearchResp>(`${batBu}searchTopic`, {
    headers: { referer: Referer, cookie: "" },
    query: { keyword, size },
  });
  return resp.data;
}

const topicReq = { info: getTopicFullInfo, recommend: getRecommendedTopics, search: searchTopics };

export default topicReq;
