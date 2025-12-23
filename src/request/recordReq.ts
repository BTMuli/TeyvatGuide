/**
 * TakumiRecordGenshinApi 相关请求
 * @since Beta v0.9.1
 */

import gameEnum from "@enum/game.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// TakumiRecordGenshinApiBaseUrl => trgAbu
const trgAbu: Readonly<string> =
  "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/";

/**
 * 获取角色详情
 * @since Beta v0.6.3
 * @param cookie - Cookie
 * @param user -  用户
 * @param avatarIds - 角色 id 列表
 * @returns 角色详情返回
 */
async function characterDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  avatarIds: Array<string>,
): Promise<TGApp.Game.Avatar.DetailRes | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region, character_ids: avatarIds };
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResp | TGApp.BBS.Response.Base>(
    `${trgAbu}character/detail`,
    { method: "POST", body: JSON.stringify(data), headers: getRequestHeader(ck, "POST", data) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取角色列表
 * @since Beta v0.6.3
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 角色列表返回
 */
async function characterList(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<Array<TGApp.Game.Avatar.Avatar> | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.Avatar.ListResp | TGApp.BBS.Response.Base>(
    `${trgAbu}character/list`,
    { method: "POST", body: JSON.stringify(data), headers: getRequestHeader(ck, "POST", data) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * 获取首页信息
 * @since Beta v0.6.3
 * @param cookie - Cookie
 * @param user - 用户
 * @param listType - 列表类型
 * @returns 首页返回
 */
async function index(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  listType: number = 0,
): Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { avatar_list_type: listType, role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.Record.Resp | TGApp.BBS.Response.Base>(`${trgAbu}index`, {
    method: "GET",
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取真境剧诗数据
 * @since Beta v0.6.3
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 真境剧诗数据
 */
async function roleCombat(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<Array<TGApp.Game.Combat.Combat> | TGApp.BBS.Response.Base | false> {
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, server: user.region, active: 1, need_detail: true };
  const resp = await TGHttp<TGApp.Game.Combat.Response | TGApp.BBS.Response.Base>(
    `${trgAbu}role_combat`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  if (!resp.data.is_unlock) return false;
  return resp.data.data;
}

/**
 * 获取深渊螺旋记录
 * @since Beta v0.6.3
 * @param cookie - Cookie
 * @param user - 用户
 * @param schedule - 档期
 * @example 1: 本期, 2: 上期
 * @returns 深渊螺旋记录
 */
async function spiralAbyss(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  schedule: string,
): Promise<TGApp.Game.Abyss.FullData | TGApp.BBS.Response.Base> {
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, schedule_type: schedule, server: user.region };
  const resp = await TGHttp<TGApp.Game.Abyss.Response | TGApp.BBS.Response.Base>(
    `${trgAbu}spiralAbyss`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取赋光之人列表
 * @since Beta v0.8.0
 * @param server - 区服
 * @returns 赋光之人列表
 */
async function hardChallengePopularity(
  server: TGApp.Game.Base.ServerTypeEnum = gameEnum.server.CN_GF01,
): Promise<TGApp.Game.Challenge.PopularityResp | TGApp.BBS.Response.Base> {
  let roleId: number | undefined;
  switch (server) {
    case gameEnum.server.CN_GF01:
      roleId = 147991965;
      break;
    case gameEnum.server.CN_QD01:
      roleId = 500299765;
      break;
    default:
      return <TGApp.BBS.Response.Base>{ retcode: -1, message: "不支持的服务器", data: null };
  }
  const resp = await TGHttp<TGApp.Game.Challenge.PopularityResp | TGApp.BBS.Response.Base>(
    `${trgAbu}hard_challenge/popularity`,
    { method: "GET", query: { server, role_id: roleId } },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp;
}

/**
 * 获取幽境危战数据
 * @since Beta v0.8.0
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 幽境危战数据
 */
async function hardChallengeDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Challenge.ChallengeRes | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { need_detail: true, role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.Challenge.ChallengeResp | TGApp.BBS.Response.Base>(
    `${trgAbu}hard_challenge`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * 获取活动日历数据
 * @since Beta v0.8.0
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 活动日历数据
 */
async function actCalendar(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.ActCalendar.ActRes | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const body = { role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.ActCalendar.Response | TGApp.BBS.Response.Base>(
    `${trgAbu}act_calendar`,
    { method: "POST", headers: getRequestHeader(ck, "POST", body), body: JSON.stringify(body) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const recordReq = {
  index: index,
  actCalendar: actCalendar,
  character: { list: characterList, detail: characterDetail },
  roleCombat: roleCombat,
  spiralAbyss: spiralAbyss,
  challenge: {
    detail: hardChallengeDetail,
    pop: hardChallengePopularity,
  },
};

export default recordReq;
