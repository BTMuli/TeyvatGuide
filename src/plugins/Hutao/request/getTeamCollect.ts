/**
 * @file plugins Hutao request getTeamCollect.ts
 * @description 获取队伍搭配数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 获取队伍搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>}
 */
async function getTeamCollect(): Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]> {
  const url = HutaoApi.Abyss.team;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.TeamCombinationResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getTeamCollect;
