/**
 * @file web/request/getUserInfo.ts
 * @description 获取用户信息请求
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 根据 cookie 获取用户信息
 * @since Beta v0.5.0
 * @param {string} cookie_token cookie token
 * @param {string} account_id 用户 account_id
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info>}
 */
export async function getUserInfoByCookie(
  cookie_token: string,
  account_id: string,
): Promise<TGApp.BBS.Response.Base | TGApp.Plugins.Mys.User.Info> {
  const cookie = {
    cookie_token,
    account_id,
  };
  const url = TGApi.GameData.byCookie.getUserInfo;
  const params = { gids: "2" };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common", true);
  const resp = await TGHttp<TGApp.Plugins.Mys.User.HomeResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info;
}
