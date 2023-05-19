/**
 * @file web request verifyLToken.ts
 * @description 验证 stoken 的请求函数
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
 * @description 验证 stoken 有效性，返回 mid
 * @since Alpha v0.2.0
 * @param {string} ltoken ltoken
 * @param {string} ltuid 登录用户 uid
 * @param {string} stoken stoken
 * @returns {Promise<string | BTMuli.Genshin.Base.Response>}
 */
export async function verifyLToken (ltoken: string, ltuid: string, stoken: string): Promise<string | BTMuli.Genshin.Base.Response> {
  const url = TGApi.GameTokens.verifyLToken;
  const cookie = {
    ltoken,
    ltuid,
  };
  const data = { stoken };
  const header = TGUtils.User.getHeader(transCookie(cookie), "POST", qs.stringify(data), "common");
  console.log("header:", header);
  return await http.fetch<BTMuli.User.Response.Verify>(url, {
    method: "POST",
    headers: header,
    body: http.Body.json(data),
  }).then((res) => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.user_info.mid;
  });
}
