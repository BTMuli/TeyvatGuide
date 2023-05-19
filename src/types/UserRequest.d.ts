/**
 * @file types UserRequest.d.ts
 * @description 用户请求相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace BTMuli.User.Base {
  /**
   * @description 用户 cookie 类型
   * @since Alpha v0.2.0
   * @description 这边只写了需要的，其他的可以自行添加
   * @interface Cookie
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
   * @todo 目前只完成 mid 的获取，stoken_v2 的获取还没完成
   * @property {string} stokenV2 stoken_v2
   * @property {string} mid mid
   * @returns Cookie
   */
  export interface Cookie {
    login_ticket: string
    login_uid: string
    account_id: string
    cookie_token: string
    ltoken: string
    ltuid: string
    mid: string
    stoken: string
    stoken_v2?: string
    stuid: string
  }
}
