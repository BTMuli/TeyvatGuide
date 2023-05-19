/**
 * @file core utils getGameData.ts
 * @description 获取游戏数据的函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
import qs from "qs";
// utils
import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";
import TGConstant from "../constant/TGConstant";

/**
 * @description 获取用户游戏数据
 * @since Alpha v0.2.0
 * @param {string} cookie 用户的 Cookie
 * @param {string} uid 用户的 UID
 * @returns {Promise<unknown>} 用户基本信息
 */
export async function getGameCardByCookie (cookie: string, uid: string): Promise<unknown> {
  const url = `${TGApi.GameData.getUserCard}`;
  const params = { uid };
  const header = TGUtils.User.getHeader(cookie, "GET", qs.stringify(params), "common");
  console.log("header:", header);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    console.log(res);
    return res.data;
  });
}

/**
 * @description 获取用户绑定角色-通过stoken
 * @since Alpha v0.2.0
 * @todo 暂时不考虑使用
 * @param {string} cookie 用户的 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>} 用户绑定角色
 */
export async function getAccountsBySToken (cookie: string, stoken: string): Promise<unknown> {
  const url = TGApi.GameData.bySToken.getAccounts;
  // eslint-disable-next-line camelcase
  const params = { stoken, game_biz: TGConstant.Utils.GAME_BIZ };
  const header = TGUtils.User.getHeader(cookie, "GET", JSON.stringify(params), "common");
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
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
export async function getGameAccountsByCookie (cookie: string): Promise<BTMuli.Genshin.Base.Response | BTMuli.User.Game.Account[]> {
  const url = TGApi.GameData.byCookie.getAccounts;
  const params = { game_biz: TGConstant.Utils.GAME_BIZ };
  const header = TGUtils.User.getHeader(cookie, "GET", qs.stringify(params), "common");
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
export async function getGameRoleListByCookie (cookie: string, uid: string): Promise<unknown> {
  const url = TGApi.GameData.byCookie.getCharacter;
  // eslint-disable-next-line camelcase
  const data = { role_id: uid, server: TGUtils.Tools.getServerByUid(uid) };
  const header = TGUtils.User.getHeader(cookie, "", JSON.stringify(data), "common");
  return await http.fetch(url, {
    method: "POST",
    headers: header,
    body: http.Body.json(data),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
