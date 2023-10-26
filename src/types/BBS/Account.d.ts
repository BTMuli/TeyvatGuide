/**
 * @file types/BBS/Account.d.ts
 * @description BBS 账户相关类型定义文件
 * @since Beta v0.3.4
 */

/**
 * @description 米游社账户信息
 * @since Beta v0.3.4
 * @namespace TGApp.BBS.Account
 * @memberof TGApp.BBS
 */
declare namespace TGApp.BBS.Account {
  /**
   * @description stoken 验证获取的用户信息
   * @interface VerifySTokenInfo
   * @since Alpha v0.1.5
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
  interface VerifySTokenInfo {
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
  interface getStokenByGameTokenInfo {
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

  /**
   * @description 通过 sToken 获取 actionTicket 返回数据里的用户信息
   * @interface getActionTicketBySTokenInfo
   * @since Beta v0.3.4
   * @property {boolean} is_realname 是否实名认证
   * @property {string} mobile 手机号
   * @property {string} safe_mobile 安全手机号
   * @property {string} account_id 账号 id
   * @property {string} account_name 账号名称
   * @property {string} email 邮箱
   * @property {boolean} is_email_verify 是否验证邮箱
   * @property {string} area_code 手机区号
   * @property {string} safe_area_code 安全手机区号
   * @property {string} real_name 真实姓名
   * @property {string} identity_code 身份证号
   * @property {string} create_time 创建时间
   * @property {string} create_ip 创建 ip
   * @property {string} change_pwd_time 修改密码时间
   * @property {string} nickname 昵称
   * @property {number} user_icon_id 用户头像 id
   * @property {number} safe_level 安全等级
   * @property {string} black_endtime 黑名单结束时间
   * @property {string} black_note 黑名单备注
   * @property {number} gender 性别
   * @property {number} real_stat 实名状态
   * @property {string} apple_name 苹果账号名称
   * @property {string} sony_name 索尼账号名称
   * @property {string} tap_name tap 账号名称
   * @property {string} reactivate_ticket 重新激活 ticket
   * @return getActionTicketBySTokenInfo
   */
  interface getActionTicketBySTokenInfo {
    is_realname: boolean;
    mobile: string;
    safe_mobile: string;
    account_id: string;
    account_name: string;
    email: string;
    is_email_verify: boolean;
    area_code: string;
    safe_area_code: string;
    real_name: string;
    identity_code: string;
    create_time: string;
    create_ip: string;
    change_pwd_time: string;
    nickname: string;
    user_icon_id: number;
    safe_level: number;
    black_endtime: string;
    black_note: string;
    gender: number;
    real_stat: number;
    apple_name: string;
    sony_name: string;
    tap_name: string;
    reactivate_ticket: string;
  }
}
