/**
 * @file plugins Hutao request getTeamCollect.ts
 * @description 获取队伍搭配数据
 * @since Alpha v0.2.0
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import HutaoApi from "../api/index.js";

/**
 * @description 获取队伍搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>}
 */
async function getTeamCollect(): Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]> {
  const url = HutaoApi.Abyss.team;
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Hutao.Abyss.TeamCombinationResponse>) => {
      return res.data.data;
    });
}

export default getTeamCollect;
