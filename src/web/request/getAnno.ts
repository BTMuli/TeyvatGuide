/**
 * @file web request getAnnouncement.ts
 * @description 获取游戏内公告
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// Tauri
import { http } from "@tauri-apps/api";
// Tauri.App
import TGApi from "../api/TGApi";

/**
 * @description 获取游戏内公告列表
 * @since Alpha v0.1.2
 * @returns {Promise<TGApp.BBS.Announcement.ListData>}
 */
export async function getAnnoList (): Promise<TGApp.BBS.Announcement.ListData> {
  return await http.fetch<TGApp.BBS.Announcement.ListResponse>(`${TGApi.GameAnnoList}${TGApi.GameAnnoQuery}`).then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Alpha v0.1.2
 * @param {number} annId 公告 ID
 * @returns {Promise<TGApp.BBS.Announcement.ContentItem>}
 */
export async function getAnnoContent (annId: number): Promise<TGApp.BBS.Announcement.ContentItem> {
  const annoContents: TGApp.BBS.Announcement.ContentItem[] = await http
    .fetch<TGApp.BBS.Announcement.ContentResponse>(`${TGApi.GameAnnoContent}${TGApi.GameAnnoQuery}`)
    .then((res) => res.data.data.list);
  const annoContent = annoContents.find((item) => item.ann_id === annId);
  if (annoContent) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}
