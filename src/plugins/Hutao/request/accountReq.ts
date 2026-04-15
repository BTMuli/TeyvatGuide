/**
 * 账号相关请求
 * @since Beta v0.10.1
 */

import TGHttps from "@utils/TGHttps.js";

import { getReqHeader, rsaEncrypt } from "../utils/authUtils.js";

const PassportUrl = "https://homa.gentle.house/Passport/v2/";

/**
 * 登录
 * @since Beta v0.10.1
 * @param username - 用户名（邮箱）
 * @param password - 密码
 * @returns 登录响应
 */
async function login(
  username: string,
  password: string,
): Promise<TGApp.Plugins.Hutao.Account.LoginResp> {
  const url = `${PassportUrl}Login`;
  const data = {
    UserName: rsaEncrypt(username),
    Password: rsaEncrypt(password),
  };
  const header = await getReqHeader();
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Account.LoginResp>(url, {
    headers: header,
    body: data,
  });
  return resp.data;
}

/**
 * 刷新访问令牌
 * @since Beta v0.10.1
 * @param token - 刷新令牌
 * @returns 令牌响应
 */
async function refresh(token: string): Promise<TGApp.Plugins.Hutao.Account.RefreshTokenResp> {
  const url = `${PassportUrl}RefreshToken`;
  const header = await getReqHeader();
  const data = { RefreshToken: rsaEncrypt(token) };
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Account.RefreshTokenResp>(url, {
    headers: header,
    body: data,
  });
  return resp.data;
}

/**
 * 获取用户信息
 * @since Beta v0.10.1
 * @param token - 访问令牌
 * @returns 用户信息响应
 */
async function info(token: string): Promise<TGApp.Plugins.Hutao.Account.InfoResp> {
  const url = `${PassportUrl}UserInfo`;
  const header = await getReqHeader(token);
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Account.InfoResp>(url, {
    headers: header,
  });
  return resp.data;
}

/**
 * 获取重置密码验证码
 * @since Beta v0.10.1
 * @param username - 用户名
 * @returns 验证码响应
 */
async function verifyPwd(username: string): Promise<TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${PassportUrl}Verify`;
  const header = await getReqHeader();
  const data: TGApp.Plugins.Hutao.Account.ResetPwdCodeParam = {
    UserName: rsaEncrypt(username),
    IsCancelRegistration: false,
    IsResetPassword: true,
    IsResetUserName: false,
    IsResetUserNameNew: false,
  };
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Base.Resp>(url, {
    headers: header,
    body: data,
  });
  return resp.data;
}

/**
 * 重置密码
 * @since Beta v0.10.1
 * @param username - 用户名
 * @param code - 验证码
 * @param pwd - 新密码
 * @returns 重置密码响应
 */
async function resetPwd(
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
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Base.Resp>(url, {
    headers: header,
    body: data,
  });
  return resp.data;
}

const _ = "Not Implemented";

const AccountReq = {
  register: _,
  login,
  refresh,
  verify: {
    username: _,
    usernameNew: _,
    pwd: verifyPwd,
    cancel: _,
  },
  cancel: _,
  reset: {
    username: _,
    pwd: resetPwd,
  },
  info,
};

export default AccountReq;
