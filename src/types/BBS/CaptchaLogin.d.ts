/**
 * 验证码登录类型声明
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.CaptchaLogin {
  /**
   * 获取短信验证码返回数据
   * @since Beta v0.7.2
   */
  type CaptchaResp = TGApp.BBS.Response.BaseWithData<CaptchaRes>;

  /**
   * 短信验证码响应数据
   * @since Beta v0.7.2
   */
  type CaptchaRes = {
    /** 是否发送新验证码 */
    sent_new: string;
    /** 倒计时 */
    countdown: string;
    /** 操作类型 */
    action_type: string;
  };

  /**
   * 触发验证的序列化数据
   * @since Beta v0.7.2
   * @see TGApp.BBS.Geetest.GeetestVerifyRes
   */
  type CaptchaAigis = {
    /** 会话 ID */
    session_id: string;
    /** mmt 类型 */
    mmt_type: number;
    /** 序列化数据 */
    data: string;
  };

  /**
   * 短信验证码登录返回数据
   * @since Beta v0.7.2
   */
  type LoginResp = TGApp.BBS.Response.BaseWithData<LoginRes>;

  /**
   * 登录响应数据
   * @since Beta v0.7.2
   */
  type LoginRes = {
    /** token 数据 */
    token: Token;
    /** 用户信息 */
    user_info: UserInfo;
    /** 重新激活信息 */
    reactivate_info: ReactivateInfo;
    /** 登录 ticket */
    login_ticket: string;
    /** 是否新用户 */
    new_user: boolean;
    /** 实名信息 */
    realname_info: RealnameInfo;
    /** 是否需要实名认证 */
    need_realperson: boolean;
    /** 华为 open id */
    oauth_hw_open_id: string;
  };

  /**
   * token 数据
   * @since Beta v0.7.2
   */
  type Token = {
    /** token 类型 */
    token_type: number;
    /** token 值 */
    token: string;
  };

  /**
   * 用户信息
   * @since Beta v0.7.2
   */
  type UserInfo = {
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
    /** 手机区号 */
    area_code: string;
    /** 手机号 */
    mobile: string;
    /** 安全手机区号 */
    safe_area_code: string;
    /** 安全手机号 */
    safe_mobile: string;
    /** 真实姓名 */
    realname: string;
    /** 身份证号 */
    identity_code: string;
    /** 重新绑定手机区号 */
    rebind_area_code: string;
    /** 重新绑定手机号 */
    rebind_mobile: string;
    /** 重新绑定手机时间 */
    rebind_mobile_time: string;
    /** 账号绑定信息 */
    links: Array<string>;
    /** 国家 */
    country: string;
    /** 未屏蔽邮箱 */
    unmasked_email: string;
    /** 未屏蔽邮箱类型 */
    unmasked_email_type: number;
  };

  /**
   * 重新激活信息
   * @since Beta v0.7.2
   */
  type ReactivateInfo = {
    /** 是否需要重新激活 */
    required: boolean;
    /** 重新激活 ticket */
    ticket: string;
  };

  /**
   * 实名信息
   * @since Beta v0.7.2
   */
  type RealnameInfo = {
    /** 是否需要实名认证 */
    required: boolean;
    /** 操作类型 */
    action_type: string;
    /** 操作 ticket */
    action_ticket: string;
  };
}
