/**
 * @file core/utils/getGameRecord.ts
 * @description 获取游戏数据的函数
 * @since Beta v0.3.8
 */

import { http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 获取用户游戏数据
 * @since Beta v0.3.8
 * @description 这边的 ck 可以是 cookie_token 和 account_id
 * @description 也可以是 ltoken 和 ltuid
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户的基本信息
 * @returns {Promise<TGApp.Game.Record.FullData|TGApp.BBS.Response.Base>} 用户基本信息
 */
export async function getGameRecord(
  cookie: Record<string, string>,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getUserBase;
  const params = { role_id: user.gameUid, server: user.region };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.Game.Record.Response | TGApp.BBS.Response.Base>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) {
        return res.data;
      }
      return res.data.data;
    });
}
