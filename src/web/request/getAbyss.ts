/**
 * @file web/request/getAbyss.ts
 * @description 获取深渊信息
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 获取深渊信息
 * @since Beta v0.5.0
 * @param {Record<string, string>} cookie cookie
 * @param {string} schedule_type 1: 本期, 2: 上期
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.Abyss.FullData|TGApp.BBS.Response.Base>}
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
  const resp = await TGHttp<TGApp.Game.Abyss.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
