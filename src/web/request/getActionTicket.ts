/**
 * @file web/request/getActionTicket.ts
 * @description 获取米游社动态的 ActionTicket
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 通过 stoken 获取 ActionTicket
 * @since Beta v0.5.0
 * @param {string} ActionType 动作类型
 * @param {string} SToken stoken
 * @param {string} MID 用户 MID
 * @param {string} UID 用户 UID
 * @returns {Promise<TGApp.BBS.Response.getActionTicketBySToken>}
 */
export async function getActionTicketBySToken(
  ActionType: string,
  SToken: string,
  MID: string,
  UID: string,
): Promise<TGApp.BBS.Response.getActionTicketBySToken> {
  const url = "https://api-takumi.mihoyo.com/auth/api/getActionTicketBySToken";
  const params = { action_type: ActionType, stoken: SToken, uid: UID };
  const cookie = { mid: MID, stoken: SToken };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "k2");
  return await TGHttp<TGApp.BBS.Response.getActionTicketBySToken>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
}
