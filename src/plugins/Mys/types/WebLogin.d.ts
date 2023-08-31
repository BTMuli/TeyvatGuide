/**
 * @file plugins Mys types WebLogin.d.ts
 * @description Mys 插件 Web 登录类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

/**
 * @description Mys 插件 Web 登录类型
 * @since Beta v0.3.0
 * @namespace WebLogin
 * @return WebLogin
 */
declare namespace TGApp.Plugins.Mys.WebLogin {
  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.3.0
   * @interface GetLoginQrResponse
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {GetLoginQrData} data 数据
   * @return GetLoginQrResponse
   */
  export interface GetLoginQrResponse extends TGApp.Plugins.Mys.Base.Response {
    data: GetLoginQrData;
  }

  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.3.0
   * @interface GetLoginQrData
   * @property {string} ticket 二维码票据
   * @property {string} url 二维码链接
   * @return GetLoginQrData
   */
  export interface GetLoginQrData {
    ticket: string;
    url: string;
  }

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.3.0
   * @interface GetLoginStatusResponse
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {GetLoginStatusData} data 数据
   * @return GetLoginStatusResponse
   */
  export interface GetLoginStatusResponse extends TGApp.Plugins.Mys.Base.Response {
    data: GetLoginStatusData;
  }

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.3.0
   * @interface GetLoginStatusData
   * @property {string} app_id 应用 ID
   * @property {number} client_type 客户端类型
   * @property {string} created_at 创建时间
   * @property {boolean} need_realperson 是否需要人机验证
   * @property {RealNameInfo} realname_info 实名信息
   * @property {string} scanned_at 扫码时间
   * @property {string} status 状态
   * @property {unknown[]} tokens 令牌
   * @property {UserInfo} user_info 用户信息
   * @return GetLoginStatusData
   */
  export interface GetLoginStatusData {
    app_id: string;
    client_type: number;
    created_at: string;
    need_realperson: boolean;
    realname_info: RealNameInfo;
    scanned_at: string;
    status: string;
    tokens: unknown[];
    user_info: UserInfo;
  }

  /**
   * @description 实名信息
   * @since Beta v0.3.0
   * @interface RealNameInfo
   * @property {string} action_ticket 动作票据
   * @property {string} action_type 动作类型
   * @property {boolean} required 是否必须
   * @return RealNameInfo
   */
  interface RealNameInfo {
    action_ticket: string;
    action_type: string;
    required: boolean;
  }

  /**
   * @description 用户信息
   * @since Beta v0.3.0
   * @interface UserInfo
   * @property {string} account_name 账户名
   * @property {string} aid 账户 ID
   * @property {string} area_code 区域代码
   * @property {string} country 国家
   * @property {string} email 邮箱 // 为加密后的邮箱包含 * 号
   * @property {string} identity_code 身份证号 // 为加密后的身份证号包含 * 号
   * @property {number} is_email_verify 是否邮箱验证 // 1 为已验证
   * @property {unknown[]} links 链接
   * @property {string} mid 用户 ID
   * @property {string} mobile 手机号 // 为加密后的手机号包含 * 号
   * @property {string} realname 真实姓名 // 为加密后的真实姓名包含 * 号
   * @property {string} rebind_area_code 重新绑定区域代码
   * @property {string} rebind_mobile 重新绑定手机号
   * @property {string} rebind_mobile_time 重新绑定手机号时间
   * @property {string} safe_area_code 安全区域代码
   * @property {string} safe_mobile 安全手机号
   * @return UserInfo
   */
  interface UserInfo {
    account_name: string;
    aid: string;
    area_code: string;
    country: string;
    email: string;
    identity_code: string;
    is_email_verify: number;
    links: unknown[];
    mid: string;
    mobile: string;
    realname: string;
    rebind_area_code: string;
    rebind_mobile: string;
    rebind_mobile_time: string;
    safe_area_code: string;
    safe_mobile: string;
  }
}
