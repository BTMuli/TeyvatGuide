/**
 * @file core utils getGameRecord.ts
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
 * @todo invalid uid
 * @description 这边的 ck 可以是 cookie_token 和 account_id
 * @description 也可以是 ltoken 和 ltuid
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户的基本信息
 * @returns {Promise<unknown>} 用户基本信息
 */
export async function getGameRecord (cookie: Record<string, string>, user: TGApp.Sqlite.Account.Game): Promise<unknown> {
  const url = TGApi.GameData.getUserCard;
  const params = { role_id: user.gameUid, server: user.region };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http.fetch(url, {
    method: "GET",
    headers: header,
    query: params,
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
