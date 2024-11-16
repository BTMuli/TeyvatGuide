/**
 * @file web/request/getRoleCombat.ts
 * @description 真境剧诗
 * @since Beta v0.6.3
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

/**
 * @description 获取剧诗信息
 * @since Beta v.0.6.3
 * @param {TGApp.App.Account.Cookie} cookie
 * @param {TGApp.Sqlite.Account.Game} account
 * @returns {Promise<TGApp.Game.Combat.Combat[]|TGApp.BBS.Response.Base|false>}
 */
export async function getRoleCombat(
  cookie: TGApp.App.Account.Cookie,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Combat.Combat[] | TGApp.BBS.Response.Base | false> {
  const url = TGApi.GameData.getRoleCombat;
  const params = { role_id: account.gameUid, server: account.region, active: 1, need_detail: true };
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.Game.Combat.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode != 0) return <TGApp.BBS.Response.Base>resp;
  if (!resp.data.is_unlock) return false;
  return resp.data.data;
}
