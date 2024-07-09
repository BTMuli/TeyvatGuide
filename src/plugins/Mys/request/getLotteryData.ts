/**
 * @file plugins/Mys/request/getLotteryData.ts
 * @description Mys 插件抽奖接口
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取抽奖信息
 * @since Beta v0.5.0
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.Plugins.Mys.Lottery.FullData>}
 */
async function getLotteryData(
  lotteryId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.FullData> {
  const url = "https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show";
  const params = { id: lotteryId };
  const resp = await TGHttp<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.Response>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.show_lottery;
}

export default getLotteryData;
