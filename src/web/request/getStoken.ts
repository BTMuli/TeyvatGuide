/**
 * @file web request getStoken.ts
 * @description 获取 stoken
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";

import TGConstant from "../constant/TGConstant";

/**
 * @description 获取 stoken
 * @since Beta v0.3.0
 * @param {string} accountId 账户 ID
 * @param {string} gameToken 游戏 Token
 * @returns {Promise<string | TGApp.BBS.Response.Base>}
 */
export async function getStokenByGameToken(
  accountId: string,
  gameToken: string,
): Promise<TGApp.BBS.Response.getStokenByGameTokenData | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/account/ma-cn-session/app/getTokenByGameToken";
  const data = { account_id: Number(accountId), game_token: gameToken };
  const header = {
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
  };
  return await http
    .fetch<TGApp.BBS.Response.getStokenByGameToken>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}
