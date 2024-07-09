/**
 * @file web/request/verifyLToken.ts
 * @description 验证 stoken 的请求函数
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 验证 ltoken 有效性，返回 mid
 * @since Beta v0.5.0
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
  const resp = await TGHttp<TGApp.BBS.Response.verifyUserInfoBySToken | TGApp.BBS.Response.Base>(
    url,
    {
      method: "POST",
      headers: header,
      body: JSON.stringify(data),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info.mid;
}
