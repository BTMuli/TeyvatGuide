/**
 * Bili 插件视频请求文件
 * @since Beta v0.5.0
 */

import headerBili from "@Bili/utils/getHeader.js";
import getWrid from "@Bili/utils/getWrid.js";
import TGHttp from "@utils/TGHttp.js";

/**
 * 获取视频播放地址
 * @since Beta v0.5.0
 * @see https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#dash%E6%A0%BC%E5%BC%8F
 * @param bvid - 视频BV号
 * @param cid - 视频分P号
 * @returns 视频播放地址
 */
async function getVideoUrl(cid: number, bvid: string): Promise<TGApp.Plugins.Bili.Video.UrlData> {
  const url = "https://api.bilibili.com/x/player/playurl";
  let params: Record<string, string> = { bvid, cid: cid.toString(), fnval: "16", platform: "pc" };
  const wridRes = await getWrid(params);
  params = { ...params, wts: wridRes[0], w_rid: wridRes[1] };
  const resp = await TGHttp<TGApp.Plugins.Bili.Video.UrlResponse>(url, {
    method: "GET",
    query: params,
    headers: headerBili,
  });
  return resp.data;
}

export default getVideoUrl;
