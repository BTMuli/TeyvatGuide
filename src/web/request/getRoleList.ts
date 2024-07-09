/**
 * @file web/request/getRoleList.ts
 * @description 获取游戏角色列表的请求方法
 * @since Beta v0.5.0
 */

import TGHttp from "../../utils/TGHttp.js";
import TGApi from "../api/TGApi.js";
import TGUtils from "../utils/TGUtils.js";

/**
 * @description 通过 Cookie 获取用户角色列表
 * @since Beta v0.5.0
 * @param {Record<string, string>} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.Character.ListItem[]|TGApp.BBS.Response.Base>} 用户角色列表
 */
export async function getGameRoleListByLToken(
  cookie: Record<string, string>,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Character.ListItem[] | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.byCookie.getCharacter;
  const uid = account.gameUid;
  const data = { role_id: uid, server: TGUtils.Tools.getServerByUid(uid) };
  const header = TGUtils.User.getHeader(cookie, "POST", JSON.stringify(data), "common");
  const resp = await TGHttp<TGApp.Game.Character.ListResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.avatars;
}
