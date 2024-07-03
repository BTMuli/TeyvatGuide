/**
 * @file plugins/Hutao/request/getOverview.ts
 * @description 获取深渊概览数据
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取深渊概览数据
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.OverviewData>}
 */
async function getOverview(): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = HutaoApi.Abyss.overview;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.OverviewResponse>(url, { method: "GET" });
  return resp.data;
}

export default getOverview;
