/**
 * 账号相关请求
 * @since Beta v0.9.1
 */

import TGHttp from "@utils/TGHttp.js";
import { importPublicKey, sha1 } from "rsa-oaep-encryption";

import { getReqHeader } from "../utils/authUtils.js";

/** 加密公钥 */
const HUTAO_PUB_KEY: Readonly<string> = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5W2SEyZSlP2zBI1Sn8Gd
TwbZoXlUGNKyoVrY8SVYu9GMefdGZCrUQNkCG/Np8pWPmSSEFGd5oeug/oIMtCZQ
NOn0drlR+pul/XZ1KQhKmj/arWjN1XNok2qXF7uxhqD0JyNT/Fxy6QvzqIpBsM9S
7ajm8/BOGlPG1SInDPaqTdTRTT30AuN+IhWEEFwT3Ctv1SmDupHs2Oan5qM7Y3uw
b6K1rbnk5YokiV2FzHajGUymmSKXqtG1USZzwPqImpYb4Z0M/StPFWdsKqexBqMM
mkXckI5O98GdlszEmQ0Ejv5Fx9fR2rXRwM76S4iZTfabYpiMbb4bM42mHMauupj6
9QIDAQAB
-----END PUBLIC KEY-----`;
const encrypt = importPublicKey(HUTAO_PUB_KEY);

const PassportUrl = "https://homa.gentle.house/Passport/v2/";

/**
 * rsa 加密
 * @since Beta v0.9.1
 * @param data - 待加密数据
 * @returns 加密后数据
 */
function rsaEncrypt(data: string): string {
  const res = encrypt.encrypt(data, sha1.create());
  const bytes = new Uint8Array(res);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 登录
 * @since Beta v0.9.1
 * @param username - 用户名（邮箱）
 * @param password - 密码
 * @returns
 */
export async function loginPassport(
  username: string,
  password: string,
): Promise<TGApp.Plugins.Hutao.Account.LoginRes | TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${PassportUrl}Login`;
  const data = {
    UserName: rsaEncrypt(username),
    Password: rsaEncrypt(password),
  };
  const header = await getReqHeader();
  const resp = await TGHttp<TGApp.Plugins.Hutao.Account.LoginResp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.Plugins.Hutao.Base.Resp>resp;
  return resp.data;
}
