/**
 * @file web/request/getSyncAvatarListAll.ts
 * @description 获取同步角色列表请求
 * @since Beta v0.3.4
 */

import { app, http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 获取同步角色列表请求
 * @since Beta v0.3.4
 * @param {Record<string,string>} cookie cookie
 * @param {string} uid 用户 uid
 * @param {number} page 页码
 * @return {Promise<TGApp.Game.Calculate.AvatarListItem[]|TGApp.BBS.Response.Base>}
 */
async function getSyncAvatarList(
  cookie: Record<string, string>,
  uid: string,
  page: number,
): Promise<TGApp.Game.Calculate.AvatarListItem[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.calculate.getSyncAvatarList; // 获取同步角色列表请求地址
  const data = {
    uid,
    region: TGUtils.Tools.getServerByUid(uid),
    page,
  };
  const version = await app.getVersion();
  const header = {
    "User-Agent": `TeyvatGuide/${version}`,
    Referer: "https://webstatic.mihoyo.com/",
    Cookie: TGUtils.Tools.transCookie(cookie),
  };
  return await http
    .fetch<TGApp.Game.Calculate.SyncAvatarListResponse | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      body: http.Body.json(data),
      headers: header,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.list;
    });
}

/**
 * @description 获取同步角色列表-汇总
 * @since Alpha v0.2.1
 * @param {Record<string,string>} cookie cookie
 * @param {string} uid 用户 uid
 * @return {Promise<TGApp.Game.Calculate.AvatarListItem[]|TGApp.BBS.Response.Base>}
 */
async function getSyncAvatarListAll(
  cookie: Record<string, string>,
  uid: string,
): Promise<TGApp.Game.Calculate.AvatarListItem[] | TGApp.BBS.Response.Base> {
  let page = 1;
  let res = await getSyncAvatarList(cookie, uid, page);
  if (!Array.isArray(res)) return res;
  let list: TGApp.Game.Calculate.AvatarListItem[] = [];
  while (Array.isArray(res) && res.length > 0) {
    list = list.concat(res);
    page++;
    res = await getSyncAvatarList(cookie, uid, page);
  }
  return list;
}

export default getSyncAvatarListAll;
