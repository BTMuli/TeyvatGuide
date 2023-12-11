/**
 * @file web/request/genAuthkey.ts
 * @description 生成 authkey
 * @since Beta v0.3.7
 */

import { http } from "@tauri-apps/api";

import TGConstant from "../constant/TGConstant";
import TGUtils from "../utils/TGUtils";

/**
 * @description 生成 authkey
 * @since Beta v0.3.0
 * @param {Record<string, string>} cookie cookie // stoken_v2 & mid
 * @param {string} gameUid 游戏 uid
 * @returns {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
export async function genAuthkey(
  cookie: Record<string, string>,
  gameUid: string,
): Promise<string | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
  const data = {
    auth_appid: "webview_gacha",
    game_biz: TGConstant.Utils.GAME_BIZ,
    game_uid: Number(gameUid),
    region: TGUtils.Tools.getServerByUid(gameUid),
  };
  const header = TGUtils.User.getHeader(cookie, "POST", JSON.stringify(data), "lk2", true);
  return await http
    .fetch<TGApp.Game.Gacha.AuthkeyResponse | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode === 0) return res.data.data.authkey;
      return res.data;
    });
}

/**
 * @description 生成 authkey
 * @since Beta v0.3.0
 * @param {Record<string, string>} cookie cookie // stoken_v2 & mid
 * @param {object} payload payload
 * @returns {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
export async function genAuthkey2(
  cookie: Record<string, string>,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Response.Base> {
  const url = "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
  const header = TGUtils.User.getHeader(cookie, "POST", JSON.stringify(payload), "lk2", true);
  return await http
    .fetch<TGApp.BBS.Response.Base>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(payload),
    })
    .then((res) => res.data);
}
