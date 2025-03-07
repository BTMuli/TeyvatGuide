/**
 * @file types/BBS/CaptchaLogin.d.ts
 * @description 验证码登录类型声明
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.CaptchaLogin {
  /**
   * @description 获取短信验证码返回数据
   * @since Beta v0.7.2
   * @interface CaptchaResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {CaptchaRes} data 数据
   * @return GetCaptchaResponse
   */
  type CaptchaResp = TGApp.BBS.Response.BaseWithData<CaptchaRes>;

  /**
   * @description 获取短信验证码返回数据
   * @since Beta v0.7.2
   * @interface CaptchaRes
   * @property {string} sent_new 是否发送新验证码
   * @property {string} countdown 倒计时
   * @property {string} action_type 操作类型
   * @return CaptchaRes
   */
  type CaptchaRes = { sent_new: string; countdown: string; action_type: string };

  /**
   * @description 触发验证的序列化数据
   * @since Beta v0.7.2
   * @interface CaptchaAigis
   * @property {string} session_id 会话 id
   * @property {number} mmt_type mmt 类型
   * @see TGApp.BBS.Geetest.GeetestVerifyRes
   * @property {string} data 数据，为上面的序列化数据
   * @return CaptchaBody
   */
  type CaptchaAigis = { session_id: string; mmt_type: number; data: string };

  /**
   * @description 短信验证码登录返回数据
   * @since Beta v0.7.2
   * @interface LoginResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {LoginRes} data 数据
   * @return LoginResp
   */
  type LoginResp = TGApp.BBS.Response.BaseWithData<LoginRes>;

  /**
   * @description 短信验证码登录返回数据
   * @since Beta v0.7.2
   * @interface LoginRes
   * @property {Token} token token数据
   * @property {UserInfo} user_info 用户信息
   * @property {ReactivateInfo} reactivate_info 重新激活信息
   * @property {string} login_ticket 登录 ticket
   * @property {boolean} new_user 是否新用户
   * @property {RealnameInfo} realname_info 实名信息
   * @property {boolean} need_realperson 是否需要实名认证
   * @property {string} oauth_hw_open_id 华为 open id
   * @return LoginRes
   */
  type LoginRes = {
    token: Token;
    user_info: UserInfo;
    reactivate_info: ReactivateInfo;
    login_ticket: string;
    new_user: boolean;
    realname_info: RealnameInfo;
    need_realperson: boolean;
    oauth_hw_open_id: string;
  };

  /**
   * @description token 数据
   * @since Beta v0.7.2
   * @interface Token
   * @property {number} token_type token 类型
   * @property {string} token token
   * @return Token
   */
  type Token = { token_type: number; token: string };

  /**
   * @description 用户信息
   * @since Beta v0.7.2
   * @interface UserInfo
   * @property {string} aid 账号 id
   * @property {string} mid mid
   * @property {string} account_name 账号名称
   * @property {string} email 邮箱
   * @property {number} is_email_verify 是否验证邮箱
   * @property {string} area_code 手机区号
   * @property {string} mobile 手机号
   * @property {string} safe_area_code 安全手机区号
   * @property {string} safe_mobile 安全手机号
   * @property {string} realname 真实姓名
   * @property {string} identity_code 身份证号
   * @property {string} rebind_area_code 重新绑定手机区号
   * @property {string} rebind_mobile 重新绑定手机号
   * @property {string} rebind_mobile_time 重新绑定手机时间
   * @property {string[]} links 账号绑定信息
   * @property {string} country 国家
   * @property {string} unmasked_email 邮箱
   * @property {number} unmasked_email_type 邮箱类型
   * @return UserInfo
   */
  type UserInfo = {
    aid: string;
    mid: string;
    account_name: string;
    email: string;
    is_email_verify: number;
    area_code: string;
    mobile: string;
    safe_area_code: string;
    safe_mobile: string;
    realname: string;
    identity_code: string;
    rebind_area_code: string;
    rebind_mobile: string;
    rebind_mobile_time: string;
    links: string[];
    country: string;
    unmasked_email: string;
    unmasked_email_type: number;
  };

  /**
   * @description 重新激活信息
   * @since Beta v0.7.2
   * @interface ReactivateInfo
   * @property {boolean} required 是否需要重新激活
   * @property {string} ticket 重新激活 ticket
   * @return ReactivateInfo
   */
  type ReactivateInfo = { required: boolean; ticket: string };

  /**
   * @description 实名信息
   * @since Beta v0.7.2
   * @interface RealnameInfo
   * @property {boolean} required 是否需要实名认证
   * @property {string} action_type 操作类型
   * @property {string} action_ticket 操作 ticket
   * @return RealnameInfo
   */
  type RealnameInfo = { required: boolean; action_type: string; action_ticket: string };
}
