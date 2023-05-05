/**
 * @file core request getTokens.ts
 * @description 获取游戏 Token
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 login_ticket 获取游戏 Token，包括 stoken 和 ltoken
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户 Cookie
 * @returns {Promise<BTMuli.User.Base.TokenItem[] | BTMuli.Genshin.Base.Response>}
 */
export async function getTokensByLoginTicket (cookie: BTMuli.User.Base.Cookie): Promise<BTMuli.User.Base.TokenItem[] | BTMuli.Genshin.Base.Response> {
  const url = `${TGApi.GameTokens.getTokens}?login_ticket=${cookie.login_ticket}&token_types=3&uid=${cookie.login_uid}`;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const query = `login_ticket=${cookie.login_ticket}&token_types=3&uid=${cookie.login_uid}`;
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  return await http.fetch<BTMuli.User.Response.Token>(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.list;
  });
}

/**
 * @description 根据 stoken 获取 ltoken
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function getLtokenByStoken (cookie: BTMuli.User.Base.Cookie, stoken: string): Promise<unknown> {
  const url = `${TGApi.GameTokens.getLToken}`;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const query = `stoken=${stoken}`;
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  return await http.fetch<BTMuli.User.Response.Token>(url, {
    method: "POST",
    headers: header,
  }).then((res) => {
    console.log(res.data);
    if (res.data.retcode !== 0) return res.data;
  });
}

/**
 * @description 根据 stoken 获取 cookieToken
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function getCookieTokenByStoken (cookie: BTMuli.User.Base.Cookie, stoken: string): Promise<unknown> {
  const url = `${TGApi.GameTokens.getCookieToken}?stoken=${stoken}`;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const query = `stoken=${stoken}`;
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}

/**
 * @description 验证 stoken 有效性
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function vetifyStoken (cookie: BTMuli.User.Base.Cookie, stoken: string): Promise<unknown> {
  const url = `${TGApi.GameTokens.vetifyStoken}`;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const query = `stoken=${stoken}`;
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  return await http.fetch(url, {
    method: "POST",
    headers: header,
    body: http.Body.json({
      stoken,
    }),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
