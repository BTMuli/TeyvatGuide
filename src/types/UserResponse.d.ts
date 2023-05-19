/**
 * @file types UserResponse.d.ts
 * @description 用户请求返回相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace BTMuli.User.Response {
  /**
	 * @description token 列表项
	 * @since Alpha v0.2.0
	 * @see Tokens
	 * @interface TokenItem
	 * @property {string} name token 名称
	 * @property {string} token token 值
	 * @returns {TokenItem}
	 */
  export interface TokenItem {
    name: string
    token: string
  }
  /**
	 * @description 获取 ltoken 跟 stoken 的响应
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.byLoginTicket.getTokens
	 * @interface Tokens
	 * @extends {BTMuli.Genshin.Base.Response}
	 * @property {TokenItem[]} data.list token 列表
	 * @returns {Tokens}
	 */
  export interface Tokens extends BTMuli.Genshin.Base.Response {
    data: {
      list: TokenItem[]
    }
  }
  /**
	 * @description 根据 stoken 获取 ltoken
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.byLoginTicket.getLToken
	 * @interface LToken extends BTMuli.Genshin.Base.Response
	 * @property {string} data.ltoken
	 * @returns {LToken}
	 */
  export interface LToken extends BTMuli.Genshin.Base.Response {
    data: {
      ltoken: string
    }
  }
  /**
	 * @description 根据 stoken 获取 cookie_token
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.bySToken.getCookieToken
	 * @interface CookieToken extends BTMuli.Genshin.Base.Response
	 * @property {string} data.uid 用户 uid
	 * @property {string} data.cookie_token cookie_token
	 * @returns {CookieToken}
	 */
  export interface CookieToken extends BTMuli.Genshin.Base.Response {
    data: {
      uid: string
      cookie_token: string
    }
  }
  /**
	 * @description 验证 stoken 的用户信息
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.bySToken.verify
	 * @interface VerifyUserInfo
	 * @property {string} aid 账号 id
	 * @property {string} mid mid
	 * @property {string} account_name 账号名称
	 * @property {string} email 邮箱
	 * @property {number} is_email_verify 是否验证邮箱 // 0 未验证 1 已验证
	 * @property {string} area_code 手机区号 // '+86'
	 * @property {string} safe_mobile 手机号 // 部分明文，中间隐藏
	 * @property {string} realname 真实姓名 // 最后一位明文，其他隐藏
	 * @property {string} identity_code 身份证号 // 头尾三位明文，其他隐藏
	 * @property {string} rebind_area_code 重新绑定手机区号
	 * @property {string} rebind_mobile 重新绑定手机号
	 * @property {string} rebind_mobile_time 重新绑定手机时间
	 * @property {unknown[]} links 账号绑定信息
	 * @returns {VerifyUserInfo}
	 */
  export interface VerifyUserInfo {
    aid: string
    mid: string
    account_name: string
    email: string
    is_email_verify: number
    area_code: string
    safe_mobile: string
    realname: string
    identity_code: string
    rebind_area_code: string
    rebind_mobile: string
    rebind_mobile_time: string
    links: unknown[]
  }
  /**
	 * @description 验证 stoken 的响应
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.bySToken.verify
	 * @interface Verify extends BTMuli.Genshin.Base.Response
	 * @property {VerifyUserInfo} data.user_info 用户信息
	 * @property {unknown} data.realname_info 实名信息
	 * @property {boolean} need_realperson 是否需要实名认证
	 * @returns {Verify}
	 */
  export interface Verify extends BTMuli.Genshin.Base.Response {
    data: {
      user_info: VerifyUserInfo
      realname_info: unknown | null
      need_realperson: boolean
    }
  }
  /**
	 * @description 获取游戏账号的响应
	 * @since Alpha v0.2.0
	 * @see TGRequest.User.byCookie.getGameAccounts
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
