/**
 * @file plugins/Bili/request/getNav.ts
 * @description Bili 插件导航请求文件
 * @since Beta v0.4.0
 */

import { http } from "@tauri-apps/api";
import { Response } from "@tauri-apps/api/http";

/**
 * @description Bili 插件导航请求
 * @since Beta v0.4.0
 * @return {Promise<TGApp.Plugins.Bili.Nav.NavData>} Bili 插件导航请求返回
 */
async function getNav(): Promise<TGApp.Plugins.Bili.Nav.NavData> {
  const url = "https://api.bilibili.com/x/web-interface/nav";
  return await http.fetch(url).then((res: Response<TGApp.Plugins.Bili.Nav.NavResponse>) => {
    return res.data.data;
  });
}

export default getNav;
