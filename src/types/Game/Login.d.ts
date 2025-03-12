/**
 * @file types/Game/Login.d.ts
 * @description 扫码登录模块类型定义文件
 * @since Beta v0.7.0
 */

declare namespace TGApp.Game.Login {
  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.7.0
   * @interface QrResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {QrRes} data 数据
   * @return QrResp
   */
  type QrResp = TGApp.BBS.Response.BaseWithData & { data: QrRes };

  /**
   * @description 获取登录二维码返回数据
   * @since Beta v0.7.0
   * @interface QrRes
   * @property {string} url 二维码链接
   * @return QrRes
   */
  type QrRes = { url: string };

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.7.0
   * @interface StatusResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {StatusRes} data 数据
   * @return StatusResp
   */
  type StatusResp = TGApp.BBS.Response.BaseWithData & { data: StatusRes };

  /**
   * @description 二维码状态
   * @since Beta v0.7.0
   * @interface QrStatus
   * @return QrStatus
   */
  type QrStatus = "Init" | "Scanned" | "Confirmed";

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.7.0
   * @interface StatusRes
   * @property {string} stat 状态 // Init: 未扫码，Scanned: 已扫码，Confirmed: 已确认
   * @property {string} payload 状态数据
   * @return StatusRes
   */
  type StatusRes = { stat: QrStatus; payload: StatusPayload };

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.7.0
   * @interface StatusPayload
   * @property {string} ext 未知
   * @property {string} proto 未知
   * @property {string} raw 序列化数据，反序列化后是 StatusPayloadRaw
   * @return StatusPayload
   */
  type StatusPayload = { ext: string; proto: string; raw: string };

  /**
   * @description 反序列化后的登录状态数据
   * @since Beta v0.7.0
   * @interface StatusPayloadRaw
   * @property {string} uid 用户 UID
   * @property {string} token 用户 token
   * @return StatusPayloadRaw
   */
  type StatusPayloadRaw = { uid: string; token: string };

  /**
   * @description GameToken获取Stoken返回
   * @since Beta v0.7.2
   * @interface StResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {StRes} data 数据
   * @return StResp
   */
  type StResp = TGApp.BBS.Response.BaseWithData<StRes>;

  /**
   * @description GameToken获取Stoken返回数据
   * @since Beta v0.7.2
   * @interface StRes
   * @property {TGApp.BBS.GameLogin.GetLoginStatusDataToken} token token
   * @property {TGApp.BBS.GameLogin.GetLoginStatusDataUserInfo} user_info 用户信息
   * @property {unknown} realname_info 未知
   * @property {boolean} need_realperson 是否需要真人验证
   * @return StRes
   */
  type StRes = {
    token: TGApp.BBS.GameLogin.GetLoginStatusDataToken;
    user_info: TGApp.BBS.GameLogin.GetLoginStatusDataUserInfo;
    realname_info: unknown;
    need_realperson: boolean;
  };
}
