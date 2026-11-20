/**
 * App 账号相关类型定义文件
 * @since Beta v0.13.2
 */

declare namespace TGApp.App.Account {
  /**
   * 用户数据
   * @since Beta v0.6.0
   */
  type User = {
    /** 米社UID */
    uid: string;
    /** 用户信息 */
    brief: BriefInfo;
    /** 用户Cookie */
    cookie: Cookie;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户简略信息
   * @since Alpha v0.2.0
   */
  type BriefInfo = {
    /** 用户昵称 */
    nickname: string;
    /** 米社UID */
    uid: string;
    /** 用户头像 */
    avatar: string;
    /* 简介 */
    desc: string;
  };

  /**
   * 米游社网页 V2 Cookie 与原生登录凭据
   * @since Beta v0.13.2
   */
  type Cookie = {
    /** 账号ID */
    account_id_v2: string;
    /** Cookie Token */
    cookie_token_v2: string;
    /** LongTime Token */
    ltoken_v2: string;
    /** LongTime UID */
    ltuid_v2: string;
    /** Mid */
    mid: string;
    /** SToken_v2 */
    stoken: string;
    /** STUid */
    stuid: string;
  };

  /**
   * LToken V2 请求 Cookie
   * @since Beta v0.13.2
   */
  type LoginCookie = Pick<Cookie, "ltoken_v2" | "ltuid_v2"> & { ltmid_v2: string };

  /**
   * 签到凭据子集
   * @since Beta v0.13.0
   */
  type SignCookie = Pick<Cookie, "stoken" | "stuid" | "mid">;

  /**
   * CookieToken V2 请求 Cookie
   * @since Beta v0.13.2
   */
  type CookieTokenCookie = Pick<Cookie, "account_id_v2" | "cookie_token_v2"> & {
    account_mid_v2: string;
  };

  /**
   * 帖子编辑器凭据子集
   * @since Beta v0.13.2
   */
  type EditorCookie = Pick<Cookie, "ltoken_v2" | "ltuid_v2" | "stoken" | "stuid" | "mid">;

  /**
   * 带 UID 校验的签到凭据子集
   * @since Beta v0.13.2
   */
  type SignUidCookie = Pick<Cookie, "ltuid_v2" | "stoken" | "stuid" | "mid">;

  /**
   * 获取当前刷新账号返回
   * @since Beta v0.9.9
   */
  type RfAc = {
    /** 账号 */
    account: TGApp.Sqlite.Account.Game;
    /** Cookie */
    cookie: Cookie;
  };
}
