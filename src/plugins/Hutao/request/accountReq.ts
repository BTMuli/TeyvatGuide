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
 * @returns 登录返回
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
 * @returns 令牌返回
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
 * @returns 用户信息返回
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

/**
 * 获取充值密码验证码
 * @since Beta v0.9.1
 * @param username - 用户
 * @returns 验证码返回
 */
export async function getResetPwdCode(username: string): Promise<TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${PassportUrl}Verify`;
  const header = await getReqHeader();
  const data: TGApp.Plugins.Hutao.Account.ResetPwdCodeParam = {
    UserName: rsaEncrypt(username),
    IsCancelRegistration: false,
    IsResetPassword: true,
    IsResetUserName: false,
    IsResetUserNameNew: false,
  };
  const resp = await TGHttp<TGApp.Plugins.Hutao.Base.Resp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  console.log(resp);
  return resp;
}

/**
 * 重置密码
 * @since Beta v0.9.1
 * @param username - 用户
 * @param code - 验证码
 * @param pwd - 密码
 * @returns 重置密码返回
 */
export async function resetPwd(
  username: string,
  code: string,
  pwd: string,
): Promise<TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${PassportUrl}ResetPassword`;
  const header = await getReqHeader();
  const data: TGApp.Plugins.Hutao.Account.ResetPwdParams = {
    UserName: rsaEncrypt(username),
    Password: rsaEncrypt(pwd),
    VerifyCode: rsaEncrypt(code),
    IsCancelRegistration: false,
    IsResetPassword: true,
    IsResetUserName: false,
    IsResetUserNameNew: false,
  };
  const resp = await TGHttp<TGApp.Plugins.Hutao.Base.Resp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  console.log(resp);
  return resp;
}
