/**
 * @file types BBS Tokens.d.ts
 * @description BBS 返回数据类型定义文件
 * @todo 视情况看看要不要拆分
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.BBS.Response {
  /**
   * @description 基础返回类型，设计米游社接口请求都是这个类型
   * @interface Base
   * @since Alpha v0.1.5
   * @property {number} retcode - 响应代码
   * @property {string} message - 响应消息
   * @property {any} data - 响应数据
   * @return Base
   */
  export interface Base {
    retcode: number
    message: string
    data: any
  }

  /**
   * @description 获取 ltoken 跟 stoken 的响应数据返回
   * @interface getTokensRes
   * @since Alpha v0.1.5
   * @property {string} name - token 名称
   * @property {string} token - token 值
   * @return getTokensRes
   */
  export interface getTokensRes {
    name: string
    token: string
  }

  /**
   * @description 获取 ltoken 跟 stoken 的响应数据
   * @interface getTokens
   * @since Alpha v0.1.5
   * @todo 添加 request 索引
   * @extends Base
   * @property {getTokensRes[]} data.list - token 列表
   * @return getTokens
   */
  export interface getTokens extends Base {
    data: {
      list: getTokensRes[]
    }
  }

  /**
   * @description 根据 stoken 获取 ltoken 的响应数据
   * @interface getLTokenBySToken
   * @since Alpha v0.1.5
   * @todo 添加 request 索引
   * @extends Base
   * @property {string} data.ltoken - ltoken 值
   * @return getLTokenBySToken
   */
  export interface getLTokenBySToken extends Base {
    data: {
      ltoken: string
    }
  }

  /**
   * @description 根据 stoken 获取 cookie_token 的响应数据
   * @interface getCookieTokenBySToken
   * @since Alpha v0.1.5
   * @todo 添加 request 索引
   * @extends Base
   * @property {string} data.uid - 用户 uid
   * @property {string} data.cookie_token - cookie_token 值
   * @return getCookieTokenBySToken
   */
  export interface getCookieTokenBySToken extends Base {
    data: {
      uid: string
      cookie_token: string
    }
  }

  /**
   * @description 通过 stoken 验证用户信息的返回类型
   * @interface verifyUserInfoBySToken
   * @since Alpha v0.1.5
   * @todo 添加 request 索引
   * @extends Base
   * @property {TGApp.BBS.Account.VerifySTokenInfo} data.user_info - 用户信息
   * @property {unknown} data.realname_info - 实名信息 // todo: 未知类型
   * @property {boolean} data.need_realperson - 是否需要实名认证
   * @return verifyUserInfoBySToken
   */
  export interface verifyUserInfoBySToken extends Base {
    data: {
      user_info: TGApp.BBS.Account.VerifySTokenInfo
      realname_info: unknown
      need_realperson: boolean
    }
  }
}
