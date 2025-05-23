/**
 * @file request/lunaReq.ts
 * @description 签到模块请求
 * @since Beta v0.7.2
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGBbs from "@utils/TGBbs.js";
import TGHttp from "@utils/TGHttp.js";

// takumiEventLunaApiBaseUrl => telaBu
const telaBu: Readonly<string> = "https://api-takumi.mihoyo.com/event/luna/";

type ReqParam = { host?: string; actId: string };

/**
 * @description 根据服务器获取actId跟host
 * @since Beta v0.7.2
 * @param {string} region - 服务器
 * @returns {string} actId
 */
function getActConf(region: string): ReqParam | false {
  switch (region) {
    // 崩坏2
    case "bh2_cn":
      return { actId: "e202203291431091" };
    // 崩坏3
    case "bh3_cn":
      return { actId: "e202306201626331" };
    // 原神
    case "hk4e_cn":
      return { actId: "e202311201442471", host: "hk4e" };
    // 崩坏：星穹铁道
    case "hkrpg_cn":
      return { actId: "e202304121516551", host: "hkrpg" };
    // 未定事件簿
    case "nxx_cn":
      return { actId: "e202202251749321" };
    // 绝区零
    case "nap_cn":
      return { actId: "e202406242138391", host: "zzz" };
    default:
      return false;
  }
}

/**
 * @description 获取签到奖励列表
 * @since Beta v0.7.2
 * @property {TGApp.Sqlite.Account.Game} account - 账号信息
 * @property {Record<string, string>} cookie - cookies
 * @returns {Promise<TGApp.BBS.Sign.HomeRes|TGApp.BBS.Response.Base>}
 */
async function getLunaHome(
  account: TGApp.Sqlite.Account.Game,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Sign.HomeRes | TGApp.BBS.Response.Base> {
  const conf = getActConf(account.gameBiz);
  if (conf === false) {
    return <TGApp.BBS.Response.Base>{ retcode: 1, message: "未知服务器" };
  }
  const url = conf.host ? `${telaBu}${conf.host}/home` : `${telaBu}home`;
  const params = { lang: "zh-cn", act_id: conf.actId };
  const header: Record<string, string> = {
    "user-agent": TGBbs.ua,
    referer: "https://act.mihoyo.com",
    cookie: Object.keys(cookie)
      .map((key) => `${key}=${cookie[key]}`)
      .join("; "),
  };
  if (conf.host) if (conf.host) header["x-rpc-signgame"] = conf.host;
  const resp = await TGHttp<TGApp.BBS.Sign.HomeResp>(url, {
    method: "GET",
    query: params,
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取签到信息
 * @since Beta v0.7.2
 * @property {TGApp.Sqlite.Account.Game} account - 账号信息
 * @property {Record<string, string>} cookie - cookies
 * @returns {Promise<TGApp.BBS.Sign.InfoRes|TGApp.BBS.Response.Base>}
 */
async function getLunaInfo(
  account: TGApp.Sqlite.Account.Game,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Sign.InfoRes | TGApp.BBS.Response.Base> {
  const conf = getActConf(account.gameBiz);
  if (conf === false) {
    return <TGApp.BBS.Response.Base>{ retcode: 1, message: "未知服务器" };
  }
  const url = conf.host ? `${telaBu}${conf.host}/info` : `${telaBu}info`;
  const params = {
    lang: "zh-cn",
    act_id: conf.actId,
    region: account.region,
    uid: account.gameUid,
  };
  const header: Record<string, string> = {
    "user-agent": TGBbs.ua,
    referer: "https://act.mihoyo.com",
    cookie: Object.keys(cookie)
      .map((key) => `${key}=${cookie[key]}`)
      .join("; "),
  };
  if (conf.host) header["x-rpc-signgame"] = conf.host;
  const resp = await TGHttp<TGApp.BBS.Sign.InfoResp>(url, {
    method: "GET",
    query: params,
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

async function lunaSign(
  account: TGApp.Sqlite.Account.Game,
  cookie: Record<string, string>,
  challenge?: string,
): Promise<TGApp.BBS.Sign.SignRes | TGApp.BBS.Response.Base> {
  const conf = getActConf(account.gameBiz);
  if (conf === false) {
    return <TGApp.BBS.Response.Base>{ retcode: 1, message: "未知服务器" };
  }
  const url = conf.host ? `${telaBu}${conf.host}/sign` : `${telaBu}sign`;
  const data = {
    lang: "zh-cn",
    act_id: conf.actId,
    region: account.region,
    uid: account.gameUid,
  };
  const header: Record<string, string> = {
    ...getRequestHeader(cookie, "POST", JSON.stringify(data), "X6"),
    "x-rpc-client_type": "2",
  };
  if (conf.host) header["x-rpc-signgame"] = conf.host;
  if (challenge) header["x-rpc-challenge"] = challenge;
  const resp = await TGHttp<TGApp.BBS.Sign.SignResp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const lunaReq = { home: getLunaHome, info: getLunaInfo, sign: lunaSign };

export default lunaReq;
