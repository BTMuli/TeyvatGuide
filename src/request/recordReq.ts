/**
 * TakumiRecordGenshinApi 相关请求
 * @since Beta v0.11.5
 */

import gameEnum from "@enum/game.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const trgAbu: Readonly<string> =
  "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/";
const CHARACTER_DETAIL_CHUNK_SIZE: Readonly<number> = 40;
const CHARACTER_DETAIL_CONCURRENCY: Readonly<number> = 2;

function splitChunks<T>(items: Array<T>, size: number): Array<Array<T>> {
  const chunks: Array<Array<T>> = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * 请求单批角色详情
 * @since Beta v0.11.5
 * @param cookie - Cookie
 * @param user - 用户
 * @param avatarIds - 角色 id 列表
 * @returns 角色详情响应数据
 */
async function requestCharacterDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  avatarIds: Array<string>,
): Promise<TGApp.Game.Avatar.DetailResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region, character_ids: avatarIds };
  const resp = await TGHttps.post<TGApp.Game.Avatar.DetailResp>(`${trgAbu}character/detail`, {
    headers: getRequestHeader(ck, "POST", data),
    body: JSON.stringify(data),
  });
  return resp.data;
}

/**
 * 获取角色详情
 * @since Beta v0.11.5
 * @param cookie - Cookie
 * @param user -  用户
 * @param avatarIds - 角色 id 列表
 * @returns 角色详情响应数据
 * @remarks 角色较多时分批并发请求，避免单次超大响应拖慢刷新
 */
async function characterDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  avatarIds: Array<string>,
): Promise<TGApp.Game.Avatar.DetailResp> {
  if (avatarIds.length <= CHARACTER_DETAIL_CHUNK_SIZE) {
    return await requestCharacterDetail(cookie, user, avatarIds);
  }
  const chunks = splitChunks(avatarIds, CHARACTER_DETAIL_CHUNK_SIZE);
  const responses: Array<TGApp.Game.Avatar.DetailResp> = [];
  for (let index = 0; index < chunks.length; index += CHARACTER_DETAIL_CONCURRENCY) {
    const group = chunks.slice(index, index + CHARACTER_DETAIL_CONCURRENCY);
    const groupResponses = await Promise.all(
      group.map(async (chunk) => await requestCharacterDetail(cookie, user, chunk)),
    );
    const failed = groupResponses.find((resp) => resp.retcode !== 0);
    if (failed !== undefined) return failed;
    responses.push(...groupResponses);
  }
  const [first] = responses;
  if (first === undefined) return await requestCharacterDetail(cookie, user, avatarIds);
  return {
    retcode: 0,
    message: first.message,
    data: {
      ...first.data,
      list: responses.flatMap((resp) => resp.data.list),
    },
  };
}

/**
 * 获取角色列表
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 角色列表响应数据
 */
async function characterList(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Avatar.ListResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region };
  const resp = await TGHttps.post<TGApp.Game.Avatar.ListResp>(`${trgAbu}character/list`, {
    headers: getRequestHeader(ck, "POST", data),
    body: JSON.stringify(data),
  });
  return resp.data;
}

/**
 * 获取首页信息
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @param listType - 列表类型
 * @returns 首页响应数据
 */
async function index(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  listType: number = 0,
): Promise<TGApp.Game.Record.Resp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { avatar_list_type: listType, role_id: user.gameUid, server: user.region };
  const resp = await TGHttps.get<TGApp.Game.Record.Resp>(`${trgAbu}index`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取真境剧诗数据
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 真境剧诗响应数据
 */
async function roleCombat(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Combat.CombatResp> {
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, server: user.region, active: 1, need_detail: true };
  const resp = await TGHttps.get<TGApp.Game.Combat.CombatResp>(`${trgAbu}role_combat`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取绘想游迹数据
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 绘想游迹响应数据
 */
async function charMaster(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Combat.CharResp> {
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, server: user.region };
  const resp = await TGHttps.get<TGApp.Game.Combat.CharResp>(`${trgAbu}char_master`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取深渊螺旋记录
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @param schedule - 档期
 * @example 1: 本期, 2: 上期
 * @returns 深渊螺旋响应数据
 */
async function spiralAbyss(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  schedule: string,
): Promise<TGApp.Game.Abyss.Response> {
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, schedule_type: schedule, server: user.region };
  const resp = await TGHttps.get<TGApp.Game.Abyss.Response>(`${trgAbu}spiralAbyss`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取赋光之人列表
 * @since Beta v0.10.1
 * @param server - 区服
 * @returns 赋光之人列表响应数据
 */
async function hardChallengePopularity(
  server: TGApp.Game.Base.ServerTypeEnum = gameEnum.server.CN_GF01,
): Promise<TGApp.Game.Challenge.PopularityResp> {
  let roleId: number | undefined;
  switch (server) {
    case gameEnum.server.CN_GF01:
      roleId = 147991965;
      break;
    case gameEnum.server.CN_QD01:
      roleId = 500299765;
      break;
    default:
      throw new Error("不支持的服务器");
  }
  const resp = await TGHttps.get<TGApp.Game.Challenge.PopularityResp>(
    `${trgAbu}hard_challenge/popularity`,
    { query: { server, role_id: roleId } },
  );
  return resp.data;
}

/**
 * 获取幽境危战数据
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @returns 幽境危战响应数据
 */
async function hardChallengeDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Challenge.ChallengeResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { need_detail: true, role_id: user.gameUid, server: user.region };
  const resp = await TGHttps.get<TGApp.Game.Challenge.ChallengeResp>(`${trgAbu}hard_challenge`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取活动日历数据
 * @since Beta v0.10.2
 * @param cookie - Cookie
 * @param user - 用户
 * @param challenge - 极验验证信息（可选）
 * @returns 活动日历响应数据
 */
async function actCalendar(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  challenge?: string,
): Promise<TGApp.Game.ActCalendar.ActResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const body = { role_id: user.gameUid, server: user.region };
  const headers = getRequestHeader(ck, "POST", body);
  if (challenge) headers["x-rpc-challenge"] = challenge;
  const resp = await TGHttps.post<TGApp.Game.ActCalendar.ActResp>(`${trgAbu}act_calendar`, {
    headers,
    body: JSON.stringify(body),
  });
  return resp.data;
}

/**
 * 获取实时便笺
 * @since Beta v0.10.2
 * @param cookie - Cookie
 * @param user - 用户
 * @param challenge - 极验验证信息（可选）
 * @returns 实时便笺响应数据
 */
async function dailyNote(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  challenge?: string,
): Promise<TGApp.Game.DailyNote.DnResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { role_id: user.gameUid, server: user.region };
  const headers = getRequestHeader(ck, "GET", params);
  if (challenge) headers["x-rpc-challenge"] = challenge;
  const resp = await TGHttps.get<TGApp.Game.DailyNote.DnResp>(`${trgAbu}dailyNote`, {
    headers,
    query: params,
  });
  return resp.data;
}

const recordReq = {
  index: index,
  actCalendar: actCalendar,
  daily: dailyNote,
  character: { list: characterList, detail: characterDetail },
  combat: {
    base: roleCombat,
    char: charMaster,
  },
  spiralAbyss: spiralAbyss,
  challenge: {
    detail: hardChallengeDetail,
    pop: hardChallengePopularity,
  },
};

export default recordReq;
