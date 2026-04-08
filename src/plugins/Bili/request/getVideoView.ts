/**
 * Bili插件-获取视频基本信息
 * @since Beta v0.10.0
 */

import { BILI_HEADER, getWrid } from "../utils.js";
import TGHttps from "@utils/TGHttps.js";

/**
 * 获取视频基本信息
 * @since Beta v0.10.0
 * @todo 完善参数类型
 * @param aid - 视频 AV 号
 * @param bvid - 视频 BV 号
 * @returns 视频基本信息
 */
async function getVideoView(
  aid?: string,
  bvid?: string,
): Promise<TGApp.Plugins.Bili.Video.ViewResp> {
  const url = "https://api.bilibili.com/x/web-interface/wbi/view";
  let params: Record<string, string | number | boolean> = { need_view: 1, isGaiaAvoided: true };
  if (aid) params.aid = aid;
  if (bvid) params.bvid = bvid;
  if (!aid && !bvid) throw new Error("aid和bVid不能同时为空");
  const [wts, w_rid] = await getWrid(params);
  params = { ...params, wts: wts, w_rid: w_rid };
  const resp = await TGHttps.get<TGApp.Plugins.Bili.Video.ViewResp>(url, {
    query: params,
    headers: BILI_HEADER,
  });
  return resp.data;
}

export default getVideoView;
