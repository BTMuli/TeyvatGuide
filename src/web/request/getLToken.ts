/**
 * @file web request getLToken.ts
 * @description 获取 ltoken 的请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 stoken 获取 ltoken
 * @since Alpha v0.1.5
 * @param {string} mid 登录用户 mid
 * @param {string} stoken stoken_v2
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
export async function getLTokenBySToken(
  mid: string,
  stoken: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = TGApi.GameTokens.getLToken;
  const cookie = {
    mid,
    stoken,
  };
  console.log(cookie);
  const params = { stoken };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Response.getLTokenBySToken>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.ltoken;
    });
}
