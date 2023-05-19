/**
 * @file web api Passport.ts
 * @description 定义 Passport API
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

const PassportApi = "https://passport-api.mihoyo.com/"; // 基础 API
const PassportV4Api = "https://passport-api-v4.mihoyo.com/"; // 基础 API
const PassportAuthApi = `${PassportApi}account/auth/api/`; // 认证 API

export const PassportTokenApi = `${PassportAuthApi}getLTokenBySToken`; // 根据 stoken 获取 ltoken
export const PassportCookieTokenApi = `${PassportAuthApi}getCookieAccountInfoBySToken`; // 根据 Cookie 获取 Token
export const PassportVerifyApi = `${PassportV4Api}account/ma-cn-session/web/verifyLtoken`; // 验证 stoken 有效性
