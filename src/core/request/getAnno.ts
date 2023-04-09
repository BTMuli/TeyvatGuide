/**
 * @file core request getAnnouncement.ts
 * @description 获取游戏内公告
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { http } from "@tauri-apps/api";
import type TGTypes from "../types/TGTypes";
import TGApi from "../api/TGApi";

/**
 * @description 获取游戏内公告列表
 * @since Alpha v0.1.2
 * @returns {Promise<TGTypes.AnnoListData>}
 */
export async function getAnnoList (): Promise<TGTypes.AnnoListData> {
  return await http.fetch<TGTypes.AnnoListResponse>(`${TGApi.GameAnnoList}${TGApi.GameAnnoQuery}`).then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Alpha v0.1.2
 * @param {number} annId 公告 ID
 * @returns {Promise<AnnoContentItem>}
 */
export async function getAnnoContent (annId: number): Promise<TGTypes.AnnoContentItem> {
  const annoContents: TGTypes.AnnoContentItem[] = await http
    .fetch<TGTypes.AnnoContentResponse>(`${TGApi.GameAnnoContent}${TGApi.GameAnnoQuery}`)
    .then((res) => res.data.data.list);
  const annoContent = annoContents.find((item) => item.ann_id === annId);
  if (annoContent) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}
