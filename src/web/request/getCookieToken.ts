/**
 * @file web request getCookieToken.ts
 * @description 获取 Cookie Token 的请求函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 stoken 获取 cookie_token
 * @since Alpha v0.1.5
 * @param {string} stuid 登录用户 uid
 * @param {string} stoken stoken
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
export async function getCookieTokenBySToken(
  stuid: string,
  stoken: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = TGApi.GameTokens.getCookieToken;
  const cookie = {
    stuid,
    stoken,
  };
  const params = { stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Response.getCookieTokenBySToken>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.cookie_token;
    });
}

/**
 * @description 根据 gameToken 获取 cookie_token
 * @since Beta v0.3.0
 * @param {string} accountId 账号 id
 * @param {string} gameToken gameToken
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
export async function getCookieTokenByGameToken(
  accountId: string,
  gameToken: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/auth/api/getCookieAccountInfoByGameToken";
  const data = { account_id: accountId, game_token: gameToken };
  return await http
    .fetch<TGApp.BBS.Response.getCookieTokenByGameToken>(url, {
      method: "GET",
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.cookie_token;
    });
}
