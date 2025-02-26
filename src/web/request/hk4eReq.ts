/**
 * @file web/request/hk4eReq.ts
 * @description Hk4eApi 请求模块
 * @since Beta v0.7.0
 */

import TGHttp from "@/utils/TGHttp.js";
import { getDeviceInfo } from "@/utils/toolFunc.js";

export enum AnnoServer {
  CN_ISLAND = "cn_gf01",
  CN_TREE = "cn_qd01",
  OS_USA = "os_usa",
  OS_EURO = "os_euro",
  OS_ASIA = "os_asia",
  OS_CHT = "os_cht",
}

export type AnnoLang = "zh-cn" | "zh-tw" | "en" | "ja";

const AnnoApi: Readonly<string> = "https://hk4e-ann-api.mihoyo.com/common/hk4e_cn/announcement/api";
const AnnoApiGlobal: Readonly<string> =
  "https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api";
const SdkApi: Readonly<string> = "https://hk4e-sdk.mihoyo.com/hk4e_cn/";

/**
 * @description 判断是否为国内服务器
 * @since Beta v0.6.5
 * @param {AnnoServer} region 服务器
 * @returns {boolean} 是否为国内服务器
 */
function isCN(region: AnnoServer): boolean {
  return region === AnnoServer.CN_ISLAND || region === AnnoServer.CN_TREE;
}

/**
 * @description 根据服务器获取公告地址
 * @since Beta v0.6.5
 * @param {AnnoServer} region 服务器
 * @returns {string} 公告地址
 */
function getAnnoApi(region: AnnoServer): string {
  return isCN(region) ? AnnoApi : AnnoApiGlobal;
}

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
  return {
    game: "hk4e",
    game_biz: isCN(region) ? "hk4e_cn" : "hk4e_global",
    lang,
    bundle_id: isCN(region) ? "hk4e_cn" : "hk4e_global",
    platform: "pc",
    region,
    level: "55",
    uid: "100000000",
  };
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
  const resp = await TGHttp<TGApp.BBS.Announcement.ListResponse>(
    `${getAnnoApi(region)}/getAnnList`,
    { method: "GET", query: getAnnoParams(region, lang) },
  );
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
  const annoResp = await TGHttp<TGApp.BBS.Announcement.ContentResponse>(
    `${getAnnoApi(region)}/getAnnContent`,
    { method: "GET", query: getAnnoParams(region, lang) },
  );
  const annoContent = annoResp.data.list.find((item) => item.ann_id === annId);
  if (annoContent === undefined) {
    throw new Error("公告内容不存在");
  }
  return annoContent;
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
  const resp = await TGHttp<TGApp.Game.Gacha.GachaLogResponse | TGApp.BBS.Response.Base>(
    "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog",
    { method: "GET", query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * @description 获取登录二维码
 * @since Beta v0.7.0
 * @param {string} appId 应用 ID // 目前只有2/7能用
 * @returns {Promise<TGApp.Game.Login.QrRes|TGApp.BBS.Response.Base>}
 */
async function fetchPandaQr(
  appId: string = "2",
): Promise<TGApp.Game.Login.QrRes | TGApp.BBS.Response.Base> {
  const data = { app_id: appId, device: getDeviceInfo("device_id") };
  const resp = await TGHttp<TGApp.Game.Login.QrResp>(`${SdkApi}combo/panda/qrcode/fetch`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取登录状态
 * @since Beta v0.7.0
 * @param {string} ticket 二维码 ticket
 * @param {string} appId 应用 ID
 * @returns {Promise<TGApp.BBS.Response.Base|TGApp.Game.Login.StatusRes>}
 */
async function queryPandaQr(
  ticket: string,
  appId: string = "2",
): Promise<TGApp.BBS.Response.Base | TGApp.Game.Login.StatusRes> {
  const data = { app_id: appId, ticket, device: getDeviceInfo("device_id") };
  const resp = await TGHttp<TGApp.Game.Login.StatusResp>(`${SdkApi}combo/panda/qrcode/query`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const Hk4eApi = {
  anno: { list: getAnnoList, content: getAnnoContent },
  gacha: getGachaLog,
  loginQr: { create: fetchPandaQr, state: queryPandaQr },
};

export default Hk4eApi;
