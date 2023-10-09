/**
 * @file web request getUserInfo.ts
 * @description 获取用户信息请求
 * @since Beta v0.3.3
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import TGUtils from "../utils/TGUtils";

/**
 * @description 根据 cookie 获取用户信息
 * @since Beta v0.3.3
 * @param {string} cookie_token cookie token
 * @param {string} account_id 用户 account_id
 * @returns {Promise<TGApp.App.Account.BriefInfo | TGApp.BBS.Response.Base>}
 */
export async function getUserInfoByCookie(
  cookie_token: string,
  account_id: string,
): Promise<TGApp.App.Account.BriefInfo | TGApp.BBS.Response.Base> {
  const cookie = {
    cookie_token,
    account_id,
  };
  const url = TGApi.GameData.byCookie.getUserInfo;
  const params = { gids: "2" };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common", true);
  return await http
    .fetch<TGApp.Plugins.Mys.User.HomeResponse>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
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
