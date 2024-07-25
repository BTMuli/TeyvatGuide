/**
 * @file plugins/Mys/request/doCaptchaLogin.ts
 * @description 通过短信验证码登录账号获取 stoken
 * @since Beta v0.5.1
 */

import { publicEncrypt } from "node:crypto";

import TGHttp from "../../../utils/TGHttp.js";
import { getDeviceInfo } from "../../../utils/toolFunc.js";
import TGConstant from "../../../web/constant/TGConstant.js";

const PUB_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDvekdPMHN3AYhm/vktJT+YJr7cI5DcsNK
qdsx5DZX0gDuWFuIjzdwButrIYPNmRJ1G8ybDIF7oDW2eEpm5sMbL9zs9ExXCdvqrn51qELb
qj0XxtMTIpaCHFSI50PfPpTFV9Xt/hmyVwokoOXFlAEgCn+QCgGs52bFoYMtyi+xEQIDAQAB
-----END PUBLIC KEY-----`;
const EncryptAreaCode = rsaEncrypt("+86");

/**
 * @description rsa 加密
 * @since Beta v0.5.1
 * @param {string} data - 待加密数据
 * @returns {string} 加密后数据
 */
function rsaEncrypt(data: string): string {
  const buffer = Buffer.from(data);
  return publicEncrypt(PUB_KEY, buffer).toString("base64");
}

/**
 * @description 获取短信验证码
 * @since Beta v0.5.1
 * @todo retcode 为-3101时，表示需要进行验证，需要从resp.headers["x-rpc-aigis"]中获取相关数据
 * @param {string} phone - 手机号
 * @returns {Promise<TGApp.Plugins.Mys.CaptchaLogin.CaptchaData | TGApp.BBS.Response.Base>}
 */
export async function getCaptcha(
  phone: string,
): Promise<TGApp.Plugins.Mys.CaptchaLogin.CaptchaData | TGApp.BBS.Response.Base> {
  const url = "https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/createLoginCaptcha";
  const device_fp = getDeviceInfo("device_fp");
  const device_name = getDeviceInfo("device_name");
  const device_id = getDeviceInfo("device_id");
  const device_model = getDeviceInfo("product");
  const body = { area: EncryptAreaCode, phone: rsaEncrypt(phone) };
  const header = {
    "x-rpc-aigis": "",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
    "x-rpc-device_fp": device_fp,
    "x-rpc-device_name": device_name,
    "x-rpc-device_id": device_id,
    "x-rpc-device_model": device_model,
  };
  const resp = await TGHttp<
    TGApp.Plugins.Mys.CaptchaLogin.CaptchaResponse | TGApp.BBS.Response.Base
  >(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 通过短信验证码登录
 * @since Beta v0.5.1
 * @param {string} phone - 手机号
 * @param {string} action_type - 操作类型
 * @param {string} captcha - 验证码
 * @returns {Promise<TGApp.Plugins.Mys.CaptchaLogin.LoginData | TGApp.BBS.Response.Base>}
 */
export async function doCaptchaLogin(
  phone: string,
  action_type: string,
  captcha: string,
): Promise<TGApp.Plugins.Mys.CaptchaLogin.LoginData | TGApp.BBS.Response.Base> {
  const url = "https://passport-api.mihoyo.com/account/ma-cn-passport/app/loginByMobileCaptcha";
  const device_fp = getDeviceInfo("device_fp");
  const device_name = getDeviceInfo("device_name");
  const device_id = getDeviceInfo("device_id");
  const device_model = getDeviceInfo("product");
  const body = {
    area: EncryptAreaCode,
    phone: rsaEncrypt(phone),
    action_type,
    captcha,
  };
  const header = {
    "x-rpc-aigis": "",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "2",
    "x-rpc-app_id": TGConstant.BBS.APP_ID,
    "x-rpc-device_fp": device_fp,
    "x-rpc-device_name": device_name,
    "x-rpc-device_id": device_id,
    "x-rpc-device_model": device_model,
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
