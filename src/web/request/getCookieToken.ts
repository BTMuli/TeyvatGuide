/**
 * @file web request getCookieToken.ts
 * @description 获取 Cookie Token 的请求函数
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
import { transCookie } from "../utils/tools";

/**
 * @description 根据 stoken 获取 cookie_token
 * @since Alpha v0.2.0
 * @param {string} stuid 登录用户 uid
 * @param {string} stoken stoken
 * @returns {Promise<string|BTMuli.Genshin.Base.Response>}
 */
export async function getCookieTokenBySToken (stuid: string, stoken: string): Promise<string | BTMuli.Genshin.Base.Response> {
  const url = TGApi.GameTokens.getCookieToken;
  const cookie = {
    stuid,
    stoken,
  };
  const params = { stoken };
  const header = TGUtils.User.getHeader(transCookie(cookie), "GET", qs.stringify(params), "common");
  return await http.fetch<BTMuli.User.Response.CookieToken>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.cookie_token;
  });
}
