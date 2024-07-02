/**
 * @file web/request/getTokens.ts
 * @description 获取游戏 Token
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 根据 login_ticket 获取游戏 Token，包括 sToken 和 lToken
 * @since Beta v0.5.0
 * @param {string} ticket 登录票证
 * @param {string} uid 登录用户 uid
 * @returns {Promise<TGApp.BBS.Response.getTokensRes[] | TGApp.BBS.Response.Base>}
 */
export async function getTokensByLoginTicket(
  ticket: string,
  uid: string,
): Promise<TGApp.BBS.Response.getTokensRes[] | TGApp.BBS.Response.Base> {
  const cookie = { login_ticket: ticket, login_uid: uid };
  const url = TGApi.GameTokens.getTokens;
  const params = { login_ticket: ticket, token_types: "3", uid };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  const resp = await TGHttp<TGApp.BBS.Response.getTokens | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  console.log(resp);
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}
