/**
 * BBS 认证相关类型定义
 * @since Beta v0.10.1
 */

declare namespace TGApp.BBS.Auth {
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
