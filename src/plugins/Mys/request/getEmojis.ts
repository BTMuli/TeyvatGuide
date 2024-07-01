/**
 * @file plugins/Mys/request/getEmojis.ts
 * @description Mys 表情包请求函数集合
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

/**
 * @description 获取表情包列表
 * @since Beta v0.3.0
 * @return {Promise<Record<string,string>|TGApp.BBS.Response.Base>}
 */
export async function getEmojis(): Promise<Record<string, string> | TGApp.BBS.Response.Base> {
  const url = "https://bbs-api-static.miyoushe.com/misc/api/emoticon_set";
  return await http
    .fetch(url)
    .then((res: Response<TGApp.Plugins.Mys.Emoji.Response | TGApp.BBS.Response.Base>) => {
      if (res.data.retcode === 0) {
        const emojis: Record<string, string> = {};
        res.data.data.list.forEach((series) => {
          series.list.forEach((emoji) => {
            emojis[emoji.name] = emoji.icon;
          });
        });
        return emojis;
      }
      return res.data;
    });
}
