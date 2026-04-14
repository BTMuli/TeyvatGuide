/**
 * Passport 相关类型定义
 * @since Beta v0.10.1
 */

declare namespace TGApp.BBS.Passport {
  /**
   * 获取 CookieToken 返回响应
   * @since Beta v0.10.1
   */
  type CookieTokenResp = TGApp.BBS.Response.BaseWithData<CookieTokenRes>;

  /**
   * 获取 CookieToken 返回数据
   * @since Beta v0.10.1
   */
  type CookieTokenRes = {
    /** 用户 UID */
    uid: string;
    /** CookieToken */
    cookie_token: string;
  };

  /**
   * 获取 LToken 返回响应
   * @since Beta v0.10.1
   */
  type LTokenResp = TGApp.BBS.Response.BaseWithData<LTokenRes>;

  /**
   * 获取 LToken 返回数据
   * @since Beta v0.10.1
   */
  type LTokenRes = {
    /** LToken */
    ltoken: string;
  };

  /**
   * 验证 LToken 返回响应
   * @since Beta v0.10.1
   */
  type VerifyLTokenResp = TGApp.BBS.Response.BaseWithData<VerifyLTokenRes>;

  /**
   * 验证 LToken 返回数据
   * @since Beta v0.10.1
   */
  type VerifyLTokenRes = {
    /** 实名信息 */
    realname_info: unknown;
    /** 是否需要真人验证 */
    need_realperson: boolean;
    /** 用户信息 */
    user_info: VerifyLTokenUserInfo;
  };

  /**
   * 验证 LToken 用户信息
   * @since Beta v0.10.1
   */
  type VerifyLTokenUserInfo = {
    /** 账号 ID */
    aid: string;
    /** mid */
    mid: string;
    /** 账号名称 */
    account_name: string;
    /** 邮箱 */
    email: string;
    /** 是否验证邮箱 */
    is_email_verify: number;
    /** 区域代码 */
    area_code: string;
    /** 安全手机号 */
    safe_mobile: string;
    /** 真实姓名 */
    realname: string;
    /** 身份证号 */
    identity_code: string;
    /** 重新绑定区域代码 */
    rebind_area_code: string;
    /** 重新绑定手机号 */
    rebind_mobile: string;
    /** 重新绑定时间 */
    rebind_mobile_time: string;
    /** 链接信息 */
    links: Array<unknown>;
  };
}
