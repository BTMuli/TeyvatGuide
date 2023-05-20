/**
 * @file web request getLToken.ts
 * @description 获取 ltoken 的请求
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
 * @description 根据 stoken 获取 ltoken
 * @since Alpha v0.2.0
 * @param {string} stuid 登录用户 uid
 * @param {string} stoken stoken
 * @returns {Promise<string|BTMuli.Genshin.Base.Response>}
 */
export async function getLTokenBySToken (stuid: string, stoken: string): Promise<string | BTMuli.Genshin.Base.Response> {
  const url = TGApi.GameTokens.getLToken;
  const cookie = {
    stuid,
    stoken,
  };
  const params = { stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http.fetch<BTMuli.User.Response.LToken>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.ltoken;
  });
}
