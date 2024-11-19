/**
 * @file web/request/hk4eReq.ts
 * @description Hk4eApi 请求模块
 * @since Beta v0.6.3
 */

import TGHttp from "../../utils/TGHttp.js";

export enum AnnoServer {
  CN_ISLAND = "cn_gf01",
  CN_TREE = "cn_qd01",
  OS_USA = "os_usa",
  OS_EURO = "os_euro",
  OS_ASIA = "os_asia",
  OS_CHT = "os_cht",
}

export type AnnoLang = "zh-cn" | "zh-tw" | "en" | "ja";

const AnnoApi = "https://hk4e-ann-api.mihoyo.com/common/hk4e_cn/announcement/api";
const AnnoApiGlobal = "https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api";

/**
 * @description 获取游戏内公告参数
 * @since Beta v0.4.4
 * @param {AnnoServer} region 服务器
 * @param {string} lang 语言
 * @returns {TGApp.BBS.Announcement.Params}
 */
function getAnnoParams(
  region: AnnoServer = AnnoServer.CN_ISLAND,
  lang: AnnoLang = "zh-cn",
): TGApp.BBS.Announcement.Params {
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
  if (region === AnnoServer.CN_ISLAND || region === AnnoServer.CN_TREE) {
    return params;
  }
  params.game_biz = "hk4e_global";
  params.bundle_id = "hk4e_global";
  return params;
}

/**
 * @description 获取游戏内公告列表
 * @since Beta v0.5.5
 * @param {string} region 服务器
 * @param {AnnoLang} lang 语言
 * @returns {Promise<TGApp.BBS.Announcement.ListData>}
 */
async function getAnnoList(
  region: AnnoServer = AnnoServer.CN_ISLAND,
  lang: AnnoLang = "zh-cn",
): Promise<TGApp.BBS.Announcement.ListData> {
  const params: TGApp.BBS.Announcement.Params = getAnnoParams(region, lang);
  let url = `${AnnoApi}/getAnnList`;
  if (region !== AnnoServer.CN_ISLAND && region !== AnnoServer.CN_TREE) {
    url = `${AnnoApiGlobal}/getAnnList`;
  }
  const resp = await TGHttp<TGApp.BBS.Announcement.ListResponse>(url, {
    method: "GET",
    query: params,
  });
  return resp.data;
}

/**
 * @description 获取游戏内公告内容
 * @since Beta v0.5.5
 * @param {number} annId 公告 ID
 * @param {AnnoServer} region 服务器
 * @param {AnnoLang} lang 语言
 * @returns {Promise<TGApp.BBS.Announcement.ContentItem>}
 */
async function getAnnoContent(
  annId: number,
  region: AnnoServer = AnnoServer.CN_ISLAND,
  lang: AnnoLang = "zh-cn",
): Promise<TGApp.BBS.Announcement.ContentItem> {
  const params: TGApp.BBS.Announcement.Params = getAnnoParams(region, lang);
  let url = `${AnnoApi}/getAnnContent`;
  if (region !== AnnoServer.CN_ISLAND && region !== AnnoServer.CN_TREE) {
    url = `${AnnoApiGlobal}/getAnnContent`;
  }
  const annoResp = await TGHttp<TGApp.BBS.Announcement.ContentResponse>(url, {
    method: "GET",
    query: params,
  });
  const annoContent = annoResp.data.list.find((item) => item.ann_id === annId);
  if (annoContent != null) {
    return annoContent;
  } else {
    throw new Error("公告内容不存在");
  }
}

/**
 * @description 获取抽卡记录
 * @since Beta v0.5.0
 * @param {string} authKey authKey
 * @param {string} gachaType 抽卡类型
 * @param {string} endId 结束 id，默认为 0
 * @returns {Promise<TGApp.Game.Gacha.GachaItem[] | TGApp.BBS.Response.Base>} 抽卡记录
 */
async function getGachaLog(
  authKey: string,
  gachaType: string,
  endId: string = "0",
): Promise<TGApp.Game.Gacha.GachaItem[] | TGApp.BBS.Response.Base> {
  const url = "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog";
  const params = {
    lang: "zh-cn",
    auth_appid: "webview_gacha",
    authkey: authKey,
    authkey_ver: "1",
    sign_type: "2",
    gacha_type: gachaType,
    size: "20",
    end_id: endId,
  };
  const resp = await TGHttp<TGApp.Game.Gacha.GachaLogResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

const Hk4eApi = {
  anno: {
    list: getAnnoList,
    content: getAnnoContent,
  },
  gacha: getGachaLog,
};

export default Hk4eApi;
