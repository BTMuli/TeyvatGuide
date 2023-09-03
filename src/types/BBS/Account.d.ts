/**
 * @file types BBS Account.d.ts
 * @description BBS 账户相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

declare namespace TGApp.BBS.Account {
  /**
   * @description stoken 验证获取的用户信息
   * @interface VerifySTokenInfo
   * @since Alpha v0.1.5
   * @todo 添加 request 索引
   * @property {string} aid 账号 id
   * @property {string} mid mid
   * @property {string} account_name 账号名称
   * @property {string} email 邮箱
   * @property {number} is_email_verify 是否验证邮箱 // 0 未验证 1 已验证
   * @property {string} area_code 手机区号 // '+86'
   * @property {string} safe_mobile 手机号 // 部分明文，中间隐藏
   * @property {string} realname 真实姓名 // 最后一位明文，其他隐藏
   * @property {string} identity_code 身份证号 // 头尾三位明文，其他隐藏
   * @property {string} rebind_area_code 重新绑定手机区号
   * @property {string} rebind_mobile 重新绑定手机号
   * @property {string} rebind_mobile_time 重新绑定手机时间
   * @property {unknown[]} links 账号绑定信息
   * @return VerifySTokenInfo
   */
  export interface VerifySTokenInfo {
    aid: string;
    mid: string;
    account_name: string;
    email: string;
    is_email_verify: number;
    area_code: string;
    safe_mobile: string;
    realname: string;
    identity_code: string;
    rebind_area_code: string;
    rebind_mobile: string;
    rebind_mobile_time: string;
    links: unknown[];
  }

  /**
   * @description 通过 gameToken 获取 stoken 返回的用户信息
   * @interface getStokenByGameTokenInfo
   * @since Beta v0.3.0
   * @property {string} aid 账号 id
   * @property {string} mid mid
   * @property {string} account_name 账号名称
   * @property {string} email 邮箱
   * @property {number} is_email_verify 是否验证邮箱 // 0 未验证 1 已验证
   * @property {string} area_code 手机区号 // '+86'
   * @property {string} mobile 手机号 // 部分明文，中间隐藏
   * @property {string} safe_area_code 安全手机区号
   * @property {string} safe_mobile 安全手机号
   * @property {string} realname 真实姓名 // 最后一位明文，其他隐藏
   * @property {string} identity_code 身份证号 // 头尾三位明文，其他隐藏
   * @property {string} rebind_area_code 重新绑定手机区号
   * @property {string} rebind_mobile 重新绑定手机号
   * @property {string} rebind_mobile_time 重新绑定手机时间
   * @property {unknown[]} links 账号绑定信息
   * @property {string} country 国家
   * @return getStokenByGameTokenInfo
   */
  export interface getStokenByGameTokenInfo {
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
    links: unknown[];
    country: string;
  }
}
