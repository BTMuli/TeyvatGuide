/**
 * @file plugins/Bili/request/getVideoUrl.ts
 * @description Bili 插件视频请求文件
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import getWrid from "../utils/getWrid.js";

/**
 * @description 获取视频播放地址
 * @since Beta v0.5.0
 * @see https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#dash%E6%A0%BC%E5%BC%8F
 * @param {string} bvid 视频BV号
 * @param {number} cid 视频分P号
 * @returns {Promise<TGApp.Plugins.Bili.Video.UrlData>} 视频播放地址
 */
async function getVideoUrl(cid: number, bvid: string): Promise<TGApp.Plugins.Bili.Video.UrlData> {
  const url = "https://api.bilibili.com/x/player/playurl";
  let params: Record<string, string> = {
    bvid,
    cid: cid.toString(),
    fnval: "16",
    platform: "pc",
  };
  const wridRes = await getWrid(params);
  params = {
    ...params,
    wts: wridRes[0],
    wrid: wridRes[1],
  };
  const resp = await TGHttp<TGApp.Plugins.Bili.Video.UrlResponse>(url, {
    method: "GET",
    query: params,
    referrer: "https://www.bilibili.com/",
  });
  return resp.data;
}

export default getVideoUrl;
