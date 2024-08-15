/**
 * @file web/request/getAvatarDetail.ts
 * @description 获取角色详情相关请求函数
 * @since Beta v0.5.3
 */

import { app } from "@tauri-apps/api";

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 获取角色列表
 * @since Beta v0.5.3
 * @param {Record<string, string>} cookie Cookie
 * @param {string} uid 用户 uid
 * @return {Promise<TGApp.Game.Avatar.Avatar[]|TGApp.BBS.Response.Base>}
 */
export async function getAvatarList(
  cookie: Record<string, string>,
  uid: string,
): Promise<TGApp.Game.Avatar.Avatar[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarList;
  const data = { uid, region: TGUtils.Tools.getServerByUid(uid) };
  const version = await app.getVersion();
  const header = {
    "User-Agent": `TeyvatGuide/${version}`,
    Referer: "https://webstatic.mihoyo.com/",
    Cookie: TGUtils.Tools.transCookie(cookie),
  };
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
 * @param {string} uid 用户 uid
 * @param {number} avatarId 角色 id
 * @return {Promise<TGApp.Game.Avatar.AvatarDetail|TGApp.BBS.Response.Base>}
 */
export async function getAvatarDetail(
  cookie: Record<string, string>,
  uid: string,
  avatarId: number,
): Promise<TGApp.Game.Avatar.AvatarDetail | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getAvatarDetail;
  const params = { uid, region: TGUtils.Tools.getServerByUid(uid), avatar_id: avatarId };
  const version = await app.getVersion();
  const header = {
    "User-Agent": `TeyvatGuide/${version}`,
    Referer: "https://webstatic.mihoyo.com/",
    Cookie: TGUtils.Tools.transCookie(cookie),
  };
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    query: params,
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
