/**
 * @file plugins/Bili/request/getVideoView.ts
 * @description Bili插件-获取视频基本信息
 * @since Beta v0.4.0
 */

import { http } from "@tauri-apps/api";
import type { Response } from "@tauri-apps/api/http";

/**
 * @description 获取视频基本信息
 * @since Beta v0.4.0
 * @param {string} [aid] 视频AV号
 * @param {string} [bvid] 视频BV号
 * @returns {Promise<TGApp.Plugins.Bili.Video.ViewData>} 视频基本信息
 */
async function getVideoView(
  aid?: string,
  bvid?: string,
): Promise<TGApp.Plugins.Bili.Video.ViewData> {
  let url = "https://api.bilibili.com/x/web-interface/view?";
  if (aid) {
    url += `aid=${aid}`;
  } else if (bvid) {
    url += `bvid=${bvid}`;
  } else {
    throw new Error("参数错误");
  }
  return await http
    .fetch(url, { method: "GET" })
    .then((res: Response<TGApp.Plugins.Bili.Video.ViewResponse>) => {
      return res.data.data;
    });
}

export default getVideoView;
