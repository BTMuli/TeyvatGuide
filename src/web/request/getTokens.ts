/**
 * @file web request getTokens.ts
 * @description 获取游戏 Token
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// Node
import qs from "qs";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 login_ticket 获取游戏 Token，包括 stoken 和 ltoken
 * @since Alpha v0.2.0
 * @param {string} cookie cookie
 * @param {string} ticket 登录票证
 * @param {string} uid 登录用户 uid
 * @returns {Promise<BTMuli.User.Base.TokenItem[] | BTMuli.Genshin.Base.Response>}
 */
// eslint-disable-next-line camelcase
export async function getTokensByLoginTicket (cookie: string, ticket: string, uid: string): Promise<BTMuli.User.Base.TokenItem[] | BTMuli.Genshin.Base.Response> {
  // eslint-disable-next-line camelcase
  const url = `${TGApi.GameTokens.getTokens}?login_ticket=${ticket}&token_types=3&uid=${uid}`;
  // eslint-disable-next-line camelcase
  const param = { login_ticket: ticket, token_types: 3, uid };
  const header = TGUtils.User.getHeader(cookie, "GET", qs.stringify(param), "common");
  console.log("header:", header);
  return await http.fetch<BTMuli.User.Response.Token>(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    console.log(res);
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.list;
  });
}

/**
 * @description 根据 stoken 获取 ltoken
 * @since Alpha v0.2.0
 * @param {string} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function getLtokenBySToken (cookie: string, stoken: string): Promise<unknown> {
  const url = TGApi.GameTokens.getLToken;
  const params = { stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", qs.stringify(params), "common");
  console.log("header:", header);
  return await http.fetch<BTMuli.User.Response.Token>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    console.log(res);
    if (res.data.retcode !== 0) return res.data;
  });
}

/**
 * @description 根据 stoken 获取 cookieToken
 * @since Alpha v0.2.0
 * @param {string} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function getCookieTokenBySToken (cookie: string, stoken: string): Promise<unknown> {
  const url = TGApi.GameTokens.getCookieToken;
  const params = { stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", qs.stringify(params), "common");
  console.log("header:", header);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}

/**
 * @description 验证 stoken 有效性
 * @since Alpha v0.2.0
 * @param {string} cookie 用户 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>}
 */
export async function verifySToken (cookie: string, stoken: string): Promise<unknown> {
  const url = TGApi.GameTokens.verifyStoken;
  const data = { stoken };
  const header = TGUtils.User.getHeader(cookie, "POST", qs.stringify(data), "common");
  console.log("header:", header);
  return await http.fetch(url, {
    method: "POST",
    headers: header,
    body: http.Body.json(data),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
