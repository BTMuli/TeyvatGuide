/**
 * @file web/request/getAvatarDetail.ts
 * @description 获取角色详情相关请求函数
 * @since Beta v0.6.1
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 手动刷新角色数据
 * @since Beta v0.6.1
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<void>}
 */
export async function getAvatarIndex(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getUserBase;
  const params = { avatar_list_type: 1, role_id: user.gameUid, server: user.region };
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const header = TGUtils.User.getHeader(ck, "GET", params, "common");
  return await TGHttp<TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
}

/**
 * @description 获取角色列表
 * @since Beta v0.6.1
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @return {Promise<TGApp.Game.Avatar.Avatar[]|TGApp.BBS.Response.Base>}
 */
export async function getAvatarList(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Avatar.Avatar[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarList;
  const data = { role_id: user.gameUid, server: user.region };
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const header = TGUtils.User.getHeader(ck, "POST", data, "common");
  const resp = await TGHttp<TGApp.Game.Avatar.ListResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * @description 获取角色详情
 * @since Beta v0.6.1
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string[]} avatarIds 角色 id 列表
 * @return {Promise<TGApp.Game.Avatar.AvatarDetail|TGApp.BBS.Response.Base>}
 */
export async function getAvatarDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  avatarIds: string[],
): Promise<TGApp.Game.Avatar.AvatarDetail | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarDetail;
  const data = { role_id: user.gameUid, server: user.region, character_ids: avatarIds };
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const header = TGUtils.User.getHeader(ck, "POST", data, "common");
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
