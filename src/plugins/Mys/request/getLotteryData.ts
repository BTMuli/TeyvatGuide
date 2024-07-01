/**
 * @file plugins/Mys/request/getLotteryData.ts
 * @description Mys 插件抽奖接口
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

/**
 * @description 获取抽奖信息
 * @since Beta v0.4.5
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.Plugins.Mys.Lottery.FullData>}
 */
async function getLotteryData(
  lotteryId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.FullData> {
  const url = "https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show";
  const params = { id: lotteryId };
  return await http
    .fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, query: params })
    .then((res: Response<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.Response>) => {
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data.show_lottery;
    });
}

export default getLotteryData;
