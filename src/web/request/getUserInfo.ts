/**
 * @file web request getUserInfo.ts
 * @description 获取用户信息请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";
// types
import { type UserResponse } from "../../plugins/Mys/interface/user";

/**
 * @description 根据 cookie 获取用户信息
 * @since Alpha v0.2.0
 * @param {string} cookie_token cookie token
 * @param {string} account_id 用户 account_id
 * @returns {Promise<BTMuli.User.Base.BriefInfo | BTMuli.Genshin.Base.Response>}
 */
export async function getUserInfoByCookie (cookie_token: string, account_id: string): Promise<BTMuli.User.Base.BriefInfo | BTMuli.Genshin.Base.Response> {
  const cookie = {
    cookie_token,
    account_id,
  };
  const url = TGApi.GameData.byCookie.getUserInfo;
  const params = { gids: 2 };
  const header = TGUtils.User.getSignHeader(cookie, "GET", {}, "common");
  return await http.fetch<UserResponse>(url, {
    method: "GET",
    headers: header,
    body: http.Body.json(params),
  }).then((res) => {
    if (res.data.retcode !== 0) return res.data;
    const info = res.data.data.user_info;
    return {
      nickname: info.nickname,
      uid: info.uid,
      avatar: info.avatar_url,
      desc: info.introduce,
    };
  });
}
