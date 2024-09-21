/**
 * @file types/App/Account.d.ts
 * @description App 账号相关类型定义文件
 * @since Beta v0.6.0
 */

/**
 * @description 应用账户类型声明
 * @since Beta v0.6.0
 * @namespace TGApp.App.Account
 * @memberof TGApp.App
 */
declare namespace TGApp.App.Account {
  /**
   * @description 用户数据
   * @since Beta v0.6.0
   * @interface User
   * @property {string} uid - 米社UID
   * @property {BriefInfo} brief - 简略信息
   * @property {Cookie} cookie - 用户cookie
   * @property {string} updated - 更新时间
   * @returns User
   */
  interface User {
    uid: string;
    brief: BriefInfo;
    cookie: Cookie;
    updated: string;
  }

  /**
   * @description 用户简略信息
   * @since Alpha v0.2.0
   * @interface BriefInfo
   * @property {string} nickname 用户昵称
   * @property {string} uid 用户 uid
   * @property {string} avatar 用户头像
   * @property {string} desc 用户简介
   * @return BriefInfo
   */
  interface BriefInfo {
    nickname: string;
    uid: string;
    avatar: string;
    desc: string;
  }

  /**
   * @description 用户cookie
   * @since Beta v0.6.0
   * @interface Cookie
   * @property {string} account_id 账号 ID
   * @property {string} cookie_token Cookie Token
   * @property {string} ltoken LToken
   * @property {string} ltuid LTUID
   * @property {string} mid MID
   * @property {string} stoken SToken_v2
   * @return Cookie
   */
  interface Cookie {
    account_id: string;
    cookie_token: string;
    ltoken: string;
    ltuid: string;
    mid: string;
    stoken: string;
    stuid: string;
  }
}
