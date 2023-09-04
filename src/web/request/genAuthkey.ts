/**
 * @file web request genAuthkey.ts
 * @description 生成 authkey
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

// tauri
import { http } from "@tauri-apps/api";
// utils
import TGUtils from "../utils/TGUtils";
import TGConstant from "../constant/TGConstant";

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
    .fetch<TGApp.Game.Gacha.AuthkeyResponse>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode === 0) return res.data.data.authkey;
      return res.data;
    });
}
