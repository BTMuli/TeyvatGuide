/**
 * @file plugins/Hutao/request/getTeamCollect.ts
 * @description 获取队伍搭配数据
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 获取队伍搭配数据
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>}
 */
async function getTeamCollect(): Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]> {
  const url = HutaoApi.Abyss.team;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.TeamCombinationResponse>(url, {
    method: "GET",
  });
  return resp.data;
}

export default getTeamCollect;
