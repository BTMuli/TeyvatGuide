/**
 * @file plugins/Mys/request/doCaptchaLogin.ts
 * @description 通过短信验证码登录账号获取 stoken
 * @since Beta v0.5.1
 */

import { JSEncrypt } from "jsencrypt";

import showSnackbar from "../../../components/func/snackbar.js";
import TGHttp from "../../../utils/TGHttp.js";
import { getDeviceInfo } from "../../../utils/toolFunc.js";
import TGConstant from "../../../web/constant/TGConstant.js";

const PUB_KEY_STR = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDvekdPMHN3AYhm/vktJT+YJr7cI5DcsNKqdsx5DZX0gDuWFuIjzdwButrIYPNmRJ1G8ybDIF7oDW2eEpm5sMbL9zs
9ExXCdvqrn51qELbqj0XxtMTIpaCHFSI50PfPpTFV9Xt/hmyVwokoOXFlAEgCn+Q
CgGs52bFoYMtyi+xEQIDAQAB
-----END PUBLIC KEY-----`;
const encrypt = new JSEncrypt();
encrypt.setPublicKey(PUB_KEY_STR);

/**
 * @description rsa 加密
 * @since Beta v0.5.1
 * @param {string} data - 待加密数据
 * @returns {string} 加密后数据
 */
function rsaEncrypt(data: string): string {
  const res = encrypt.encrypt(data.toString());
  if (res === false) {
    showSnackbar.error("RSA 加密失败");
    return "";
  }
  return res;
}

/**
 * @description 获取短信验证码
 * @since Beta v0.5.1
 * @param {string} phone - 手机号
 * @param {string} [aigis] - 验证数据
 * @returns {Promise<TGApp.Plugins.Mys.CaptchaLogin.CaptchaData | TGApp.BBS.Response.Base>}
 */
export async function getCaptcha(
  phone: string,
  aigis?: string,
): Promise<TGApp.Plugins.Mys.CaptchaLogin.CaptchaData | TGApp.BBS.Response.BaseWithData> {
  const url = "https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/createLoginCaptcha";
  const device_fp = getDeviceInfo("device_fp");
  const device_name = getDeviceInfo("device_name");
  const device_id = getDeviceInfo("device_id");
  const device_model = getDeviceInfo("product");
  const body = { area_code: rsaEncrypt("+86"), mobile: rsaEncrypt(phone) };
  const header: Record<string, string> = {
    "x-rpc-aigis": aigis || "",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
    "x-rpc-device_fp": device_fp,
    "x-rpc-device_name": device_name,
    "x-rpc-device_id": device_id,
    "x-rpc-device_model": device_model,
    "user-agent": TGConstant.BBS.UA_MOBILE,
    "content-type": "application/json",
    referer: "https://user.miyoushe.com/",
    "x-rpc-game_biz": TGConstant.GAME_BIZ,
  };
  const resp = await TGHttp<
    TGApp.Plugins.Mys.CaptchaLogin.CaptchaResponse | TGApp.BBS.Response.Base
  >(
    url,
    {
      method: "POST",
      headers: header,
      body: JSON.stringify(body),
    },
    true,
  );
  const data = await resp.data;
  if (data.retcode !== 0) {
    return <TGApp.BBS.Response.BaseWithData>{
      retcode: data.retcode,
      message: data.message,
      data: resp.resp.headers.get("x-rpc-aigis"),
    };
  }
  return <TGApp.Plugins.Mys.CaptchaLogin.CaptchaData>data.data;
}

/**
 * @description 通过短信验证码登录
 * @since Beta v0.5.1
 * @param {string} phone - 手机号
 * @param {string} captcha - 验证码
 * @param {string} action_type - 操作类型
 * @param {string} [aigis] - 验证数据
 * @returns {Promise<TGApp.Plugins.Mys.CaptchaLogin.LoginData | TGApp.BBS.Response.Base>}
 */
export async function doCaptchaLogin(
  phone: string,
  captcha: string,
  action_type: string,
  aigis?: string,
): Promise<TGApp.Plugins.Mys.CaptchaLogin.LoginData | TGApp.BBS.Response.Base> {
  const url = "https://passport-api.mihoyo.com/account/ma-cn-passport/app/loginByMobileCaptcha";
  const device_fp = getDeviceInfo("device_fp");
  const device_name = getDeviceInfo("device_name");
  const device_id = getDeviceInfo("device_id");
  const device_model = getDeviceInfo("product");
  const body = {
    area_code: rsaEncrypt("+86"),
    mobile: rsaEncrypt(phone),
    action_type,
    captcha,
  };
  const header = {
    "x-rpc-aigis": aigis || "",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
    "x-rpc-device_fp": device_fp,
    "x-rpc-device_name": device_name,
    "x-rpc-device_id": device_id,
    "x-rpc-device_model": device_model,
    "user-agent": TGConstant.BBS.UA_MOBILE,
  };
  const resp = await TGHttp<TGApp.Plugins.Mys.CaptchaLogin.LoginResponse | TGApp.BBS.Response.Base>(
    url,
    {
      method: "POST",
      headers: header,
      body: JSON.stringify(body),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
