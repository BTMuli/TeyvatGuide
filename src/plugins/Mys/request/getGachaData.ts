/**
 * @file plugins/Mys/request/getGachaData.ts
 * @description Mys 抽卡请求
 * @since Beta v0.4.5
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取卡池信息
 * @since Beta  v0.5.0
 * @return {Promise<TGApp.Plugins.Mys.Gacha.Data[]>}
 */
async function getGachaData(): Promise<TGApp.Plugins.Mys.Gacha.Data[]> {
  const url = "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc";
  const resp = await TGHttp<TGApp.Plugins.Mys.Gacha.Response>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return resp.data.list;
}

export default getGachaData;
