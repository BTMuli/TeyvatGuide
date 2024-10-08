/**
 * @file web/request/getAvatarDetail.ts
 * @description 获取角色详情相关请求函数
 * @since Beta v0.5.3
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 获取角色列表
 * @since Beta v0.5.3
 * @param {Record<string, string>} cookie Cookie
 * @param {string} roleId 用户 uid
 * @return {Promise<TGApp.Game.Avatar.Avatar[]|TGApp.BBS.Response.Base>}
 */
export async function getAvatarList(
  cookie: Record<string, string>,
  roleId: string,
): Promise<TGApp.Game.Avatar.Avatar[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarList;
  const data = { role_id: roleId, server: TGUtils.Tools.getServerByUid(roleId) };
  const header = TGUtils.User.getHeader(cookie, "POST", data, "common");
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
 * @since Beta v0.5.3
 * @param {Record<string, string>} cookie Cookie
 * @param {string} roleId 用户 uid
 * @param {string[]} avatarIds 角色 id 列表
 * @return {Promise<TGApp.Game.Avatar.AvatarDetail|TGApp.BBS.Response.Base>}
 */
export async function getAvatarDetail(
  cookie: Record<string, string>,
  roleId: string,
  avatarIds: string[],
): Promise<TGApp.Game.Avatar.AvatarDetail | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarDetail;
  const data = {
    role_id: roleId,
    server: TGUtils.Tools.getServerByUid(roleId),
    character_ids: avatarIds,
  };
  const header = TGUtils.User.getHeader(cookie, "POST", data, "common");
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
