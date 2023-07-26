/**
 * @file web request getDailyNotes.ts
 * @description 获取实时便笺
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取实时便笺
 * @since Alpha v0.2.2
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.DailyNotes.FullInfo|TGApp.App.Base.Response>}
 */
export async function getDailyNotes(
  cookie: Record<string, string>,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.DailyNotes.FullInfo | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getDailyNotes;
  const role_id = account.gameUid;
  const params = { role_id, server: account.region };
  const header = getRequestHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.Game.DailyNotes.Response>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}
