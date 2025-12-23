/**
 * Hk4eApi 请求模块
 * @since Beta v0.8.4
 */

import gameEnum from "@enum/game.js";
import TGHttp from "@utils/TGHttp.js";
import { getDeviceInfo } from "@utils/toolFunc.js";

const AnnoApi: Readonly<string> = "https://hk4e-ann-api.mihoyo.com/common/hk4e_cn/announcement/api";
const AnnoApiGlobal: Readonly<string> =
  "https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api";
const SdkApi: Readonly<string> = "https://hk4e-sdk.mihoyo.com/hk4e_cn/";

/**
 * 判断是否为国内服务器
 * @since Beta v0.8.0
 * @param region - 服务器
 * @returns 是否为国内服务器
 */
function isCN(region: TGApp.Game.Base.ServerTypeEnum): boolean {
  switch (region) {
    case gameEnum.server.CN_QD01:
    case gameEnum.server.CN_GF01:
      return true;
    default:
      return false;
  }
}

/**
 * 根据服务器获取公告地址
 * @since Beta v0.8.0
 * @param region - 服务器
 * @returns 公告地址
 */
function getAnnoApi(region: TGApp.Game.Base.ServerTypeEnum): string {
  return isCN(region) ? AnnoApi : AnnoApiGlobal;
}

/**
 * 获取游戏内公告参数
 * @since Beta v0.8.0
 * @param region - 服务器
 * @param lang - 语言
 * @returns 公告参数
 */
function getAnnoParams(
  region: TGApp.Game.Base.ServerTypeEnum = gameEnum.server.CN_GF01,
  lang: TGApp.Game.Anno.AnnoLangEnum = gameEnum.anno.lang.CHS,
): TGApp.Game.Anno.Params {
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
 * 获取游戏内公告列表
 * @since Beta v0.8.0
 * @param region - 服务器
 * @param lang - 语言
 * @returns 公告列表
 */
async function getAnnoList(
  region: TGApp.Game.Base.ServerTypeEnum = gameEnum.server.CN_GF01,
  lang: TGApp.Game.Anno.AnnoLangEnum = gameEnum.anno.lang.CHS,
): Promise<TGApp.Game.Anno.ListRes> {
  const resp = await TGHttp<TGApp.Game.Anno.ListResp>(`${getAnnoApi(region)}/getAnnList`, {
    method: "GET",
    query: getAnnoParams(region, lang),
  });
  return resp.data;
}

/**
 * 获取游戏内公告内容
 * @since Beta v0.8.0
 * @param region - 服务器
 * @param lang - 语言
 * @returns 公告详情
 */
async function getAnnoDetail(
  region: TGApp.Game.Base.ServerTypeEnum = gameEnum.server.CN_GF01,
  lang: TGApp.Game.Anno.AnnoLangEnum = gameEnum.anno.lang.CHS,
): Promise<Array<TGApp.Game.Anno.AnnoDetail>> {
  const resp = await TGHttp<TGApp.Game.Anno.DetailResp>(`${getAnnoApi(region)}/getAnnContent`, {
    method: "GET",
    query: getAnnoParams(region, lang),
  });
  return resp.data.list;
}

/**
 * 获取抽卡记录
 * @since Beta v0.5.0
 * @param authKey - authKey
 * @param gachaType - 抽卡类型
 * @param endId - 结束 id，默认为 0
 * @returns 抽卡记录
 */
async function getGachaLog(
  authKey: string,
  gachaType: string,
  endId: string = "0",
): Promise<Array<TGApp.Game.Gacha.GachaItem> | TGApp.BBS.Response.Base> {
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
  const resp = await TGHttp<TGApp.Game.Gacha.GachaLogResp | TGApp.BBS.Response.Base>(
    "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog",
    { method: "GET", query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * 获取千星奇域抽卡记录
 * @since Beta v0.8.4
 * @param authKey - authKey
 * @param gachaType - 抽卡类型
 * @param endId - 结束 id，默认为 0
 * @returns 抽卡记录
 */
async function getBeyondGachaLog(
  authKey: string,
  gachaType: string,
  endId: string = "0",
): Promise<Array<TGApp.Game.Gacha.GachaBItem> | TGApp.BBS.Response.Base> {
  const params = {
    lang: "zh-cn",
    auth_appid: "webview_gacha",
    authkey: authKey,
    authkey_ver: "1",
    sign_type: "2",
    gacha_type: gachaType,
    size: "5",
    end_id: endId,
  };
  const resp = await TGHttp<TGApp.Game.Gacha.GachaBLogResp | TGApp.BBS.Response.Base>(
    "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getBeyondGachaLog",
    { method: "GET", query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * 获取登录二维码
 * @since Beta v0.7.2
 * @param appId - 应用 ID
 * @remarks 目前只有2/7能用
 * @returns 二维码返回
 */
async function fetchPandaQr(
  appId: number,
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
 * 获取登录状态
 * @since Beta v0.7.2
 * @param ticket - 二维码 ticket
 * @param appId - 应用 ID
 * @returns 登录状态
 */
async function queryPandaQr(
  ticket: string,
  appId: number,
): Promise<TGApp.BBS.Response.Base | TGApp.Game.Login.StatRes> {
  const data = { app_id: appId, ticket, device: getDeviceInfo("device_id") };
  const resp = await TGHttp<TGApp.Game.Login.StatResp>(`${SdkApi}combo/panda/qrcode/query`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const hk4eReq = {
  anno: { list: getAnnoList, detail: getAnnoDetail },
  gacha: getGachaLog,
  gachaB: getBeyondGachaLog,
  loginQr: { create: fetchPandaQr, state: queryPandaQr },
};

export default hk4eReq;
