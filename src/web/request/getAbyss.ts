/**
 * @file web request getAbyss.ts
 * @description 获取深渊信息
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 获取深渊信息
 * @since Beta v0.3.0
 * @param {Record<string, string>} cookie cookie
 * @param {string} schedule_type 1: 本期, 2: 上期
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.Abyss.FullData|TGApp.App.Base.Response>}
 */
export async function getAbyss(
  cookie: Record<string, string>,
  schedule_type: string,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Abyss.FullData | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getAbyss;
  const role_id = account.gameUid;
  const params = { role_id, schedule_type, server: account.region };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.Game.Abyss.Response>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}
