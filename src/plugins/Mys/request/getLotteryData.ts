/**
 * @file plugins Mys interface getLotteryData.ts
 * @description Mys 插件抽奖接口
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

import { http } from "@tauri-apps/api";
import MysApi from "../api";

/**
 * @description 获取抽奖信息
 * @since Alpha v0.2.1
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<TGApp.Plugins.Mys.Lottery.FullData>}
 */
async function getLotteryData(lotteryId: string): Promise<TGApp.Plugins.Mys.Lottery.FullData> {
  return await http
    .fetch<TGApp.Plugins.Mys.Lottery.Response>(MysApi.Lottery.replace("{lotteryId}", lotteryId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      return res.data.data.show_lottery;
    });
}

export default getLotteryData;
