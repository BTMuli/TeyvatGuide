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

  /**
   * 刷新Token返回响应
   * @since Beta v0.9.1
   */
  type RefreshTokenResp = TGApp.Plugins.Hutao.Base.Resp<RefreshTokenRes>;

  /**
   * 刷新Token返回
   * @since Beta v0.9.1
   */
  type RefreshTokenRes = LoginRes;

  /**
   * 信息返回响应
   * @since Beta v0.9.1
   */
  type InfoResp = TGApp.Plugins.Hutao.Base.Resp<InfoRes>;

  /**
   * 信息返回
   * @since Beta v0.9.1
   */
  type InfoRes = {
    /**
     * CDN 过期时间
     * @example 2025-09-18T01:01:39+00:00
     */
    CdnExpireAt: string;
    /**
     * 胡桃云祈愿过期时间
     * @remarks 与 CDN 过期时间格式一致
     */
    GachaLogExpireAt: string;
    /** 是否是开发者 */
    IsLicensedDeveloper: boolean;
    /** 是否是主开发 */
    IsMaintainer: boolean;
    /** 常规用户名 */
    NormalizedUserName: string;
    /** 用户名 */
    UserName: string;
  };

  /**
   * Verify接口请求参数
   * @since Beta v0.9.1
   * @remarks
   * - 同一邮箱同一类型验证码在 60 秒内只能申请一次，请在客户端进行节流处理。
   * - 若需要重置用户名，请分别提交旧邮箱与新邮箱两次请求以获取成对验证码。
   */
  type VerifyParams =
    | ResetPwdCodeParam
    | ResetUserNameCodeParam
    | ResetUserNameNewCodeParam
    | CancelRegCodeParam;

  /**
   * Verify接口Flag值
   * @since Beta v0.9.1
   */
  type VerifyFlags =
    | "IsResetPassword"
    | "IsResetUserName"
    | "IsResetUserNameNew"
    | "IsCancelRegistration";

  /**
   * Verify Flag 生成
   * @since Beta v0.9.1
   */
  type VerifyFlagGen<T extends VerifyFlags> = {
    [K in VerifyFlags]: K extends T ? true : false;
  };

  /**
   * 获取重设密码验证码参数
   * @since Beta v0.9.1
   */
  type ResetPwdCodeParam = {
    /** 用户名 */
    UserName: string;
  } & VerifyFlagGen<"IsResetPassword">;

  /**
   * 重设密码参数
   * @since Beta v0.9.1
   */
  type ResetPwdParams = ResetPwdCodeParam & {
    /** 密码 */
    Password: string;
    /** 验证码 */
    VerifyCode: string;
  };

  /**
   * 获取重设用户名验证码参数
   * @since Beta v0.9.1
   */
  type ResetUserNameCodeParam = {
    /** 用户名 */
    UserName: string;
  } & VerifyFlagGen<"IsResetUserName">;

  /**
   * 获取重设用户名-二次验证码参数
   * @since Beta v0.9.1
   */
  type ResetUserNameNewCodeParam = {
    /** 用户名 */
    UserName: string;
  } & VerifyFlagGen<"IsResetUserNameNew">;

  /**
   * 获取取消注册验证码参数
   * @since Beta v0.9.1
   */
  type CancelRegCodeParam = {
    /** 用户名 */
    UserName: string;
  } & VerifyFlagGen<"IsCancelRegistration">;
}
