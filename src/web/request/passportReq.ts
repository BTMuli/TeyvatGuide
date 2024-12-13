/**
 * @file web/request/passportReq.ts
 * @description Passport 相关请求
 * @since Beta v0.6.3
 */
import TGHttp from "@/utils/TGHttp.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

// PassportApiBaseUrl => pAbu
const pAbu: Readonly<string> = "https://passport-api.mihoyo.com/";
// PassportV4ApiBaseUrl => p4Abu
const p4Abu: Readonly<string> = "https://passport-api-v4.mihoyo.com/";

/**
 * @description 获取登录ticket
 * @since Beta v0.6.0
 * @param {TGApp.Sqlite.Account.Game} account - 账户
 * @param {TGApp.App.Account.Cookie} cookie - cookie
 * @returns {Promise<TGApp.BBS.Response.Base|string>}
 */
async function createAuthTicketByGameBiz(
  account: TGApp.Sqlite.Account.Game,
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | string> {
  const params: Record<string, string> = {
    game_biz: account.gameBiz,
    stoken: cookie.stoken,
    uid: account.gameUid,
    mid: cookie.mid,
  };
  const headers: Record<string, string> = {
    "x-rpc-client_type": "3",
    "x-rpc-app_id": "ddxf5dufpuyo",
  };
  const resp = await TGHttp<TGApp.BBS.Response.getAuthTicketByGameBiz>(
    `${pAbu}account/ma-cn-verifier/app/createAuthTicketByGameBiz`,
    { method: "POST", headers: headers, query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ticket;
}

/**
 * @description 根据 stoken 获取 cookie_token
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
async function getCookieAccountInfoBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { stoken: cookie.stoken };
  const resp = await TGHttp<TGApp.BBS.Response.getCookieTokenBySToken | TGApp.BBS.Response.Base>(
    `${pAbu}account/auth/api/getCookieAccountInfoBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.cookie_token;
}

/**
 * @description 根据 stoken_v2 获取 ltoken
 * @since Beta v0.5.0
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
async function getLTokenBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { mid: cookie.mid, stoken: cookie.stoken };
  const params = { stoken: cookie.stoken };
  const resp = await TGHttp<TGApp.BBS.Response.getLTokenBySToken | TGApp.BBS.Response.Base>(
    `${pAbu}account/auth/api/getLTokenBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ltoken;
}

/**
 * @description 验证 ltoken 有效性，返回 mid
 * @since Beta v0.6.5
 * @param {TGApp.App.Account.Cookie} cookie - 账户 cookie
 * @returns {Promise<string | TGApp.BBS.Response.Base>}
 */
async function verifyLToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const data = { ltoken: cookie.ltoken };
  const resp = await TGHttp<TGApp.BBS.Response.verifyUserInfoBySToken | TGApp.BBS.Response.Base>(
    `${p4Abu}account/ma-cn-session/web/verifyLtoken`,
    { method: "POST", headers: getRequestHeader(ck, "POST", data), body: JSON.stringify(data) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info.mid;
}

const PassportApi = {
  authTicket: createAuthTicketByGameBiz,
  cookieToken: getCookieAccountInfoBySToken,
  lToken: { get: getLTokenBySToken, verify: verifyLToken },
};

export default PassportApi;
