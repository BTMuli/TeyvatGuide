/**
 * @file web/request/getStoken.ts
 * @description 获取 stoken
 * @since Beta v0.4.4
 */

import { http } from "@tauri-apps/api";

import TGConstant from "../constant/TGConstant";
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取 stoken
 * @since Beta v0.4.4
 * @param {string} accountId 账户 ID
 * @param {string} token 游戏 Token
 * @param {string} isGameToken 是否为游戏 Token
 * @returns {Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base>}
 */
export async function getStokenByGameToken(
  accountId: string,
  token: string,
  isGameToken: boolean,
): Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base> {
  let url = "https://api-takumi.mihoyo.com/account/ma-cn-session/app/getSTokenByGameToken";
  if (isGameToken) {
    url = "https://api-takumi.mihoyo.com/account/ma-cn-session/app/getTokenByGameToken";
  }
  const data = { account_id: Number(accountId), game_token: token };
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
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
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
      if (res.data.retcode !== 0) return <TGApp.BBS.Response.Base>res.data;
      return res.data.data;
    });
}
