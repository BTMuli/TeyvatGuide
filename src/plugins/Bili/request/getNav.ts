/**
 * @file plugins/Bili/request/getNav.ts
 * @description Bili 插件导航请求文件
 * @since Beta v0.5.0
 */

import TGHttp from "@/utils/TGHttp.js";

/**
 * @description Bili 插件导航请求
 * @since Beta v0.5.0
 * @return {Promise<TGApp.Plugins.Bili.Nav.NavData>} Bili 插件导航请求返回
 */
async function getNav(): Promise<TGApp.Plugins.Bili.Nav.NavData> {
  const url = "https://api.bilibili.com/x/web-interface/nav";
  const resp = await TGHttp<TGApp.Plugins.Bili.Nav.NavResponse>(url, { method: "GET" });
  return resp.data;
}

export default getNav;
