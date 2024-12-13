/**
 * @file plugins/Mys/request/getEmojis.ts
 * @description Mys 表情包请求函数集合
 * @since Beta v0.5.0
 */

import TGHttp from "@/utils/TGHttp.js";

/**
 * @description 获取表情包列表
 * @since Beta v0.5.0
 * @return {Promise<Record<string,string>|TGApp.BBS.Response.Base>}
 */
export async function getEmojis(): Promise<Record<string, string> | TGApp.BBS.Response.Base> {
  const url = "https://bbs-api-static.miyoushe.com/misc/api/emoticon_set";
  const resp = await TGHttp<TGApp.Plugins.Mys.Emoji.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  const emojis: Record<string, string> = {};
  for (const series of resp.data.list) {
    for (const emoji of series.list) {
      emojis[emoji.name] = emoji.icon;
    }
  }
  return emojis;
}
