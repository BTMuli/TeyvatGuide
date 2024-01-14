/**
 * @file plugins/Bili/request/getVideoUrl.ts
 * @description Bili 插件视频请求文件
 * @since Beta v0.4.0
 */

import { http } from "@tauri-apps/api";

import getWrid from "../utils/getWrid";

/**
 * @description 获取视频播放地址
 * @since Beta v0.4.0
 * @see https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#dash%E6%A0%BC%E5%BC%8F
 * @param {string} [aid] 视频AV号
 * @param {string} [bvid] 视频BV号
 * @param {number} cid 视频分P号
 * @returns {Promise<string>} 视频播放地址
 */
async function getVideoUrl(cid: number, aid?: string, bvid?: string): Promise<unknown> {
  const url = "https://api.bilibili.com/x/player/wbi/playurl";
  let params: Record<string, string> = {
    cid: cid.toString(),
    platform: "html5",
    high_quality: "1",
  };
  if (aid) {
    params = {
      aid,
      ...params,
    };
  } else if (bvid) {
    params = {
      bvid,
      ...params,
    };
  } else {
    throw new Error("参数错误");
  }
  const wrid = await getWrid(params);
  params = {
    ...params,
    wts: wrid[0].toString(),
    wrid: wrid[1],
  };
  console.log("params", params);
  return await http
    .fetch<TGApp.Plugins.Bili.Video.UrlResponse>(url, {
      method: "GET",
      query: params,
    })
    .then((res) => {
      return res.data.data;
    });
}

export default getVideoUrl;
