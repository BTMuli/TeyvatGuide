/**
 * Passport 相关请求
 * @since Beta v0.13.2
 */
import TGBbs from "@utils/bbs/TGBbs.js";
import { getDeviceInfo, getRandomString } from "@utils/common/toolFunc.js";
import { getDS4JS, getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";
import Md5 from "js-md5";
import { JSEncrypt } from "jsencrypt";
import { v4 } from "uuid";

/* PassportApiBaseUrl => pAbu */
const pAbu: Readonly<string> = "https://passport-api.mihoyo.com/";
/* PassportV4ApiBaseUrl => p4Abu */
const p4Abu: Readonly<string> = "https://passport-api-v4.mihoyo.com/";
/* 米游社 Android APK 2.119.0 的通行证 SDK 生产环境配置，见 classes5.dex */
const PASSPORT_SDK_VERSION = "2.44.0";
const PASSPORT_DS_SALT = "JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS";
const PASSPORT_LIFECYCLE_ID = v4();
const TokenType = <const>{ SToken: 1, LToken: 2, CookieToken: 4 };

/**
 * 通行证 V2 换票响应。
 * @since Beta v0.13.2
 */
type TokenExchangeResp =
  | TGApp.BBS.Response.Base
  | TGApp.BBS.Response.BaseWithData<{
      token: { token: string };
      user_info?: { aid?: string | number };
    }>;

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
 * 获取扫码登录请求头
 * @since Beta v0.12.5
 * @remarks user-agent 需与米游社 App 一致，扫码得到的 stoken 才能用于米社
 * @param body - 请求体字符串，用于计算 DS 签名
 * @returns 请求头
 */
function getQrHeaders(body: string): Record<string, string> {
  return {
    "user-agent": `Mozilla/5.0 miHoYoBBS/${TGBbs.version} Capture/2.2.0`,
    accept: "*/*",
    "accept-language": "zh-cn",
    "x-rpc-client_type": "3",
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-sdk_version": TGBbs.version,
    "x-rpc-account_version": TGBbs.version,
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_fp": getDeviceInfo("device_fp"),
    "x-rpc-device_name": getDeviceInfo("device_name"),
    "x-rpc-device_model": getDeviceInfo("product"),
    DS: getDS4JS("X4", 2, body),
    "content-type": "application/json",
  };
}

/**
 * 创建登录二维码
 * @since Beta v0.10.3
 * @returns 二维码响应数据
 */
async function createQrLogin(): Promise<TGApp.BBS.GameLogin.GetLoginQrResponse> {
  const body = "{}";
  const resp = await TGHttps.post<TGApp.BBS.GameLogin.GetLoginQrResponse>(
    `${pAbu}account/ma-cn-passport/app/createQRLogin`,
    { headers: getQrHeaders(body), body },
  );
  return resp.data;
}

/**
 * 使用通行证 V2 接口将 stoken 换成指定凭证。
 * @since Beta v0.13.2
 * @param cookie - 当前账号的 stoken 与 mid
 * @param target - 目标凭证类型
 * @returns 换票响应
 */
async function exchangeWebToken(
  cookie: Pick<TGApp.App.Account.Cookie, "stoken" | "mid">,
  target: typeof TokenType.LToken | typeof TokenType.CookieToken,
): Promise<TokenExchangeResp> {
  if (!cookie.stoken || !cookie.mid) throw new Error("换票所需的 stoken 或 mid 缺失");
  const body = JSON.stringify({
    dst_token_type: target,
    src_token: { token: cookie.stoken, token_type: TokenType.SToken },
    mid: cookie.mid,
  }).replace(
    /[<>&='\u2028\u2029]/gu,
    (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"),
  );
  const time = Math.floor(Date.now() / 1000);
  const nonce = getRandomString(6);
  const digest = Md5.md5(`salt=${PASSPORT_DS_SALT}&t=${time}&r=${nonce}&b=${body}&q=`);
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    DS: `${time},${nonce},${digest}`,
    "user-agent": TGBbs.ua,
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-device_fp": encodeURIComponent(getDeviceInfo("device_fp")),
    "x-rpc-device_name": encodeURIComponent(getDeviceInfo("device_name")),
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_model": encodeURIComponent(getDeviceInfo("product")),
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-sys_version": "12",
    "x-rpc-sdk_version": PASSPORT_SDK_VERSION,
    "x-rpc-account_version": PASSPORT_SDK_VERSION,
    "x-rpc-lifecycle_id": PASSPORT_LIFECYCLE_ID,
  };
  const { data: response } = await TGHttps.post<TokenExchangeResp>(
    `${pAbu}account/ma-cn-session/app/exchange`,
    { headers, body },
  );
  const token = response.data?.token?.token;
  if (response.retcode === 0 && (typeof token !== "string" || !token.trim())) {
    throw new Error("通行证换票响应缺少有效凭证");
  }
  return response;
}

/**
 * 根据 stoken 换取 cookie_token_v2
 * @since Beta v0.13.2
 * @param cookie - Cookie
 * @returns V2 CookieToken 响应数据
 */
async function getCookieTokenBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.CookieTokenResp> {
  const response = await exchangeWebToken(cookie, TokenType.CookieToken);
  if (response.retcode !== 0) return <TGApp.BBS.Response.Base>response;
  return {
    retcode: 0,
    message: response.message,
    data: {
      cookie_token_v2: response.data.token.token,
      uid: String(response.data.user_info?.aid ?? cookie.account_id_v2),
    },
  };
}

/**
 * 根据 stoken 换取 ltoken_v2
 * @since Beta v0.13.2
 * @param cookie - Cookie
 * @returns V2 LToken 响应数据
 */
async function getLTokenBySToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.LTokenResp> {
  const response = await exchangeWebToken(cookie, TokenType.LToken);
  if (response.retcode !== 0) return <TGApp.BBS.Response.Base>response;
  return { retcode: 0, message: response.message, data: { ltoken_v2: response.data.token.token } };
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
 * @since Beta v0.12.5
 * @param ticket - 二维码 ticket
 * @returns 登录状态响应数据
 */
async function queryLoginStatus(
  ticket: string,
): Promise<TGApp.BBS.GameLogin.GetLoginStatusResponse> {
  const body = JSON.stringify({ ticket });
  const resp = await TGHttps.post<TGApp.BBS.GameLogin.GetLoginStatusResponse>(
    `${pAbu}account/ma-cn-passport/app/queryQRLoginStatus`,
    { headers: getQrHeaders(body), body },
  );
  return resp.data;
}

/**
 * 验证 ltoken_v2 有效性，返回 mid
 * @since Beta v0.13.2
 * @param cookie - 账户 cookie
 * @returns 验证响应数据
 */
async function verifyLToken(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Passport.VerifyLTokenResp> {
  const ck = { ltoken_v2: cookie.ltoken_v2, ltuid_v2: cookie.ltuid_v2, ltmid_v2: cookie.mid };
  const data = { ltoken: cookie.ltoken_v2 };
  const resp = await TGHttps.post<TGApp.BBS.Passport.VerifyLTokenResp>(
    `${p4Abu}account/ma-cn-session/web/verifyLtoken`,
    { headers: getRequestHeader(ck, "POST", data), body: data },
  );
  return resp.data;
}

const passportReq = {
  authTicket: createAuthTicketByGameBiz,
  cookieToken: getCookieTokenBySToken,
  lToken: { get: getLTokenBySToken, verify: verifyLToken },
  qrLogin: { create: createQrLogin, query: queryLoginStatus },
  captcha: { create: createLoginCaptcha, login: loginByMobileCaptcha },
};

export default passportReq;
