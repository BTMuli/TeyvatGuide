/**
 * @file plugins/Mys/request/getGachaData.ts
 * @description Mys 抽卡请求
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

/**
 * @description 获取卡池信息
 * @since Beta  v0.4.5
 * @return {Promise<TGApp.Plugins.Mys.Gacha.Data[]>}
 */
async function getGachaData(): Promise<TGApp.Plugins.Mys.Gacha.Data[]> {
  const url = "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc";
  return await http
    .fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } })
    .then((res: Response<TGApp.Plugins.Mys.Gacha.Response>) => res.data.data.list);
}

export default getGachaData;
