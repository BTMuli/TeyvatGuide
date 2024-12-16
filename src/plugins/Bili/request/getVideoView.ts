/**
 * @file plugins/Bili/request/getVideoView.ts
 * @description Bili插件-获取视频基本信息
 * @since Beta v0.5.0
 */

import headerBili from "@Bili/utils/getHeader.js";
import getWrid from "@Bili/utils/getWrid.js";

import TGHttp from "@/utils/TGHttp.js";
import TGLogger from "@/utils/TGLogger.js";

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
  const url = "https://api.bilibili.com/x/web-interface/wbi/view";
  let params: Record<string, string | number | boolean> = { need_view: 1, isGaiaAvoided: true };
  if (aid) params.aid = aid;
  if (bvid) params.bvid = bvid;
  if (!aid && !bvid) throw new Error("aid和bVid不能同时为空");
  const wrid = await getWrid(params);
  params = { ...params, wts: wrid[0], w_rid: wrid[1] };
  try {
    const resp = await TGHttp<TGApp.Plugins.Bili.Video.ViewResponse>(url, {
      method: "GET",
      query: params,
      headers: headerBili,
    });
    return resp.data;
  } catch (error) {
    if (error instanceof Error) await TGLogger.Error(`获取视频基本信息失败: ${error.message}`);
    else await TGLogger.Error(`获取视频基本信息失败: ${error}`);
  }
  throw new Error("获取视频基本信息失败");
}

export default getVideoView;
