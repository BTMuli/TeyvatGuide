/**
 * @file types/BBS/Response.d.ts
 * @description BBS 返回数据类型定义文件
 * @since Beta v0.3.4
 */

/**
 * @description BBS 返回数据类型定义
 * @since Beta v0.3.4
 * @namespace TGApp.BBS.Response
 * @memberof TGApp.BBS
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
  interface Base {
    retcode: Pick<number, 0>;
    message: string;
    data: never;
  }

  /**
   * @description 获取 ltoken 跟 stoken 的响应数据返回
   * @interface getTokensRes
   * @since Alpha v0.1.5
   * @property {string} name - token 名称
   * @property {string} token - token 值
   * @return getTokensRes
   */
  interface getTokensRes {
    name: string;
    token: string;
  }

  /**
   * @description 获取 ltoken 跟 stoken 的响应数据
   * @interface getTokens
   * @since Alpha v0.1.5
   * @extends Base
   * @property {getTokensRes[]} data.list - token 列表
   * @return getTokens
   */
  interface getTokens extends Base {
    retcode: 0;
    data: {
      list: getTokensRes[];
    };
  }

  /**
   * @description 根据 stoken 获取 ltoken 的响应数据
   * @interface getLTokenBySToken
   * @since Alpha v0.1.5
   * @extends Base
   * @property {string} data.ltoken - ltoken 值
   * @return getLTokenBySToken
   */
  interface getLTokenBySToken extends Base {
    retcode: 0;
    data: {
      ltoken: string;
    };
  }

  /**
   * @description 根据 stoken 获取 cookie_token 的响应数据
   * @interface getCookieTokenBySToken
   * @since Alpha v0.1.5
   * @extends Base
   * @property {string} data.uid - 用户 uid
   * @property {string} data.cookie_token - cookie_token 值
   * @return getCookieTokenBySToken
   */
  interface getCookieTokenBySToken extends Base {
    retcode: 0;
    data: {
      uid: string;
      cookie_token: string;
    };
  }

  /**
   * @description 通过 stoken 验证用户信息的返回类型
   * @interface verifyUserInfoBySToken
   * @since Alpha v0.1.5
   * @extends Base
   * @property {TGApp.BBS.Account.VerifySTokenInfo} data.user_info - 用户信息
   * @property {unknown} data.realname_info - 实名信息
   * @property {boolean} data.need_realperson - 是否需要实名认证
   * @return verifyUserInfoBySToken
   */
  interface verifyUserInfoBySToken extends Base {
    retcode: 0;
    data: {
      user_info: TGApp.BBS.Account.VerifySTokenInfo;
      realname_info: unknown;
      need_realperson: boolean;
    };
  }

  /**
   * @description 通过 gameToken 获取 stoken 的返回类型
   * @interface getStokenByGameToken
   * @since Beta v0.3.0
   * @extends Base
   * @property {getStokenByGameTokenData} data - 返回数据
   * @return getStokenByGameToken
   */
  interface getStokenByGameToken extends Base {
    retcode: 0;
    data: getStokenByGameTokenData;
  }

  /**
   * @description 通过 gameToken 获取 stoken 的返回类型数据
   * @interface getStokenByGameTokenData
   * @since Beta v0.3.0
   * @property {number} token.token_type - token 类型
   * @property {string} token.token - token 值
   * @property {TGApp.BBS.Account.getStokenByGameTokenInfo} user_info - 用户信息
   * @property {unknown} realname_info - 实名信息
   * @property {boolean} need_realperson - 是否需要实名认证
   * @return getStokenByGameToken
   */
  interface getStokenByGameTokenData {
    token: {
      token_type: number;
      token: string;
    };
    user_info: TGApp.BBS.Account.getStokenByGameTokenInfo;
    realname_info: unknown;
    need_realperson: boolean;
  }

  /**
   * @description 通过 gameToken 获取 cookie_token 的返回类型
   * @interface getCookieTokenByGameToken
   * @since Beta v0.3.0
   * @extends Base
   * @property {string} data.uid - 用户 uid
   * @property {string} data.cookie_token - cookie_token 值
   * @return getCookieTokenByGameToken
   */
  interface getCookieTokenByGameToken extends Base {
    retcode: 0;
    data: {
      uid: string;
      cookie_token: string;
    };
  }

  /**
   * @description 通过 sToken 获取 actionTicket 的返回类型
   * @interface getActionTicketBySToken
   * @since Beta v0.3.4
   * @extends Base
   * @property {string} data.ticket - actionTicket 值
   * @property {boolean} data.is_verified - 是否验证
   * @property {TGApp.BBS.Account.getActionTicketBySTokenInfo} data.account_info - 用户信息
   * @return getActionTicketBySToken
   */
  interface getActionTicketBySToken extends Base {
    retcode: 0;
    data: {
      ticket: string;
      is_verified: boolean;
      account_info: TGApp.BBS.Account.getActionTicketBySTokenInfo;
    };
  }
}
