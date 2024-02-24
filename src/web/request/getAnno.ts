/**
 * @file web/request/getAnnouncement.ts
 * @description 获取游戏内公告
 * @since Beta v0.4.4
 */
import { http } from "@tauri-apps/api";

import type { AnnoLang } from "../../pages/common/Announcements.vue";

export enum SERVER {
  CN_ISLAND = "cn_gf01",
  CN_TREE = "cn_qd01",
  OS_USA = "os_usa",
  OS_EURO = "os_euro",
  OS_ASIA = "os_asia",
  OS_CHT = "os_cht",
}

/**
 * @description 获取游戏内公告参数
 * @since Beta v0.4.4
 * @param {SERVER} region 服务器
 * @param {string} lang 语言
 * @returns {TGApp.BBS.Announcement.Params}
 */
function getAnnoParams(region: SERVER, lang: AnnoLang = "zh-cn"): TGApp.BBS.Announcement.Params {
  const params: TGApp.BBS.Announcement.Params = {
    game: "hk4e",
    game_biz: "hk4e_cn",
    lang,
    bundle_id: "hk4e_cn",
    platform: "pc",
    region,
    level: "55",
    uid: "100000000",
  };
  if (region === SERVER.CN_ISLAND || region === SERVER.CN_TREE) {
    return params;
  }
  params.game_biz = "hk4e_global";
  params.bundle_id = "hk4e_global";
  return params;
}

/**
 * @description 获取游戏内公告列表
 * @since Beta v0.4.3
 * @param {string} region 服务器
 * @param {AnnoLang} lang 语言
 * @returns {Promise<TGApp.BBS.Announcement.ListData>}
 */
export async function getAnnoList(
  region: SERVER = SERVER.CN_ISLAND,
  lang: AnnoLang = "zh-cn",
): Promise<TGApp.BBS.Announcement.ListData> {
  const params: TGApp.BBS.Announcement.Params = getAnnoParams(region, lang);
  let url = "https://hk4e-api.mihoyo.com/common/hk4e_cn/announcement/api/getAnnList";
  if (region !== SERVER.CN_ISLAND && region !== SERVER.CN_TREE) {
    url = "https://hk4e-api-os.hoyoverse.com/common/hk4e_global/announcement/api/getAnnList";
  }
  return await http
    .fetch<TGApp.BBS.Announcement.ListResponse>(url, {
      method: "GET",
      query: params,
    })
    .then((res) => res.data.data);
}

/**
 * @description 获取游戏内公告内容
 * @since Beta v0.4.3
 * @param {number} annId 公告 ID
 * @param {SERVER} region 服务器
 * @param {AnnoLang} lang 语言
 * @returns {Promise<TGApp.BBS.Announcement.ContentItem>}
 */
export async function getAnnoContent(
  annId: number,
  region: SERVER,
  lang: AnnoLang = "zh-cn",
): Promise<TGApp.BBS.Announcement.ContentItem> {
  const params: TGApp.BBS.Announcement.Params = getAnnoParams(region, lang);
  let url = "https://hk4e-api.mihoyo.com/common/hk4e_cn/announcement/api/getAnnContent";
  if (region !== SERVER.CN_ISLAND && region !== SERVER.CN_TREE) {
    url = "https://hk4e-api-os.hoyoverse.com/common/hk4e_global/announcement/api/getAnnContent";
  }
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
