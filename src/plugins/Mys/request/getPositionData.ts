/**
 * @file plugins/Mys/request/getPositionData.ts
 * @description Mys 插件热点追踪请求
 * @since Beta v0.4.5
 */

import { http } from "@tauri-apps/api";

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

/**
 * @description 获取热点追踪信息
 * @since Beta v0.4.5
 * @return {Promise<TGApp.Plugins.Mys.Position.Data[]>}
 */
export async function getPositionData(): Promise<TGApp.Plugins.Mys.Position.Data[]> {
  const url =
    "https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/home/position?app_sn=ys_obc";
  const res = await http
    .fetch<TGApp.Plugins.Mys.Position.Response>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      return res.data.data.list;
    });
  return DfsObc(res);
}
