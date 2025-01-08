/**
 * @file web/request/passportReq.ts
 * @description Passport 相关请求
 * @since Beta v0.6.8
 */
import TGHttp from "@/utils/TGHttp.js";
import { getDeviceInfo } from "@/utils/toolFunc.js";
import { getRequestHeader } from "@/web/utils/getRequestHeader.js";

// PassportApiBaseUrl => pAbu
const pAbu: Readonly<string> = "https://passport-api.mihoyo.com/";
// PassportV4ApiBaseUrl => p4Abu
const p4Abu: Readonly<string> = "https://passport-api-v4.mihoyo.com/";
// HoyoLauncherVersion
const hlv: Readonly<string> = "1.3.3.182";

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
  const resp = await TGHttp<AuthTicketByGameBizResp>(
    `${pAbu}account/ma-cn-verifier/app/createAuthTicketByGameBiz`,
    { method: "POST", headers: headers, query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ticket;
}

/**
 * @description 创建登录二维码
 * @since Beta v0.6.8
 * @returns {Promise<TGApp.BBS.Response.Base|TGApp.BBS.GameLogin.GetLoginQrData>}
 */
async function createQrLogin(): Promise<
  TGApp.BBS.Response.Base | TGApp.BBS.GameLogin.GetLoginQrData
> {
  const resp = await TGHttp<TGApp.BBS.GameLogin.GetLoginQrResponse>(
    `${pAbu}account/ma-cn-passport/app/createQRLogin`,
    {
      method: "POST",
      headers: {
        "x-rpc-device_id": getDeviceInfo("device_id"),
        "user-agent": `HYPContainer/${hlv}`,
        "x-rpc-app_id": "ddxf5dufpuyo",
        "x-rpc-client_type": "3",
      },
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
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
  const resp = await TGHttp<GetCookieTokenBySTokenResp | TGApp.BBS.Response.Base>(
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
  const resp = await TGHttp<GetLTokenBySTokenResp | TGApp.BBS.Response.Base>(
    `${pAbu}account/auth/api/getLTokenBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ltoken;
}

/**
 * @description 获取登录状态
 * @since Beta v0.6.8
 * @param {string} ticket - 二维码 ticket
 * @returns {Promise<TGApp.BBS.Response.Base|TGApp.BBS.GameLogin.GetLoginStatusData>}
 */
async function queryLoginStatus(
  ticket: string,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.GameLogin.GetLoginStatusData> {
  const resp = await TGHttp<TGApp.BBS.GameLogin.GetLoginStatusResponse>(
    `${pAbu}account/ma-cn-passport/app/queryQRLoginStatus`,
    {
      method: "POST",
      headers: {
        "x-rpc-device_id": getDeviceInfo("device_id"),
        "user-agent": `HYPContainer/${hlv}`,
        "x-rpc-app_id": "ddxf5dufpuyo",
        "x-rpc-client_type": "3",
      },
      body: JSON.stringify({ ticket }),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
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
  const resp = await TGHttp<VerifyLtokenResp>(`${p4Abu}account/ma-cn-session/web/verifyLtoken`, {
    method: "POST",
    headers: getRequestHeader(ck, "POST", data),
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info.mid;
}

const PassportApi = {
  authTicket: createAuthTicketByGameBiz,
  cookieToken: getCookieAccountInfoBySToken,
  lToken: { get: getLTokenBySToken, verify: verifyLToken },
  qrLogin: { create: createQrLogin, query: queryLoginStatus },
};

export default PassportApi;

/// 一些类型 ///
type AuthTicketByGameBizResp = TGApp.BBS.Response.BaseWithData & { data: { ticket: string } };

type GetCookieTokenBySTokenResp = TGApp.BBS.Response.BaseWithData & {
  data: { uid: string; cookie_token: string };
};

type GetLTokenBySTokenResp = TGApp.BBS.Response.BaseWithData & { data: { ltoken: string } };

type VerifyLtokenResp = TGApp.BBS.Response.BaseWithData & {
  data: {
    realname_info: unknown;
    need_realperson: boolean;
    user_info: {
      aid: string;
      mid: string;
      account_name: string;
      email: string;
      is_email_verify: number;
      area_code: string;
      safe_mobile: string;
      realname: string;
      identity_code: string;
      rebind_area_code: string;
      rebind_mobile: string;
      rebind_mobile_time: string;
      links: Array<unknown>;
    };
  };
};
