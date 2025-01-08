/**
 * @file types/BBS/GameLogin.d.ts
 * @description Mys 插件 Game 登录类型定义文件
 * @since Beta v0.6.8
 */

declare namespace TGApp.BBS.GameLogin {
  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.3.0
   * @interface GetLoginQrResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {GetLoginQrData} data 数据
   * @return GetLoginQrResponse
   */
  type GetLoginQrResponse = TGApp.BBS.Response.BaseWithData & { data: GetLoginQrData };

  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.6.8
   * @interface GetLoginQrData
   * @property {string} ticket 二维码 ticket，用于查询登录状态
   * @property {string} url 二维码链接
   * @return GetLoginQrData
   */
  type GetLoginQrData = { ticket: string; url: string };

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.3.0
   * @interface GetLoginStatusResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {GetLoginStatusData} data 数据
   * @return GetLoginStatusResponse
   */
  type GetLoginStatusResponse = TGApp.BBS.Response.BaseWithData & { data: GetLoginStatusData };

  /**
   * @description 获取登录状态返回数据-通用
   * @since Beta v0.6.8
   * @interface GetLoginStatusDataCommon
   * @property {string} app_id 应用 ID
   * @property {number} client_type 客户端类型
   * @property {string} created_at 创建时间
   * @property {string} ext 未知
   * @property {boolean} need_realperson 是否需要真人验证
   * @property {unknown} realname_info 未知
   * @property {string} scan_game_biz 未知
   * @property {string} scanned_at 扫描时间
   * @return GetLoginStatusDataCommon
   */
  type GetLoginStatusDataCommon = {
    app_id: string;
    client_type: number;
    created_at: string;
    ext: string;
    need_realperson: boolean;
    realname_info: unknown;
    scan_game_biz: string;
    scanned_at: string;
  };

  /**
   * @description 获取登录状态返回数据-未确认
   * @since Beta v0.6.8
   * @interface GetLoginStatusDataUnconfirmed
   * @extends GetLoginStatusDataCommon
   * @property {"Created" | "Scanned"} status 状态
   * @return GetLoginStatusDataUnconfirmed
   */
  type GetLoginStatusDataUnconfirmed = GetLoginStatusDataCommon & {
    status: "Created" | "Scanned";
  };

  /**
   * @description 获取登录状态返回数据-已确认
   * @since Beta v0.6.8
   * @interface GetLoginStatusDataConfirmed
   * @extends GetLoginStatusDataCommon
   */
  type GetLoginStatusDataConfirmed = GetLoginStatusDataCommon & {
    status: "Confirmed";
    tokens: Array<GetLoginStatusDataToken>;
    user_info: GetLoginStatusDataUserInfo;
  };

  /**
   * @description 获取登录状态返回数据-Token
   * @since Beta v0.6.8
   * @interface GetLoginStatusDataToken
   * @property {string} token token
   * @property {number} token_type token 类型
   * @return GetLoginStatusDataToken
   */
  type GetLoginStatusDataToken = { token: string; token_type: number };

  /**
   * @description 获取登录状态返回数据-用户信息
   * @since Beta v0.6.8
   * @interface GetLoginStatusDataUserInfo
   * @property {string} account_name 账号名称
   * @property {string} aid 账号 ID
   * @property {string} area_code 区域代码
   * @property {string} country 国家
   * @property {string} email 邮箱
   * @property {string} identity_code 身份证号
   * @property {number} is_email_verify 是否验证邮箱
   * @property {Array<unknown>} links 链接
   * @property {string} mid mid
   * @property {string} mobile 手机号
   * @property {string} password_time 密码时间
   * @property {string} realname 真实姓名
   * @property {string} rebind_area_code 重新绑定区域代码
   * @property {string} rebind_mobile 重新绑定手机号
   * @property {string} rebind_mobile_time 重新绑定手机号时间
   * @property {string} safe_area_code 安全区域代码
   * @property {string} safe_mobile 安全手机号
   * @property {string} unmasked_email 未屏蔽邮箱
   * @property {number} unmasked_email_type 未屏蔽邮箱类型
   * @return GetLoginStatusDataUserInfo
   */
  type GetLoginStatusDataUserInfo = {
    account_name: string;
    aid: string;
    area_code: string;
    country: string;
    email: string;
    identity_code: string;
    is_email_verify: number;
    links: Array<unknown>;
    mid: string;
    mobile: string;
    password_time: string;
    realname: string;
    rebind_area_code: string;
    rebind_mobile: string;
    rebind_mobile_time: string;
    safe_area_code: string;
    safe_mobile: string;
    unmasked_email: string;
    unmasked_email_type: number;
  };

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.6.8
   * @interface GetLoginStatusData
   * @property {GetLoginStatusDataUnconfirmed | GetLoginStatusDataConfirmed} data 数据
   * @return GetLoginStatusData
   */
  type GetLoginStatusData = GetLoginStatusDataUnconfirmed | GetLoginStatusDataConfirmed;
}
