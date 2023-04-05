/**
 * @file plugins Genshin request announcements.ts
 * @description 原神游戏内公告请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { http } from "@tauri-apps/api";
import { Hk4eAnnoApi } from "./base";
import {
  type AnnoListResponse,
  type AnnoContentResponse,
  type AnnoListData,
  type AnnoContentItem,
} from "../interface/announcement";

// 公告 API
const ANNO_LIST_API = `${Hk4eAnnoApi}/getAnnList?`;
const ANNO_CONTENT_API = `${Hk4eAnnoApi}/getAnnContent?`;
// 公告 Query
const ANNO_QUERY =
	"game=hk4e&game_biz=hk4e_cn&lang=zh-cn&bundle_id=hk4e_cn&platform=pc&region=cn_gf01&level=60&uid=500299765";

/**
 * @description 获取游戏内公告列表
 * @since Alpha v0.1.1
 * @returns {Promise<AnnoListData>}
 */
export async function getAnnouncementList (): Promise<AnnoListData> {
  return await http.fetch<AnnoListResponse>(`${ANNO_LIST_API}${ANNO_QUERY}`).then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Alpha v0.1.2
 * @param {number} annId 公告 ID
 * @returns {Promise<AnnoContentItem>}
 */
export async function getAnnouncementContent (annId: number): Promise<AnnoContentItem> {
  const annoContents: AnnoContentItem[] = await http
    .fetch<AnnoContentResponse>(`${ANNO_CONTENT_API}${ANNO_QUERY}`)
    .then((res) => res.data.data.list);
  const annoContent = annoContents.find((item) => item.ann_id === annId);
  if (annoContent) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}
