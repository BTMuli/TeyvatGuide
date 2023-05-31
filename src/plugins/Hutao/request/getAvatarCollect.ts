/**
 * @file plugins Hutao request getAvatarCollect.ts
 * @description 获取角色搭配数据
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 获取角色搭配数据
 * @since Alpha v0.2.0
 * @return {Promise<TGApp.Plugins.Hutao.AbyssAvatarCollocation[]>}
 */
async function getAvatarCollect (): Promise<TGApp.Plugins.Hutao.AbyssAvatarCollocation[]> {
  const url = HutaoApi.Abyss.avatar.collect;
  return await http.fetch<TGApp.Plugins.Hutao.AbyssAvatarCollocationResponse>(url, {
    method: "GET",
  }).then((res) => {
    return res.data.data;
  });
}

export default getAvatarCollect;
