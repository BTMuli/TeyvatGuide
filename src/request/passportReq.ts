/**
 * Passport 相关请求
 * @since Beta v0.10.1
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGBbs from "@utils/TGBbs.js";
import TGHttps from "@utils/TGHttps.js";
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
 * @param data - 待加密数据
 * @returns 加密后数据
 */
function rsaEncrypt(data: string): string {
  const res = encrypt.encrypt(data.toString());
  if (res === false) return "";
  return res;
}

/**
 * 获取登录 ticket
 * @since Beta v0.10.1
 * @param account - 账户
 * @param cookie - cookie
 * @returns ticket 响应数据
 */
async function createAuthTicketByGameBiz(
  account: TGApp.Sqlite.Account.Game,
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.Game.Login.GameAuthTicketResp> {
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
  const resp = await TGHttps.post<TGApp.Game.Login.GameAuthTicketResp>(
    `${pAbu}account/ma-cn-verifier/app/createAuthTicketByGameBiz`,
    { headers: headers, query: params },
  );
  return resp.data;
}

/**
 * 获取短信验证码
 * @since Beta v0.10.1
 * @param phone - 手机号
 * @param aigis - 验证数据
 * @returns 验证码响应
 */
async function createLoginCaptcha(
  phone: string,
  aigis?: string,
): Promise<TGApp.App.Response.Resp<TGApp.BBS.CaptchaLogin.CaptchaResp>> {
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
  return await TGHttps.post<TGApp.BBS.CaptchaLogin.CaptchaResp>(
    `${pAbu}account/ma-cn-verifier/verifier/createLoginCaptcha`,
    { headers: header, body: body },
  );
}

/**
 * 创建登录二维码
 * @since Beta v0.10.1
 * @deprecated 返回数据不符合要求
 * @returns 二维码响应数据
 */
async function createQrLogin(): Promise<TGApp.BBS.GameLogin.GetLoginQrResponse> {
  const resp = await TGHttps.post<TGApp.BBS.GameLogin.GetLoginQrResponse>(
    `${pAbu}account/ma-cn-passport/app/createQRLogin`,
    {
      headers: {
        "x-rpc-device_id": getDeviceInfo("device_id"),
        "user-agent": `HYPContainer/${hlv}`,
        "x-rpc-app_id": "ddxf5dufpuyo",
        "x-rpc-client_type": "3",
      },
    },
  );
  return resp.data;
}

/**
 * 根据 stoken 获取 cookie_token
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @returns cookie_token 响应数据
 */
async function getCookieAccountInfoBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.CookieTokenResp> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { stoken: cookie.stoken };
  const resp = await TGHttps.get<TGApp.BBS.Passport.CookieTokenResp>(
    `${pAbu}account/auth/api/getCookieAccountInfoBySToken`,
    { headers: getRequestHeader(ck, "GET", params), query: params },
  );
  return resp.data;
}

/**
 * 根据 stoken_v2 获取 ltoken
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @returns ltoken 响应数据
 */
async function getLTokenBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.LTokenResp> {
  const ck = { mid: cookie.mid, stoken: cookie.stoken };
  const params = { stoken: cookie.stoken };
  const resp = await TGHttps.get<TGApp.BBS.Passport.LTokenResp>(
    `${pAbu}account/auth/api/getLTokenBySToken`,
    { headers: getRequestHeader(ck, "GET", params), query: params },
  );
  return resp.data;
}

/**
 * 通过短信验证码登录
 * @since Beta v0.10.1
 * @param phone - 手机号
 * @param captcha - 验证码
 * @param action_type - 操作类型
 * @param aigis - 验证数据
 * @returns 登录响应
 */
async function loginByMobileCaptcha(
  phone: string,
  captcha: string,
  action_type: string,
  aigis?: string,
): Promise<TGApp.App.Response.Resp<TGApp.BBS.CaptchaLogin.LoginResp>> {
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
  return await TGHttps.post<TGApp.BBS.CaptchaLogin.LoginResp>(
    `${pAbu}account/ma-cn-passport/app/loginByMobileCaptcha`,
    { headers: header, body: body },
  );
}

/**
 * 获取登录状态
 * @since Beta v0.10.1
 * @deprecated 返回数据不符合要求
 * @param ticket - 二维码 ticket
 * @returns 登录状态响应数据
 */
async function queryLoginStatus(
  ticket: string,
): Promise<TGApp.BBS.GameLogin.GetLoginStatusResponse> {
  const resp = await TGHttps.post<TGApp.BBS.GameLogin.GetLoginStatusResponse>(
    `${pAbu}account/ma-cn-passport/app/queryQRLoginStatus`,
    {
      headers: {
        "x-rpc-device_id": getDeviceInfo("device_id"),
        "user-agent": `HYPContainer/${hlv}`,
        "x-rpc-app_id": "ddxf5dufpuyo",
        "x-rpc-client_type": "3",
      },
      body: { ticket },
    },
  );
  return resp.data;
}

/**
 * 验证 ltoken 有效性，返回 mid
 * @since Beta v0.10.1
 * @param cookie - 账户 cookie
 * @returns 验证响应数据
 */
async function verifyLToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.VerifyLTokenResp> {
  const ck = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
  const data = { ltoken: cookie.ltoken };
  const resp = await TGHttps.post<TGApp.BBS.Passport.VerifyLTokenResp>(
    `${p4Abu}account/ma-cn-session/web/verifyLtoken`,
    { headers: getRequestHeader(ck, "POST", data), body: data },
  );
  return resp.data;
}

const passportReq = {
  authTicket: createAuthTicketByGameBiz,
  cookieToken: getCookieAccountInfoBySToken,
  lToken: { get: getLTokenBySToken, verify: verifyLToken },
  qrLogin: { create: createQrLogin, query: queryLoginStatus },
  captcha: { create: createLoginCaptcha, login: loginByMobileCaptcha },
};

export default passportReq;
