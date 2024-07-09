/**
 * @file web/request/getLToken.ts
 * @description 获取 ltoken 的请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 根据 stoken_v2 获取 ltoken
 * @since Beta v0.5.0
 * @param {string} Mid 登录用户 mid
 * @param {string} Stoken stoken_v2
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
export async function getLTokenBySToken(
  Mid: string,
  Stoken: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = TGApi.GameTokens.getLToken;
  const cookie = { mid: Mid, stoken: Stoken };
  const params = { stoken: Stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  const resp = await TGHttp<TGApp.BBS.Response.getLTokenBySToken | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ltoken;
}
