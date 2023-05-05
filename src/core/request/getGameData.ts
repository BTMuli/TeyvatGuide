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

/**
 * @description 获取用户游戏数据
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户的 Cookie
 * @returns {Promise<unknown>} 用户基本信息
 */
export async function getGameCard (cookie: BTMuli.User.Base.Cookie): Promise<unknown> {
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
 * @description 获取用户绑定角色
 * @since Alpha v0.2.0
 * @param {BTMuli.User.Base.Cookie} cookie 用户的 Cookie
 * @param {string} stoken stoken
 * @returns {Promise<unknown>} 用户绑定角色
 */
export async function getGameRoles (cookie: BTMuli.User.Base.Cookie, stoken: string): Promise<unknown> {
  const url = TGApi.GameData.getGameRoles;
  const ck = TGUtils.Tools.cookieToString(cookie);
  const query = `stoken=${stoken}`;
  const header = TGUtils.User.getHeader(ck, query);
  console.log("header:", header);
  console.log("stoken:", stoken);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    body: http.Body.json({
      stoken,
    }),
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
