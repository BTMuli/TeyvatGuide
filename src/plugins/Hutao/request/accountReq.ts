/**
 * 账号相关请求
 * @since Beta v0.9.1
 */

import TGHttp from "@utils/TGHttp.js";

import { getReqHeader, rsaEncrypt } from "../utils/authUtils.js";

const PassportUrl = "https://homa.gentle.house/Passport/v2/";

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
  return <TGApp.Plugins.Hutao.Account.LoginRes>resp.data;
}

/**
 * 刷新访问令牌
 * @since Beta v0.9.1
 */
export async function refreshToken(token: string) {
  const url = `${PassportUrl}RefreshToken`;
  const header = await getReqHeader();
  const data = { RefreshToken: rsaEncrypt(token) };
  const resp = await TGHttp<TGApp.Plugins.Hutao.Account.RefreshTokenResp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.Plugins.Hutao.Base.Resp>resp;
  return <TGApp.Plugins.Hutao.Account.RefreshTokenRes>resp.data;
}

/**
 * 获取用户信息
 * @since Beta v0.9.1
 */
export async function getUserInfo(
  token: string,
): Promise<TGApp.Plugins.Hutao.Account.InfoRes | TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${PassportUrl}UserInfo`;
  const header = await getReqHeader(token);
  const resp = await TGHttp<TGApp.Plugins.Hutao.Account.InfoResp>(url, {
    method: "GET",
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.Plugins.Hutao.Base.Resp>resp;
  return <TGApp.Plugins.Hutao.Account.InfoRes>resp.data;
}
