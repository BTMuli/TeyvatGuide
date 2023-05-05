/**
 * @file core utils getGameData.ts
 * @description 获取游戏数据的函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// utils
import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";
import TGConstant from "../constant/TGConstant";

/**
 * @description 获取用户游戏数据
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户的 Cookie
 * @returns {Promise<unknown>} 用户基本信息
 */
export async function getGameCardByCookie (cookie: BTMuli.User.Base.Cookie): Promise<unknown> {
  const url = `${TGApi.GameData.getUserCard}?uid=${cookie.login_uid}`;
  const query = `uid=${cookie.login_uid}`;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  console.log("uid:", cookie.login_uid);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json({
      uid: cookie.login_uid,
    }),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}

/**
 * @description 获取用户绑定角色-通过stoken
 * @since Alpha v0.2.0
 * @todo 缺乏参考数据
 * @param {string} cookie 用户的 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>} 用户绑定角色
 */
export async function getAccountsbySToken (cookie: string, stoken: string): Promise<unknown> {
  const url = TGApi.GameData.bySToken.getAccounts;
  console.log("url:", url);
  // eslint-disable-next-line camelcase
  const data = { stoken, game_biz: TGConstant.UTILS.GAME_BIZ };
  const header = TGUtils.User.getHeader(cookie, "", JSON.stringify(data));
  console.log("header:", header);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(data),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}

/**
 * @description 获取用户绑定游戏账号-通过cookie
 * @since Alpha v0.2.0
 * @param {string} cookie 用户的 Cookie
 * @returns {Promise<BTMuli.Genshin.Base.Response| BTMuli.User.Game.Account[]>} 用户绑定角色
 */
export async function getGameAccountsbyCookie (cookie: string): Promise<BTMuli.Genshin.Base.Response | BTMuli.User.Game.Account[]> {
  const url = `${TGApi.GameData.byCookie.getAccounts}?game_biz=${TGConstant.UTILS.GAME_BIZ}`;
  const header = TGUtils.User.getHeader(cookie, "");
  return await http.fetch<BTMuli.User.Response.GameAccounts>(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    console.log(res.data);
    if (res.data.retcode !== 0) return res.data;
    return res.data.data.list;
  });
}

/**
 * @description 获取用户角色列表
 * @since Alpha v0.2.0
 * @param {string} cookie 用户的 Cookie
 * @param {string} uid 用户 uid
 * @returns {Promise<unknown>} 用户角色列表
 */
export async function getGameRoleList (cookie: string, uid: string): Promise<unknown> {
  const url = TGApi.GameData.byCookie.getCharacter;
  // eslint-disable-next-line camelcase
  const data = { role_id: uid, server: TGUtils.Tools.getServerByUid(uid) };
  const header = TGUtils.User.getHeader(cookie, "", JSON.stringify(data));
  console.log("header:", header);
  return await http.fetch(url, {
    method: "POST",
    headers: header,
    body: http.Body.json(data),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
