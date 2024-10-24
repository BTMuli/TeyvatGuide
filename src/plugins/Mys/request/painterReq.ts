/**
 * @file plugins/Mys/request/painterReq.ts
 * @description painter下的请求
 * @since Beta v0.6.2
 */
import TGHttp from "../../../utils/TGHttp.js";

// MysPainterApiBaseUrl => Mpabu
const Mpabu = "https://bbs-api.miyoushe.com/painter/wapi/";

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
