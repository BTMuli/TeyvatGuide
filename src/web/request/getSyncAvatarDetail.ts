/**
 * @file web/request/getSyncAvatarDetail.ts
 * @description 获取同步角色详情相关请求函数
 * @since Beta v0.3.8
 */

import { app, http } from "@tauri-apps/api";

import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 获取同步角色详情
 * @since Beta v0.3.8
 * @param {string} accountId 账号 id
 * @param {string} cookieToken cookie token
 * @param {string} uid 用户 uid
 * @param {number} avatarId 角色 id
 * @returns {Promise<TGApp.Game.Calculate.AvatarDetail|TGApp.BBS.Response.Base>}
 */
async function getSyncAvatarDetail(
  accountId: string,
  cookieToken: string,
  uid: string,
  avatarId: number,
): Promise<TGApp.Game.Calculate.AvatarDetail | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.calculate.getSyncAvatarDetail;
  const params = {
    uid,
    region: TGUtils.Tools.getServerByUid(uid),
    avatar_id: avatarId.toString(),
  };
  const version = await app.getVersion();
  const header = {
    "User-Agent": `TeyvatGuide/${version}`,
    Referer: "https://webstatic.mihoyo.com/",
    Cookie: TGUtils.Tools.transCookie({ account_id: accountId, cookie_token: cookieToken }),
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
