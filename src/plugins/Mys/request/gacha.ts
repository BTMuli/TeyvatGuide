/**
 * @file plugins Mys request gacha.ts
 * @description Mys抽卡请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { http } from "@tauri-apps/api";
import { type GachaResponse, type GachaData } from "../interface/gacha";

// 卡池 API
const GACHA_POOL_API = "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc";

/**
 * @description 获取卡池信息
 * @since Alpha
 * @return {Promise<GachaData[]>}
 */
export async function getGachaData (): Promise<GachaData[]> {
  return await http
    .fetch<GachaResponse>(GACHA_POOL_API, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res.data.data.list;
    });
}
