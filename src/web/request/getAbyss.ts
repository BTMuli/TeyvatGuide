/**
 * @file web/request/getAbyss.ts
 * @description 获取深渊信息
 * @since Beta v0.6.1
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

/**
 * @description 获取深渊信息
 * @since Beta v0.6.1
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @param {string} schedule 1: 本期, 2: 上期
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.Abyss.FullData|TGApp.BBS.Response.Base>}
 */
export async function getAbyss(
  cookie: TGApp.App.Account.Cookie,
  schedule: string,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Abyss.FullData | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getAbyss;
  const params = { role_id: account.gameUid, schedule_type: schedule, server: account.region };
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.Game.Abyss.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
