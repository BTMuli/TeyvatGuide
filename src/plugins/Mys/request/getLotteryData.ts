/**
 * @file plugins/Mys/request/getLotteryData.ts
 * @description Mys 插件抽奖接口
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取抽奖信息
 * @since Beta v0.4.5
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.BBS.Response.Base|TGApp.Plugins.Mys.Lottery.FullData>}
 */
async function getLotteryData(
  lotteryId: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.Lottery.FullData> {
  return await http
    .fetch<TGApp.Plugins.Mys.Lottery.Response>(MysApi.Lottery.replace("{lotteryId}", lotteryId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data.show_lottery;
    });
}

export default getLotteryData;
