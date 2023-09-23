/**
 * @file web request getAnnouncement.ts
 * @description 获取游戏内公告
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.2
 */

// Tauri
import { http } from "@tauri-apps/api";

const params = {
  game: "hk4e",
  game_biz: "hk4e_cn",
  lang: "zh-cn",
  bundle_id: "hk4e_cn",
  platform: "pc",
  region: "cn_gf01",
  level: "60",
  uid: "500299765",
};

/**
 * @description 获取游戏内公告列表
 * @since Beta v0.3.2
 * @returns {Promise<TGApp.BBS.Announcement.ListData>}
 */
export async function getAnnoList(): Promise<TGApp.BBS.Announcement.ListData> {
  const url = "https://hk4e-api.mihoyo.com/common/hk4e_cn/announcement/api/getAnnList";
  return await http
    .fetch<TGApp.BBS.Announcement.ListResponse>(url, {
      method: "GET",
      query: params,
    })
    .then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Beta v0.3.2
 * @param {number} annId 公告 ID
 * @returns {Promise<TGApp.BBS.Announcement.ContentItem>}
 */
export async function getAnnoContent(annId: number): Promise<TGApp.BBS.Announcement.ContentItem> {
  const url = "https://hk4e-api.mihoyo.com/common/hk4e_cn/announcement/api/getAnnContent";
  const annoContents: TGApp.BBS.Announcement.ContentItem[] = await http
    .fetch<TGApp.BBS.Announcement.ContentResponse>(url, {
      method: "GET",
      query: params,
    })
    .then((res) => res.data.data.list);
  const annoContent = annoContents.find((item) => item.ann_id === annId);
  if (annoContent != null) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}
