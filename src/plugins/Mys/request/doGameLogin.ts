/**
 * @file plugins/Mys/request/doGameLogin
 * @description 获取 gameToken，曲线获取 stoken
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import { getDeviceInfo } from "../../../utils/toolFunc.js";
import { getRequestHeader } from "../../../web/utils/getRequestHeader.js";

const APP_ID = 8;

/**
 * @description 获取登录二维码
 * @since Beta v0.5.0
 * @returns {Promise<TGApp.Plugins.Mys.GameLogin.GetLoginQrData|TGApp.BBS.Response.Base>}
 */
export async function getLoginQr(): Promise<
  TGApp.Plugins.Mys.GameLogin.GetLoginQrData | TGApp.BBS.Response.Base
> {
  const data: Record<string, string | number> = {
    app_id: APP_ID,
    device: getDeviceInfo("device_id"),
  };
  const resp = await TGHttp<
    TGApp.Plugins.Mys.GameLogin.GetLoginQrResponse | TGApp.BBS.Response.Base
  >("https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch", {
    method: "POST",
    headers: getRequestHeader({}, "POST", data),
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取登录状态
 * @since Beta v0.5.0
 * @param {string} ticket 二维码 ticket
 * @returns {Promise<TGApp.Plugins.Mys.GameLogin.GetLoginStatusData | TGApp.BBS.Response.Base>}
 */
export async function getLoginStatus(
  ticket: string,
): Promise<TGApp.Plugins.Mys.GameLogin.GetLoginStatusData | TGApp.BBS.Response.Base> {
  const data: Record<string, string | number> = {
    app_id: APP_ID,
    device: getDeviceInfo("device_id"),
    ticket,
  };
  const resp = await TGHttp<
    TGApp.Plugins.Mys.GameLogin.GetLoginStatusResponse | TGApp.BBS.Response.Base
  >("https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/query", {
    method: "POST",
    headers: getRequestHeader({}, "POST", data),
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
