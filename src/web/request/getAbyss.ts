/**
 * @file web request getAbyss.ts
 * @description 获取深渊信息
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import { getServerByUid } from "../utils/tools";
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取深渊信息
 * @since Alpha v0.2.0
 * @param {Record<string, string>} cookie cookie
 * @param {string} schedule_type 0: 本期, 1: 上期
 * @param {TGApp.User.Game.Account} account 游戏账号
 * @returns {Promise<TGApp.Game.Abyss.FullData|TGApp.App.Base.Response>}
 */
export async function getAbyss (cookie: Record<string, string>, schedule_type: string, account: TGApp.User.Account.Game): Promise<TGApp.Game.Abyss.FullData | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getAbyss;
  const role_id = account.game_uid;
  const params = { role_id, schedule_type, server: getServerByUid(role_id) };
  const header = getRequestHeader(cookie, "GET", params, "common");
  return await http.fetch<TGApp.Game.Abyss.Response>(url, {
    method: "GET",
    headers: header,
    query: params,
  }).then(res => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data;
  });
}
