/**
 * 签到模块请求
 * @since Beta v0.9.0
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGBbs from "@utils/TGBbs.js";
import TGHttp from "@utils/TGHttp.js";

// takumiEventLunaApiBaseUrl => telaBu
const telaBu: Readonly<string> = "https://api-takumi.mihoyo.com/event/luna/";

type ReqParam = { host?: string; actId: string };

/**
 * 根据服务器获取actId跟host
 * @since Beta v0.9.0
 * @param region - 服务器
 * @returns  actId
 */
function getActConf(region: string): ReqParam | false {
  switch (region) {
    // 崩坏2
    case "bh2_cn":
      return { actId: "e202203291431091", host: "bh2" };
    // 崩坏3
    case "bh3_cn":
      return { actId: "e202306201626331", host: "bh3" };
    // 原神
    case "hk4e_cn":
      return { actId: "e202311201442471", host: "hk4e" };
    // 崩坏：星穹铁道
    case "hkrpg_cn":
      return { actId: "e202304121516551", host: "hkrpg" };
    // 未定事件簿
    case "nxx_cn":
      return { actId: "e202202251749321", host: "nxx" };
    // 绝区零
    case "nap_cn":
      return { actId: "e202406242138391", host: "zzz" };
    // TODO: 崩坏·因缘精灵
    // TODO: 星布谷地
    default:
      return false;
  }
}

/**
 * 获取签到奖励列表
 * @since Beta v0.7.2
 * @param account - 账号信息
 * @param cookie - cookies
 * @returns 签到奖励列表或基础响应
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
  if (conf.host) header["x-rpc-signgame"] = conf.host;
  const resp = await TGHttp<TGApp.BBS.Sign.HomeResp>(url, {
    method: "GET",
    query: params,
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取签到信息
 * @since Beta v0.7.2
 * @param account - 账号信息
 * @param cookie - cookies
 * @returns 签到信息或基础响应
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

/**
 * 签到
 * @since Beta v0.9.0
 * @param account - 账号信息
 * @param cookie - cookies
 * @param challenge - 极验信息
 * @returns 签到结果或基础响应
 */
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

/**
 * 获取补签信息
 * @since Beta v0.9.0
 * @param account - 账号信息
 * @param cookie - cookies
 * @returns 补签信息或基础响应
 */
async function getResignInfo(
  account: TGApp.Sqlite.Account.Game,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Sign.ResignInfoRes | TGApp.BBS.Response.Base> {
  const conf = getActConf(account.gameBiz);
  if (conf === false) {
    return <TGApp.BBS.Response.Base>{ retcode: 1, message: "未知服务器" };
  }
  const url = conf.host ? `${telaBu}${conf.host}/resign_info` : `${telaBu}info`;
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
  const resp = await TGHttp<TGApp.BBS.Sign.ResignInfoResp>(url, {
    method: "GET",
    query: params,
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 补签
 * @since Beta v0.9.0
 * @param account - 账号信息
 * @param cookie - cookies
 * @param challenge - 极验信息
 * @returns 补签结果或基础响应
 */
async function lunaResign(
  account: TGApp.Sqlite.Account.Game,
  cookie: Record<string, string>,
  challenge?: string,
): Promise<TGApp.BBS.Sign.ResignRes | TGApp.BBS.Response.Base> {
  const conf = getActConf(account.gameBiz);
  if (conf === false) {
    return <TGApp.BBS.Response.Base>{ retcode: 1, message: "未知服务器" };
  }
  const url = conf.host ? `${telaBu}${conf.host}/resign` : `${telaBu}sign`;
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
  const resp = await TGHttp<TGApp.BBS.Sign.ResignResp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const lunaReq = {
  sign: {
    info: getLunaHome,
    stat: getLunaInfo,
    oper: lunaSign,
  },
  resign: {
    info: getResignInfo,
    oper: lunaResign,
  },
};

export default lunaReq;
