/**
 * @file plugins/Mys/utils/doGameLogin
 * @description 获取 gameToken，曲线获取 stoken
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";

const device = crypto.randomUUID();

/**
 * @description 获取登录二维码
 * @since Beta v0.3.0
 * @returns {Promise<TGApp.Plugins.Mys.GameLogin.GetLoginQrData|TGApp.BBS.Response.Base>}
 */
export async function getLoginQr(): Promise<
  TGApp.Plugins.Mys.GameLogin.GetLoginQrData | TGApp.BBS.Response.Base
> {
  const url = "https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch";
  const data = {
    app_id: "4",
    device,
  };
  return await http
    .fetch<TGApp.Plugins.Mys.GameLogin.GetLoginQrResponse | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode === 0) return res.data.data;
      return <TGApp.BBS.Response.Base>res.data;
    });
}

/**
 * @description 获取登录状态
 * @since Beta v0.3.0
 * @param {string} ticket 二维码 ticket
 * @returns {Promise<TGApp.Plugins.Mys.GameLogin.GetLoginStatusData | TGApp.BBS.Response.Base>}
 */
export async function getLoginStatus(
  ticket: string,
): Promise<TGApp.Plugins.Mys.GameLogin.GetLoginStatusData | TGApp.BBS.Response.Base> {
  const url = "https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/query";
  const data = { app_id: "4", device, ticket };
  return await http
    .fetch<TGApp.Plugins.Mys.GameLogin.GetLoginStatusResponse | TGApp.BBS.Response.Base>(url, {
      method: "POST",
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode === 0) return res.data.data;
      return <TGApp.BBS.Response.Base>res.data;
    });
}
