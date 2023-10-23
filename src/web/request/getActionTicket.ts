/**
 * @file web/request/getActionTicket.ts
 * @description 获取米游社动态的 ActionTicket
 * @since Beta v0.3.4
 */

import { http } from "@tauri-apps/api";

import TGUtils from "../utils/TGUtils";

/**
 * @description 通过 stoken 获取 ActionTicket
 * @since Beta v0.3.4
 * @todo 类型完善
 * @param {string} ActionType 动作类型
 * @param {string} SToken stoken
 * @param {string} MID 用户 MID
 * @param {string} UID 用户 UID
 * @returns {Promise<TGApp.BBS.Response.Base>}
 */
export async function getActionTicketBySToken(
  ActionType: string,
  SToken: string,
  MID: string,
  UID: string,
): Promise<TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/auth/api/getActionTicketBySToken";
  const params = {
    action_type: ActionType,
    stoken: SToken,
    uid: UID,
  };
  const cookie = {
    mid: MID,
    stoken: SToken,
  };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "k2");
  return await http
    .fetch<TGApp.BBS.Response.Base>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      return res.data;
    });
}
