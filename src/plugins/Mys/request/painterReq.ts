/**
 * @file plugins/Mys/request/painterReq.ts
 * @description painter下的请求
 * @since Beta v0.6.2
 */
import TGHttp from "../../../utils/TGHttp.js";

// MysPainterApiBaseUrl => Mpabu
const Mpabu = "https://bbs-api.miyoushe.com/painter/wapi/";

/**
 * @description 获取 News 列表
 * @since Beta v0.6.2
 * @param {string} gid GID
 * @param {string} newsType 咨讯类型: 1 为公告，2 为活动，3 为咨讯
 * @param {number} pageSize 返回数量
 * @param {number} lastId 上一次请求的最后一条数据的 id
 * @return {Promise<TGApp.Plugins.Mys.News.FullData>}
 */
export async function getNewsList(
  gid: string = "2",
  newsType: string = "1",
  pageSize: number = 20,
  lastId: number = 0,
): Promise<TGApp.Plugins.Mys.News.FullData> {
  return (
    await TGHttp<TGApp.Plugins.Mys.News.Response>(`${Mpabu}getNewsList`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { gids: gid, page_size: pageSize, type: newsType, last_id: lastId },
    })
  ).data;
}

/**
 * @description 获取抽奖信息
 * @since Beta v0.6.2
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.Plugins.Mys.Lottery.FullData>}
 */
export async function lotteryUserShow(
  lotteryId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.FullData> {
  const resp = await TGHttp<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.Response>(
    `${Mpabu}lottery/user/show`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      query: { id: lotteryId },
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.show_lottery;
}
