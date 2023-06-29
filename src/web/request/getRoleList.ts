/**
 * @file web request getRoleList.ts
 * @description 获取游戏角色列表的请求方法
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// utils
import TGApi from "../api/TGApi";
import TGUtils from "../utils/TGUtils";

/**
 * @description 通过 Cookie 获取用户角色列表
 * @since Alpha v0.2.0
 * @param {TGApp.BBS.Constant.CookieGroup4} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.Character.ListItem[]|TGApp.BBS.Response.Base>} 用户角色列表
 */
export async function getGameRoleListByLToken(
  cookie: TGApp.BBS.Constant.CookieGroup4,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Character.ListItem[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getCharacter;
  const uid = account.gameUid;
  // eslint-disable-next-line camelcase
  const data = { role_id: uid, server: TGUtils.Tools.getServerByUid(uid) };
  // 格式转换 将 cookie 对象转换 record<string, string>
  const ck: Record<string, string> = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltuid: cookie.ltuid,
    ltoken: cookie.ltoken,
  };
  const header = TGUtils.User.getHeader(ck, "POST", JSON.stringify(data), "common");
  return await http
    .fetch<TGApp.Game.Character.ListResponse>(url, {
      method: "POST",
      headers: header,
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data.avatars;
    });
}
