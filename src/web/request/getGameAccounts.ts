/**
 * @file web request getGameAccounts.ts
 * @description 获取游戏账号信息相关请求函数
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
import TGConstant from "../constant/TGConstant";

/**
 * @description 通过 stoken 获取游戏账号
 * @since Alpha v0.2.0
 * @param {string} stoken stoken
 * @param {string} stuid 登录用户 uid
 * @returns {Promise<BTMuli.User.Game.Account[]|BTMuli.Genshin.Base.Response>}
 */
export async function getGameAccountsBySToken (stoken: string, stuid: string): Promise<BTMuli.User.Game.Account[] | BTMuli.Genshin.Base.Response> {
  const url = TGApi.GameData.bySToken.getAccounts;
  const cookie = {
    stuid,
    stoken,
  };
  const params = { stoke: stoken, game_biz: TGConstant.Utils.GAME_BIZ };
  const header = TGUtils.User.getHeader(transCookie(cookie), "GET", qs.stringify(params), "common");
  return await getGameAccounts(url, cookie, params);
}

/**
 * @description 通过 cookie 获取游戏账号
 * @since Alpha v0.2.0
 * @param {string} cookie_token cookie_token
 * @param {string} account_id 游戏账号 id
 * @returns {Promise<BTMuli.User.Game.Account[]|BTMuli.Genshin.Base.Response>}
 */
export async function getGameAccountsByCookie (cookie_token: string, account_id: string): Promise<BTMuli.User.Game.Account[] | BTMuli.Genshin.Base.Response> {
  const url = TGApi.GameData.byCookie.getAccounts;
  const cookie = {
    account_id,
    cookie_token,
  };
  const params = { game_biz: TGConstant.Utils.GAME_BIZ };
  return await getGameAccounts(url, cookie, params);
}

/**
 * @description 获取游戏账号信息
 * @since Alpha v0.2.0
 * @param {string} url 请求地址
 * @param {Record<string, string>} cookie cookie
 * @param {Record<string, string>} params 请求参数
 * @returns {Promise<BTMuli.User.Game.Account[]|BTMuli.Genshin.Base.Response>}
 */
async function getGameAccounts (url: string, cookie: Record<string, string>, params: Record<string, string>): Promise<BTMuli.User.Game.Account[] | BTMuli.Genshin.Base.Response> {
  const header = TGUtils.User.getHeader(transCookie(cookie), "GET", qs.stringify(params), "common");
  return await http.fetch<BTMuli.User.Response.GameAccounts>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then(res => {
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.list;
  });
}
