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
   * @property {string} login_ticket 登录凭证
   * @property {string} login_uid 登录 UID
   * @property {string} DEVICEFP 设备指纹
   * @returns Cookie
   */
  export interface Cookie {
    login_ticket: string
    login_uid: string
    DEVICEFP: string
  }

  /**
   * @description 游戏 Token
   * @since Alpha v0.2.0
   * @interface TokenItem
   * @property {TokenType} name 游戏 Token 名称
   * @property {string} token 游戏 Token
   * @returns TokenItem
   */
  export interface TokenItem {
    name: TokenType
    token: string
  }

  /**
   * @description 游戏 Token 类型
   * @since Alpha v0.2.0
   * @enum {string}
   * @property {string} ltoken longTime Token
   * @property {string} stoken shortTime Token
   * @returns string
   */
  export enum TokenType {
    LToken = "ltoken",
    SToken = "stoken",
  }
}

declare namespace BTMuli.User.Response {
  /**
   * @description 获取 ltoken 跟 stoken 的响应
   * @since Alpha v0.2.0
   * @interface Token
   * @extends {BTMuli.Genshin.Base.Response}
   * @property {TokenItem[]} data.list 游戏 Token
   * @returns {Token}
   */
  export interface Token extends BTMuli.Genshin.Base.Response {
    data: {
      list: TokenItem[]
    }
  }
  /**
   * @description 获取游戏账号的响应
   * @since Alpha v0.2.0
   * @interface GameAccounts
   * @extends {BTMuli.Genshin.Base.Response}
   * @property {BTMuli.User.Game.Account[]} data.list 游戏账号
   * @returns {GameAccounts}
   */
  export interface GameAccounts extends BTMuli.Genshin.Base.Response {
    data: {
      list: BTMuli.User.Game.Account[]
    }
  }
}
