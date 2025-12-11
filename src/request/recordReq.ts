/**
 * TakumiRecordGenshinApi 相关请求
 * @since Beta v0.8.0
 */

import { GameServerEnum } from "@enum/game.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// TakumiRecordGenshinApiBaseUrl => trgAbu
const trgAbu: Readonly<string> =
  "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/";

/**
 * @description 获取角色详情
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string[]} avatarIds 角色 id 列表
 * @returns {Promise<TGApp.Game.Avatar.AvatarDetail | TGApp.BBS.Response.Base>}
 */
async function characterDetail(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  avatarIds: string[],
): Promise<TGApp.Game.Avatar.AvatarDetail | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region, character_ids: avatarIds };
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResponse | TGApp.BBS.Response.Base>(
    `${trgAbu}character/detail`,
    { method: "POST", body: JSON.stringify(data), headers: getRequestHeader(ck, "POST", data) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取角色列表
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<TGApp.Game.Avatar.Avatar[] | TGApp.BBS.Response.Base>}
 */
async function characterList(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Avatar.Avatar[] | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.Avatar.ListResponse | TGApp.BBS.Response.Base>(
    `${trgAbu}character/list`,
    { method: "POST", body: JSON.stringify(data), headers: getRequestHeader(ck, "POST", data) },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * @description 获取首页信息
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {number} listType 列表类型
 * @returns {Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base>}
 */
async function index(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  listType: number = 0,
): Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { avatar_list_type: listType, role_id: user.gameUid, server: user.region };
  const resp = await TGHttp<TGApp.Game.Record.Response | TGApp.BBS.Response.Base>(
    `${trgAbu}index`,
    { method: "GET", headers: getRequestHeader(ck, "GET", params), query: params },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取真境剧诗数据
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<Array<TGApp.Game.Combat.Combat> | TGApp.BBS.Response.Base|false>}
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
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string} schedule 1: 本期, 2: 上期
 * @returns {Promise<TGApp.Game.Abyss.FullData | TGApp.BBS.Response.Base>}
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
 * @description 获取赋光之人列表
 * @since Beta v0.8.0
 * @param {TGApp.Game.Base.ServerTypeEnum} server 区服
 * @returns {Promise<TGApp.Game.Challenge.PopularityResp | TGApp.BBS.Response.Base>}
 */
async function hardChallengePopularity(
  server: TGApp.Game.Base.ServerTypeEnum = GameServerEnum.CN_GF01,
): Promise<TGApp.Game.Challenge.PopularityResp | TGApp.BBS.Response.Base> {
  let roleId: number | undefined;
  switch (server) {
    case GameServerEnum.CN_GF01:
      roleId = 147991965; // CN
      break;
    case GameServerEnum.CN_QD01:
      roleId = 500299765; // QD
      break;
    default:
      return <TGApp.BBS.Response.Base>{
        retcode: -1,
        message: "不支持的服务器",
        data: null,
      };
  }
  const resp = await TGHttp<TGApp.Game.Challenge.PopularityResp | TGApp.BBS.Response.Base>(
    `${trgAbu}hard_challenge/popularity`,
    { method: "GET", query: { server, role_id: roleId } },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp;
}

/**
 * @description 获取挑战数据
 * @since Beta v0.8.0
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<TGApp.Game.Challenge.ChallengeRes | TGApp.BBS.Response.Base>}
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
 * @description 获取活动日历数据
 * @since Beta v0.8.0
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<TGApp.Game.ActCalendar.ActRes | TGApp.BBS.Response.Base>}
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
