/**
 * @file plugins/Mys/request/obcReq.ts
 * @description 观测枢相关请求
 * @since Beta v0.6.3
 */

import TGHttp from "@/utils/TGHttp.js";

const obcApi: Readonly<string> = "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/";

/**
 * @description 获取卡池信息
 * @since Beta  v0.6.3
 * @return {Promise<TGApp.Plugins.Mys.Gacha.Data[]>}
 */
export async function getGachaData(): Promise<TGApp.Plugins.Mys.Gacha.Data[]> {
  const resp = await TGHttp<TGApp.Plugins.Mys.Gacha.Response>(`${obcApi}gacha_pool`, {
    method: "GET",
    query: { app_sn: "ys_obc" },
    headers: { "Content-Type": "application/json" },
  });
  return resp.data.list;
}

/**
 * @description 获取热点追踪信息
 * @since Beta v0.6.3
 * @return {Promise<TGApp.Plugins.Mys.Position.Data[]>}
 */
export async function getPositionData(): Promise<TGApp.Plugins.Mys.Position.Data[]> {
  const resp = await TGHttp<TGApp.Plugins.Mys.Position.Response>(`${obcApi}home/position`, {
    method: "GET",
    query: { app_sn: "ys_obc" },
    headers: { "Content-Type": "application/json" },
  });
  const data = resp.data.list;
  return DfsObc(data);
}

/**
 * @description 深度优先遍历
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.Position.ObcItem[]} list 列表
 * @returns {TGApp.Plugins.Mys.Position.Data[]} 返回列表
 */
function DfsObc(list: TGApp.Plugins.Mys.Position.ObcItem[]): TGApp.Plugins.Mys.Position.Data[] {
  const res: TGApp.Plugins.Mys.Position.Data[] = [];
  for (const item of list) {
    if (item.name === "近期活动") {
      res.push(...item.list);
    }
    if (item.children) {
      res.push(...DfsObc(<TGApp.Plugins.Mys.Position.ObcItem[]>item.children));
    }
  }
  return res;
}
