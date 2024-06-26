/**
 * @file plugins Hutao request getOverview.ts
 * @description 获取深渊概览数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取深渊概览数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.OverviewData>}
 */
async function getOverview(): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = HutaoApi.Abyss.overview;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.OverviewResponse>) => {
      return res.data.data;
    });
}

export default getOverview;
