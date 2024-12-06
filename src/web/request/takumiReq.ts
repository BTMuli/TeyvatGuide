/**
 * @file web/request/takumiReq.ts
 * @description Takumi 相关请求函数
 * @since Beta v0.6.3
 */
import TGHttp from "../../utils/TGHttp.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

// TakumiAuthApiBaseUrl => taAbu
const taAbu: Readonly<string> = "https://api-takumi.mihoyo.com/auth/api/";
// TakumiBingApiBaseUrl => tbAbu
const tbAbu: Readonly<string> = "https://api-takumi.mihoyo.com/binding/api/";

/**
 * @description 根据stoken获取action_ticket
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string} actionType 动作类型
 * @returns {Promise<TGApp.BBS.Response.getActionTicketBySToken>}
 */
async function getActionTicketBySToken(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  actionType: string,
): Promise<TGApp.BBS.Response.getActionTicketBySToken> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { action_type: actionType, stoken: cookie.stoken, uid: user.gameUid };
  return await TGHttp<TGApp.BBS.Response.getActionTicketBySToken>(
    `${taAbu}getActionTicketBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params, "K2"), query: params },
  );
}

/**
 * @description 生成authkey
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} account 账户
 * @return {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
async function genAuthKey(
  cookie: TGApp.App.Account.Cookie,
  account: TGApp.Sqlite.Account.Game,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const data = {
    auth_appid: "webview_gacha",
    game_biz: account.gameBiz,
    game_uid: account.gameUid,
    region: account.region,
  };
  const resp = await TGHttp<TGApp.Game.Gacha.AuthkeyResponse | TGApp.BBS.Response.Base>(
    `${tbAbu}genAuthKey`,
    {
      method: "POST",
      headers: getRequestHeader(ck, "POST", JSON.stringify(data), "LK2", true),
      body: JSON.stringify(data),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.authkey;
}

/**
 * @description 生成authkey-v2，专门用于JSBridge
 * @since Beta v0.6.3
 * @param {Record<string,string>} cookie cookie
 * @param {Record<string,string>} payload payload
 * @returns {Promise<TGApp.BBS.Response.Base>}
 */
async function genAuthKey2(
  cookie: Record<string, string>,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Response.Base> {
  return await TGHttp<TGApp.BBS.Response.Base>(`${tbAbu}genAuthKey`, {
    method: "POST",
    headers: getRequestHeader(cookie, "POST", JSON.stringify(payload), "LK2", true),
    body: JSON.stringify(payload),
  });
}

/**
 * @description 通过cookie获取游戏账号
 * @since Beta v0.6.5
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @returns {Promise<TGApp.BBS.Account.GameAccount[]|TGApp.BBS.Response.Base>}
 */
async function getUserGameRolesByCookie(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Account.GameAccount[] | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { game_biz: "hk4e_cn" };
  const resp = await TGHttp<TGApp.BBS.Response.getGameAccounts | TGApp.BBS.Response.Base>(
    `${tbAbu}getUserGameRolesByCookie`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

const TakumiApi = {
  auth: { actionTicket: getActionTicketBySToken },
  bind: { authKey: genAuthKey, authKey2: genAuthKey2, gameRoles: getUserGameRolesByCookie },
};

export default TakumiApi;
