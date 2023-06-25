/**
 * @file plugins Mys interface lottery.ts
 * @description Mys 插件抽奖接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { http } from "@tauri-apps/api";
import { type LotteryResponse, type LotteryData } from "../interface/lottery";

// 抽奖 API
const LOTTERY_API =
  "https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show?gids=2&id={lottery_id}";

/**
 * @description 获取抽奖信息
 * @since Alpha v0.1.2
 * @param {string} lotteryId 抽奖 ID
 * @return {Promise<LotteryData>}
 */
export async function getLotteryData(lotteryId: string): Promise<LotteryData> {
  return await http
    .fetch<LotteryResponse>(LOTTERY_API.replace("{lottery_id}", lotteryId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      return res.data.data.show_lottery;
    });
}
