/**
 * @file web/request/genAuthkey.ts
 * @description 生成 authkey
 * @since Beta v0.6.2
 */

import TGHttp from "../../utils/TGHttp.js";
import TGConstant from "../constant/TGConstant.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

/**
 * @description 生成 authkey
 * @since Beta v0.6.2
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} account 账户
 * @returns {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
export async function genAuthkey(
  cookie: TGApp.App.Account.Cookie,
  account: TGApp.Sqlite.Account.Game,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const data = {
    auth_appid: "webview_gacha",
    game_biz: TGConstant.GAME_BIZ,
    game_uid: account.gameUid,
    region: account.region,
  };
  const header = getRequestHeader(ck, "POST", JSON.stringify(data), "lk2", true);
  const resp = await TGHttp<TGApp.Game.Gacha.AuthkeyResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.authkey;
}

/**
 * @description 生成 authkey
 * @since Beta v0.5.0
 * @param {Record<string, string>} cookie cookie // stoken_v2 & mid
 * @param {object} payload payload
 * @returns {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
export async function genAuthkey2(
  cookie: Record<string, string>,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
  const header = getRequestHeader(cookie, "POST", JSON.stringify(payload), "lk2", true);
  return await TGHttp<TGApp.BBS.Response.Base>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(payload),
  });
}
