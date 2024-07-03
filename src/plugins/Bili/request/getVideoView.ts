/**
 * @file plugins/Bili/request/getVideoView.ts
 * @description Bili插件-获取视频基本信息
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";

/**
 * @description 获取视频基本信息
 * @since Beta v0.5.0
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
  const resp = await TGHttp<TGApp.Plugins.Bili.Video.ViewResponse>(url, {
    method: "GET",
  });
  return resp.data;
}

export default getVideoView;
