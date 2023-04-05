/**
 * @file plugins Mys request position.ts
 * @description Mys 插件热点追踪请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { http } from "@tauri-apps/api";
import { type PositionResponse, type PositionData } from "../interface/position";
import { dfs } from "../utils/position";

// 热点追踪 API
const POSITION_API = "https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/home/position?app_sn=ys_obc";

/**
 * @description 获取热点追踪信息
 * @since Alpha v0.1.1
 * @return {Promise<PositionData[]>}
 */
export async function getPositionData (): Promise<PositionData[]> {
  const res = await http
    .fetch<PositionResponse>(POSITION_API, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res.data.data.list;
    });
  return dfs(res);
}
