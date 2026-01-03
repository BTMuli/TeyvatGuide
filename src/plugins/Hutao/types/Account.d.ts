/**
 * 账号请求相关类型
 * @since Beta v0.9.1
 */

declare namespace TGApp.Plugins.Hutao.Account {
  /**
   * Passport 请求参数
   * @since Beta v0.9.1
   */
  type PassportReqParams = {
    /** 设备ID */
    DeviceId: string;
    /** 邮箱 */
    UserName: string | null;
    /**
     * 新邮箱
     * @remarks 用于账号迁移
     */
    NewUserName: string | null;
    /** 密码 */
    Password: string | null;
    /** 邮箱验证码 */
    VerifyCode: string | null;
    /**
     * 新邮箱验证码
     * @remarks 用于账号迁移
     */
    NewVerifyCode: string | null;
    /** 重置密码Flag */
    IsResetPassword: boolean;
    /** 校验邮箱Flag */
    IsResetUserName: boolean;
    /** 校验新邮箱Flag */
    IsResetNewUserName: boolean;
    /** 注销账号Flag */
    IsCancelRegistration: boolean;
  };

  /**
   * 登录请求响应
   * @since Beta v0.9.1
   */
  type LoginResp = TGApp.Plugins.Hutao.Base.Resp<LoginRes>;

  /**
   * 登录请求返回
   * @since Beta v0.9.1
   */
  type LoginRes = {
    /** token */
    AccessToken: string;
    /** expire */
    ExpiresIn: number;
    /** refresh */
    RefreshToken: string;
  };
}
