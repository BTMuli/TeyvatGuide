/**
 * @file types/BBS/Constant.d.ts
 * @description BBS 常量相关类型定义文件
 * @since Alpha v0.1.6
 */

declare namespace TGApp.BBS.Constant {
  /**
   * @description 用户 Cookie 类型
   * @interface Cookie
   * @since Alpha v0.1.5
   * @description 这边只写了需要的，其他的可以自行添加
   * @description login_ticket 与 login_uid 一起使用
   * @see TGRequest.User.byLoginTicket.getTokens
   * @property {string} login_ticket 登录凭证
   * @property {string} login_uid 登录 uid
   * @description account_id 与 cookie_token 一起使用
   * @see TGRequest.User.byCookie.getAccounts
   * @property {string} account_id 账号 id
   * @property {string} cookie_token cookie token
   * @description ltoken 与 ltuid 一起使用
   * @see TGRequest.User.byLToken.verify
   * @property {string} ltoken ltoken
   * @property {string} ltuid ltoken 对应的 uid
   * @description stoken 与 stuid 一起使用，这是旧版本的 token
   * @see TGRequest.User.bySToken.getCookieToken
   * @property {string} stoken stoken
   * @property {string} stuid stoken 对应的 uid
   * @description stoken_v2 与 mid 一起使用，这是新版本的 token
   * @see https://github.com/BTMuli/TeyvatGuide/issues/18
   * @property {string} stoken_v2 stoken_v2
   * @property {string} mid mid
   * @return Cookie
   */
  interface Cookie {
    login_ticket: string;
    login_uid: string;
    account_id: string;
    cookie_token: string;
    ltoken: string;
    ltuid: string;
    mid: string;
    stoken: string;
    stuid: string;
    stoken_v2?: string;
  }

  /**
   * @description cookie 组合-1
   * @interface CookieGroup1
   * @since Alpha v0.1.6
   * @property {string} login_ticket 登录凭证
   * @property {string} login_uid 登录 uid
   * @return CookieGroup1
   */
  interface CookieGroup1 {
    login_ticket: string;
    login_uid: string;
  }

  /**
   * @description cookie 组合-2
   * @interface CookieGroup2
   * @since Alpha v0.1.6
   * @property {string} account_id 账号 id
   * @property {string} cookie_token cookie token
   * @return CookieGroup2
   */
  interface CookieGroup2 {
    account_id: string;
    cookie_token: string;
  }

  /**
   * @description cookie 组合-3
   * @interface CookieGroup3
   * @since Alpha v0.1.6
   * @property {string} ltoken ltoken
   * @property {string} ltuid ltoken 对应的 uid
   * @return CookieGroup3
   */
  interface CookieGroup3 {
    ltoken: string;
    ltuid: string;
  }

  /**
   * @description cookie 组合-4
   * @interface CookieGroup4
   * @since Alpha v0.1.6
   * @extends CookieGroup2
   * @extends CookieGroup3
   * @return CookieGroup4
   */
  interface CookieGroup4 extends CookieGroup2, CookieGroup3 {}
}
