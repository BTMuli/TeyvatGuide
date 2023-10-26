/**
 * @file web/request/getSyncAvatarDetail.ts
 * @description 获取同步角色详情相关请求函数
 * @since Beta v0.3.4
 */

import { app, http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 获取同步角色详情
 * @since Beta v0.3.4
 * @param {TGApp.BBS.Constant.CookieGroup2} cookie cookie
 * @param {string} uid 用户 uid
 * @param {number} avatarId 角色 id
 * @returns {Promise<TGApp.Game.Calculate.AvatarDetail|TGApp.BBS.Response.Base>}
 */
async function getSyncAvatarDetail(
  cookie: TGApp.BBS.Constant.CookieGroup2,
  uid: string,
  avatarId: number,
): Promise<TGApp.Game.Calculate.AvatarDetail | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.calculate.getSyncAvatarDetail;
  const params = {
    uid,
    region: TGUtils.Tools.getServerByUid(uid),
    avatar_id: avatarId.toString(),
  };
  const ck: Record<string, string> = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
  };
  const version = await app.getVersion();
  const header = {
    "User-Agent": `TeyvatGuide/${version}`,
    Referer: "https://webstatic.mihoyo.com/",
    Cookie: TGUtils.Tools.transCookie(ck),
  };
  return await http
    .fetch<TGApp.Game.Calculate.SyncAvatarDetailResponse | TGApp.BBS.Response.Base>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}

export default getSyncAvatarDetail;
