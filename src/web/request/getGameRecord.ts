/**
 * @file core/utils/getGameRecord.ts
 * @description 获取游戏数据的函数
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 获取用户游戏数据
 * @since Beta v0.5.0
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
  const resp = await TGHttp<TGApp.Game.Record.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
