/**
 * @file plugins Mys types GameLogin.d.ts
 * @description Mys 插件 Game 登录类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

/**
 * @description Mys 插件 Game 登录类型
 * @since Beta v0.3.0
 * @namespace GameLogin
 * @return GameLogin
 */
declare namespace TGApp.Plugins.Mys.GameLogin {
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
   * @property {string} url 二维码链接
   * @return GetLoginQrData
   */
  export interface GetLoginQrData {
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
   * @property {string} stat 状态 // Init: 未扫码，Scanned: 已扫码，Confirmed: 已确认
   * @property {StatusPayload} payload 状态数据
   * @return GetLoginStatusData
   */
  export interface GetLoginStatusData {
    stat: string;
    payload: StatusPayload;
  }

  /**
   * @description 获取登录状态返回数据
   * @since Beta v0.3.0
   * @interface StatusPayload
   * @property {string} ext 未知
   * @property {string} proto 未知
   * @property {string} raw 序列化数据，反序列化后是 {uid: string, token: string}
   * @return StatusPayload
   */
  export interface StatusPayload {
    ext: string;
    proto: string;
    raw: string;
  }

  /**
   * @description 反序列化后的登录状态数据
   * @since Beta v0.3.0
   * @interface StatusPayloadRaw
   * @property {string} uid 用户 UID
   * @property {string} token 用户 token
   * @return StatusPayloadRaw
   */
  export interface StatusPayloadRaw {
    uid: string;
    token: string;
  }
}
