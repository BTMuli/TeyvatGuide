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
import { getDS } from "../utils/getDS";
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取用户游戏数据
 * @param {BTMuli.User.Base.Cookie} cookie 用户的 Cookie
 * @returns {Promise<unknown>} 用户基本信息
 */
export async function getGameCard (cookie: BTMuli.User.Base.Cookie): Promise<unknown> {
  const url = TGApi.GameData.getUserCard;
  const header = {
    ...getRequestHeader(cookie),
    cookie: JSON.stringify(cookie),
    DS: getDS(`uid=${cookie.login_uid}`, ""),
  };
  return await http.fetch(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
