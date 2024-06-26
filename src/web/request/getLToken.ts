/**
 * @file web/request/getLToken.ts
 * @description 获取 ltoken 的请求
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 根据 stoken_v2 获取 ltoken
 * @since Beta v0.3.0
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
  return await http
    .fetch(url, { method: "GET", headers: header, query: params })
    .then((res: Response<TGApp.BBS.Response.getLTokenBySToken | TGApp.BBS.Response.Base>) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.ltoken;
    });
}
