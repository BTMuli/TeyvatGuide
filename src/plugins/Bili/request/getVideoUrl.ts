/**
 * Bili 插件视频请求文件
 * @since Beta v0.10.1
 */

import { BILI_HEADER, getWrid } from "../utils.js";
import TGHttps from "@utils/TGHttps.js";

/**
 * 获取视频播放地址
 * @since Beta v0.10.1
 * @todo 完善参数类型
 * @see https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#dash%E6%A0%BC%E5%BC%8F
 * @param bvid - 视频BV号
 * @param cid - 视频分P号
 * @returns 视频播放地址
 */
async function getVideoUrl(cid: number, bvid: string): Promise<TGApp.Plugins.Bili.Video.UrlResp> {
  const url = "https://api.bilibili.com/x/player/playurl";
  let params: Record<string, string> = { bvid, cid: cid.toString(), fnval: "16", platform: "pc" };
  const [wts, w_rid] = await getWrid(params);
  params = { ...params, wts: wts, w_rid: w_rid };
  const resp = await TGHttps.get<TGApp.Plugins.Bili.Video.UrlResp>(url, {
    query: params,
    headers: BILI_HEADER,
  });
  return resp.data;
}

export default getVideoUrl;
