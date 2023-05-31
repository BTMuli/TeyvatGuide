/**
 * @file plugins Hutao request getTeamCollect.ts
 * @description 获取队伍搭配数据
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取队伍搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.AbyssTeamCombination[]>}
 */
async function getTeamCollect (): Promise<TGApp.Plugins.Hutao.AbyssTeamCombination[]> {
  const url = HutaoApi.Abyss.team;
  return await http.fetch<TGApp.Plugins.Hutao.AbyssTeamCombinationResponse>(url, {
    method: "GET",
  }).then((res) => {
    return res.data.data;
  });
}

export default getTeamCollect;
