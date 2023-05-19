/**
 * @file web request getAnnouncement.ts
 * @description 获取游戏内公告
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// Tauri
import { http } from "@tauri-apps/api";
// Tauri.Genshin
import TGApi from "../api/TGApi";

/**
 * @description 获取游戏内公告列表
 * @since Alpha v0.1.2
 * @returns {Promise<BTMuli.Genshin.Announcement.ListData>}
 */
export async function getAnnoList (): Promise<BTMuli.Genshin.Announcement.ListData> {
  return await http.fetch<BTMuli.Genshin.Announcement.ListResponse>(`${TGApi.GameAnnoList}${TGApi.GameAnnoQuery}`).then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Alpha v0.1.2
 * @param {number} annId 公告 ID
 * @returns {Promise<BTMuli.Genshin.Announcement.ContentItem>}
 */
export async function getAnnoContent (annId: number): Promise<BTMuli.Genshin.Announcement.ContentItem> {
  const annoContents: BTMuli.Genshin.Announcement.ContentItem[] = await http
    .fetch<BTMuli.Genshin.Announcement.ContentResponse>(`${TGApi.GameAnnoContent}${TGApi.GameAnnoQuery}`)
    .then((res) => res.data.data.list);
  const annoContent = annoContents.find((item) => item.ann_id === annId);
  if (annoContent) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}
