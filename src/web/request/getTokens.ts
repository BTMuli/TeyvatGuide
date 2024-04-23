/**
 * @file web/request/getTokens.ts
 * @description 获取游戏 Token
 * @since Beta v0.4.3
 */

import { http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 login_ticket 获取游戏 Token，包括 stoken 和 ltoken
 * @since Beta v0.4.3
 * @param {string} ticket 登录票证
 * @param {string} uid 登录用户 uid
 * @returns {Promise<TGApp.BBS.Response.getTokensRes[] | TGApp.BBS.Response.Base>}
 */
export async function getTokensByLoginTicket(
  ticket: string,
  uid: string,
): Promise<TGApp.BBS.Response.getTokensRes[] | TGApp.BBS.Response.Base> {
  const cookie = {
    login_ticket: ticket,
    login_uid: uid,
  };
  const url = TGApi.GameTokens.getTokens;

  const params = { login_ticket: ticket, token_types: "3", uid };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Response.getTokens | TGApp.BBS.Response.Base>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      console.log(res);
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data.list;
    });
}
