/**
 * Passport 相关请求
 * @since Beta v0.7.2
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGBbs from "@utils/TGBbs.js";
import TGHttp from "@utils/TGHttp.js";
import { getDeviceInfo } from "@utils/toolFunc.js";
import { JSEncrypt } from "jsencrypt";

/* PassportApiBaseUrl => pAbu */
const pAbu: Readonly<string> = "https://passport-api.mihoyo.com/";
/* PassportV4ApiBaseUrl => p4Abu */
const p4Abu: Readonly<string> = "https://passport-api-v4.mihoyo.com/";
/* HoyoLauncherVersion => hlv */
const hlv: Readonly<string> = "1.3.3.182";
/* 加密密钥 */
const PUB_KEY_STR: Readonly<string> = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDvekdPMHN3AYhm/vktJT+YJr7cI5DcsNKqdsx5DZX0gDuWFuIjzdwButrIYPNmRJ1G8ybDIF7oDW2eEpm5sMbL9zs
9ExXCdvqrn51qELbqj0XxtMTIpaCHFSI50PfPpTFV9Xt/hmyVwokoOXFlAEgCn+Q
CgGs52bFoYMtyi+xEQIDAQAB
-----END PUBLIC KEY-----`;
const encrypt = new JSEncrypt();
encrypt.setPublicKey(PUB_KEY_STR);

/**
 * rsa 加密
 * @since Beta v0.5.1
 * @param {string} data - 待加密数据
 * @returns {string} 加密后数据
 */
function rsaEncrypt(data: string): string {
  const res = encrypt.encrypt(data.toString());
  if (res === false) return "";
  return res;
}

/**
 * 获取登录ticket
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
  type ResType = { ticket: string };
  const resp = await TGHttp<TGApp.BBS.Response.BaseWithData<ResType>>(
    `${pAbu}account/ma-cn-verifier/app/createAuthTicketByGameBiz`,
    { method: "POST", headers: headers, query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ticket;
}

/**
 * 获取短信验证码
 * @since Beta v0.7.2
 * @param {string} phone - 手机号
 * @param {string} [aigis] - 验证数据
 * @returns {Promise<TGApp.BBS.CaptchaLogin.CaptchaRes | TGApp.BBS.Response.BaseWithData<string>>}
 */
async function createLoginCaptcha(
  phone: string,
  aigis?: string,
): Promise<TGApp.BBS.CaptchaLogin.CaptchaRes | TGApp.BBS.Response.BaseWithData<string>> {
  const body = { area_code: rsaEncrypt("+86"), mobile: rsaEncrypt(phone) };
  const header: Record<string, string> = {
    "x-rpc-aigis": aigis || "",
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    "x-rpc-device_name": getDeviceInfo("device_name"),
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_model": getDeviceInfo("product"),
    "user-agent": TGBbs.ua,
    "content-type": "application/json",
    referer: "https://user.miyoushe.com/",
    "x-rpc-game_biz": "hk4e_cn",
  };
  const resp = await TGHttp<TGApp.BBS.CaptchaLogin.CaptchaResp>(
    `${pAbu}account/ma-cn-verifier/verifier/createLoginCaptcha`,
    { method: "POST", headers: header, body: JSON.stringify(body) },
    true,
  );
  const data = await resp.data;
  if (data.retcode !== 0) {
    return <TGApp.BBS.Response.BaseWithData<string>>{
      retcode: data.retcode,
      message: data.message,
      data: resp.resp.headers.get("x-rpc-aigis"),
    };
  }
  return <TGApp.BBS.CaptchaLogin.CaptchaRes>data.data;
}

/**
 * 创建登录二维码
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
 * 根据 stoken 获取 cookie_token
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
async function getCookieAccountInfoBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { stoken: cookie.stoken };
  type ResType = { uid: string; cookie_token: string };
  const resp = await TGHttp<TGApp.BBS.Response.BaseWithData<ResType>>(
    `${pAbu}account/auth/api/getCookieAccountInfoBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.cookie_token;
}

/**
 * 根据 stoken_v2 获取 ltoken
 * @since Beta v0.5.0
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @returns {Promise<string|TGApp.BBS.Response.Base>}
 */
async function getLTokenBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { mid: cookie.mid, stoken: cookie.stoken };
  const params = { stoken: cookie.stoken };
  type ResType = { ltoken: string };
  const resp = await TGHttp<TGApp.BBS.Response.BaseWithData<ResType>>(
    `${pAbu}account/auth/api/getLTokenBySToken`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ltoken;
}

/**
 * 通过短信验证码登录
 * @since Beta v0.5.1
 * @param {string} phone - 手机号
 * @param {string} captcha - 验证码
 * @param {string} action_type - 操作类型
 * @param {string} [aigis] - 验证数据
 * @returns {Promise<TGApp.BBS.CaptchaLogin.LoginRes | TGApp.BBS.Response.Base>}
 */
async function loginByMobileCaptcha(
  phone: string,
  captcha: string,
  action_type: string,
  aigis?: string,
): Promise<TGApp.BBS.CaptchaLogin.LoginRes | TGApp.BBS.Response.Base> {
  const body = {
    area_code: rsaEncrypt("+86"),
    mobile: rsaEncrypt(phone),
    action_type,
    captcha,
  };
  const header = {
    "x-rpc-aigis": aigis || "",
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    "x-rpc-device_name": getDeviceInfo("device_name"),
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_model": getDeviceInfo("product"),
    "user-agent": TGBbs.ua,
  };
  const resp = await TGHttp<TGApp.BBS.CaptchaLogin.LoginResp>(
    `${pAbu}account/ma-cn-passport/app/loginByMobileCaptcha`,
    { method: "POST", headers: header, body: JSON.stringify(body) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取登录状态
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
 * 验证 ltoken 有效性，返回 mid
 * @since Beta v0.6.5
 * @param {TGApp.App.Account.Cookie} cookie - 账户 cookie
 * @returns {Promise<string | TGApp.BBS.Response.Base>}
 */
async function verifyLToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const data = { ltoken: cookie.ltoken };
  type ResType = {
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
  const resp = await TGHttp<TGApp.BBS.Response.BaseWithData<ResType>>(
    `${p4Abu}account/ma-cn-session/web/verifyLtoken`,
    {
      method: "POST",
      headers: getRequestHeader(ck, "POST", data),
      body: JSON.stringify(data),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.user_info.mid;
}

const passportReq = {
  authTicket: createAuthTicketByGameBiz,
  cookieToken: getCookieAccountInfoBySToken,
  lToken: { get: getLTokenBySToken, verify: verifyLToken },
  qrLogin: { create: createQrLogin, query: queryLoginStatus },
  captcha: { create: createLoginCaptcha, login: loginByMobileCaptcha },
};

export default passportReq;
