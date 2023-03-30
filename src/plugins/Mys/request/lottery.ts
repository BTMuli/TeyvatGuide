/**
 * @file plugins Mys interface lottery.ts
 * @description Mys 插件抽奖接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { http } from "@tauri-apps/api";
import { LotteryResponse, LotteryData } from "../interface/lottery";

// 抽奖 API
const LOTTERY_API =
	"https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show?gids=2&id={lottery_id}";

/**
 * @description 获取抽奖信息
 * @since Alpha v0.1.1
 * @param {string} lottery_id 抽奖 ID
 * @return {Promise<LotteryData>}
 */
export async function getLotteryData(lottery_id: string): Promise<LotteryData> {
	return await http
		.fetch<LotteryResponse>(LOTTERY_API.replace("{lottery_id}", lottery_id), {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
		.then(res => {
			return res.data.data.show_lottery;
		});
}
