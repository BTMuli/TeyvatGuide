/**
 * @file web/request/getStoken.ts
 * @description 获取 stoken
 * @since Beta v0.4.3
 */

import { http } from "@tauri-apps/api";

import TGConstant from "../constant/TGConstant";
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取 stoken
 * @since Beta v0.3.0
 * @param {string} accountId 账户 ID
 * @param {string} gameToken 游戏 Token
 * @returns {Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base>}
 */
export async function getStokenByGameToken(
  accountId: string,
  gameToken: string,
): Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/account/ma-cn-session/app/getSTokenByGameToken";
  const data = { account_id: Number(accountId), game_token: gameToken };
  const header = {
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
  };
  return await http
    .fetch<TGApp.BBS.Response.getStokenByGameToken | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(data),
    })
    .then((res) => {
      console.log(res.data);
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}

/**
 * @description stoken v1 到 v2
 * @since Beta v0.4.3
 * @param {string} stoken 账户 ID
 * @param {string} stuid 游戏 Token
 * @returns {Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base>}
 */
export async function getTokenBySToken(
  stoken: string,
  stuid: string,
): Promise<TGApp.BBS.Response.getTokenBySTokenData | TGApp.BBS.Response.Base> {
  const url = "https://passport-api.mihoyo.com/account/ma-cn-session/app/getTokenBySToken";
  const cookie = {
    stoken,
    stuid,
  };
  const header = {
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
    ...getRequestHeader(cookie, "POST", "", "prod"),
  };
  return await http
    .fetch<TGApp.BBS.Response.getTokenBySToken | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      headers: header,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}
