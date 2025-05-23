/**
 * @file plugins/Bili/request/getNav.ts
 * @description Bili 插件导航请求文件
 * @since Beta v0.5.7
 */

import headerBili from "@Bili/utils/getHeader.js";
import TGHttp from "@utils/TGHttp.js";

/**
 * @description Bili 插件导航请求
 * @since Beta v0.5.7
 * @return {Promise<TGApp.Plugins.Bili.Nav.Data>} Bili 插件导航请求返回
 */
async function getNav(): Promise<TGApp.Plugins.Bili.Nav.Data> {
  const url = "https://api.bilibili.com/x/web-interface/nav";
  const resp = await TGHttp<TGApp.Plugins.Bili.Nav.Response>(url, {
    method: "GET",
    headers: headerBili,
  });
  return resp.data;
}

export default getNav;
