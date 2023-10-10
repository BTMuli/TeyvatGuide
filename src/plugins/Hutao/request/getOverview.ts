/**
 * @file plugins Hutao request getOverview.ts
 * @description 获取深渊概览数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取深渊概览数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.OverviewData>}
 */
async function getOverview(): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = HutaoApi.Abyss.overview;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.OverviewResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getOverview;
