/**
 * @file plugins/Hutao/request/getOverview.ts
 * @description 获取深渊概览数据
 * @since Beta v0.6.2
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取深渊概览数据
 * @since Beta v0.6.2
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.OverviewData>}
 */
async function getOverview(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = HutaoApi.Abyss.overview;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.OverviewResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

export default getOverview;
