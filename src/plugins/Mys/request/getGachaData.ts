/**
 * @file plugins Mys request getGachaData.ts
 * @description Mys 抽卡请求
 * @since Alpha v0.2.1
 */

import { http } from "@tauri-apps/api";

import MysApi from "../api";

/**
 * @description 获取卡池信息
 * @since Alpha v0.2.1
 * @return {Promise<TGApp.Plugins.Mys.Gacha.Data[]>}
 */
async function getGachaData(): Promise<TGApp.Plugins.Mys.Gacha.Data[]> {
  return await http
    .fetch<TGApp.Plugins.Mys.Gacha.Response>(MysApi.Gacha, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      return res.data.data.list;
    });
}

export default getGachaData;
