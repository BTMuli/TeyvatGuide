/**
 * BBS 认证相关类型定义
 * @since Beta v0.11.3
 */

declare namespace TGApp.BBS.Auth {
  /**
   * Salt 键
   * @since Beta v0.11.3
   */
  const SaltKey = <const>{
    K2: "K2",
    LK2: "LK2",
    X4: "X4",
    X6: "X6",
    PROD: "PROD",
  };

  /**
   * Salt 键枚举
   * @since Beta v0.11.3
   */
  type SaltKeyEnum = (typeof SaltKey)[keyof typeof SaltKey];

  /**
   * ActionTicket 数据
   * @since Beta v0.10.1
   */
  type ActionTicketData = {
    /** action_ticket */
    ticket: string;
  };

  /**
   * ActionTicket 响应
   * @since Beta v0.10.1
   */
  type ActionTicketResp = TGApp.BBS.Response.BaseWithData<ActionTicketData>;

  /**
   * AuthKey 数据
   * @since Beta v0.10.1
   */
  type AuthKeyData = {
    /** 签名类型 */
    sign_type: number;
    /** authKey 版本 */
    authkey_ver: number;
    /** authKey */
    authkey: string;
  };

  /**
   * AuthKey 响应
   * @since Beta v0.10.1
   */
  type AuthKeyResp = TGApp.BBS.Response.BaseWithData<AuthKeyData>;
}
