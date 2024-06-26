/**
 * @file web/request/verifyLToken.ts
 * @description 验证 stoken 的请求函数
 * @since Alpha v0.1.5
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 验证 ltoken 有效性，返回 mid
 * @since Alpha v0.1.5
 * @param {string} ltoken ltoken
 * @param {string} ltuid 登录用户 uid
 * @returns {Promise<string | TGApp.BBS.Response.Base>}
 */
export async function verifyLToken(
  ltoken: string,
  ltuid: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = TGApi.GameTokens.verifyLToken;
  const cookie = { ltoken, ltuid };
  const data = { ltoken };
  const header = TGUtils.User.getHeader(cookie, "POST", data, "common");
  return await http
    .fetch(url, { method: "POST", headers: header, body: http.Body.json(data) })
    .then((res: Response<TGApp.BBS.Response.verifyUserInfoBySToken | TGApp.BBS.Response.Base>) => {
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data.user_info.mid;
    });
}
