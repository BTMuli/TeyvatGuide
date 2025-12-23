/**
 * App 账号相关类型定义文件
 * @since Beta v0.6.0
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
   * 用户cookie
   * @since Beta v0.6.0
   */
  type Cookie = {
    /** 账号ID */
    account_id: string;
    /** Cookie Token */
    cookie_token: string;
    /** LongTime Token */
    ltoken: string;
    /** LongTime UID */
    ltuid: string;
    /** Mid */
    mid: string;
    /** SToken_v2 */
    stoken: string;
    /** STUid */
    stuid: string;
  };
}
