/**
 * Mys 插件 Game 登录类型定义文件
 * @since Beta v0.6.8
 */

declare namespace TGApp.BBS.GameLogin {
  /**
   * 获取登录二维码返回数据
   * @since Beta v0.3.0
   */
  type GetLoginQrResponse = TGApp.BBS.Response.BaseWithData & {
    /** 数据 */
    data: GetLoginQrData;
  };

  /**
   * 获取登录二维码数据
   * @since Beta v0.6.8
   */
  type GetLoginQrData = {
    /** 二维码 ticket，用于查询登录状态 */
    ticket: string;
    /** 二维码链接 */
    url: string;
  };

  /**
   * 获取登录状态返回数据
   * @since Beta v0.3.0
   */
  type GetLoginStatusResponse = TGApp.BBS.Response.BaseWithData & {
    /** 数据 */
    data: GetLoginStatusData;
  };

  /**
   * 获取登录状态通用字段
   * @since Beta v0.6.8
   */
  type GetLoginStatusDataCommon = {
    /** 应用 ID */
    app_id: string;
    /** 客户端类型 */
    client_type: number;
    /** 创建时间 */
    created_at: string;
    /** 扩展字段 */
    ext: string;
    /** 是否需要真人验证 */
    need_realperson: boolean;
    /** 实名信息 */
    realname_info: unknown;
    /** 扫码业务标识 */
    scan_game_biz: string;
    /** 扫描时间 */
    scanned_at: string;
  };

  /**
   * 获取登录状态数据（未确认）
   * @since Beta v0.6.8
   */
  type GetLoginStatusDataUnconfirmed = GetLoginStatusDataCommon & {
    /** 状态 */
    status: "Created" | "Scanned";
  };

  /**
   * 获取登录状态数据（已确认）
   * @since Beta v0.6.8
   */
  type GetLoginStatusDataConfirmed = GetLoginStatusDataCommon & {
    /** 状态 */
    status: "Confirmed";
    /** 登录凭证 */
    tokens: Array<GetLoginStatusDataToken>;
    /** 用户信息 */
    user_info: GetLoginStatusDataUserInfo;
  };

  /**
   * 登录状态返回的 token 信息
   * @since Beta v0.6.8
   */
  type GetLoginStatusDataToken = {
    /** token */
    token: string;
    /** token 类型 */
    token_type: number;
  };

  /**
   * 登录状态返回的用户信息
   * @since Beta v0.6.8
   */
  type GetLoginStatusDataUserInfo = {
    /** 账号名称 */
    account_name: string;
    /** 账号 ID */
    aid: string;
    /** 区域代码 */
    area_code: string;
    /** 国家 */
    country: string;
    /** 邮箱 */
    email: string;
    /** 身份证号 */
    identity_code: string;
    /** 是否验证邮箱 */
    is_email_verify: number;
    /** 链接信息 */
    links: Array<unknown>;
    /** mid */
    mid: string;
    /** 手机号 */
    mobile: string;
    /** 密码更新时间 */
    password_time: string;
    /** 真实姓名 */
    realname: string;
    /** 重新绑定区域代码 */
    rebind_area_code: string;
    /** 重新绑定手机号 */
    rebind_mobile: string;
    /** 重新绑定时间 */
    rebind_mobile_time: string;
    /** 安全区域代码 */
    safe_area_code: string;
    /** 安全手机号 */
    safe_mobile: string;
    /** 未屏蔽邮箱 */
    unmasked_email: string;
    /** 未屏蔽邮箱类型 */
    unmasked_email_type: number;
  };

  /**
   * 获取登录状态数据（联合类型）
   * @since Beta v0.6.8
   */
  type GetLoginStatusData = GetLoginStatusDataUnconfirmed | GetLoginStatusDataConfirmed;
}
