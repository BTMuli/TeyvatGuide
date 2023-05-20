/**
 * @file web request getTokens.ts
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
 * @param {string} ticket 登录票证
 * @param {string} uid 登录用户 uid
 * @returns {Promise<BTMuli.User.Base.TokenItem[] | BTMuli.Genshin.Base.Response>}
 */
export async function getTokensByLoginTicket (ticket: string, uid: string): Promise<BTMuli.User.Response.TokenItem[] | BTMuli.Genshin.Base.Response> {
  const cookie = {
    login_ticket: ticket,
    login_uid: uid,
  };
  const url = TGApi.GameTokens.getTokens;
  // eslint-disable-next-line camelcase
  const params = { login_ticket: ticket, token_types: 3, uid };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http.fetch<BTMuli.User.Response.Tokens>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    console.log(res);
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.list;
  });
}
