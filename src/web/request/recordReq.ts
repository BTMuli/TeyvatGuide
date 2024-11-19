/**
 * @file web/request/record/genshinReq.ts
 * @description TakumiRecordGenshinApi 相关请求
 * @since Beta v0.6.3
 */

import TGHttp from "../../utils/TGHttp.js";
import { getRequestHeader } from "../utils/getRequestHeader.js";

// TakumiRecordGenshinApiBaseUrl => trgAbu
const trgAbu = "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/";

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
  const url = `${trgAbu}character/detail`;
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region, character_ids: avatarIds };
  const header = getRequestHeader(ck, "POST", data, "common");
  const resp = await TGHttp<TGApp.Game.Avatar.DetailResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: header,
  });
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
  const url = `${trgAbu}character/list`;
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const data = { role_id: user.gameUid, server: user.region };
  const header = getRequestHeader(ck, "POST", data, "common");
  const resp = await TGHttp<TGApp.Game.Avatar.ListResponse | TGApp.BBS.Response.Base>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * @description 获取首页信息
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base>}
 */
async function index(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Record.FullData | TGApp.BBS.Response.Base> {
  const url = `${trgAbu}index`;
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { avatar_list_type: 1, role_id: user.gameUid, server: user.region };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.Game.Record.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取真境剧诗数据
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @returns {Promise<TGApp.Game.Combat.Combat[] | TGApp.BBS.Response.Base|false>}
 */
async function roleCombat(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Combat.Combat[] | TGApp.BBS.Response.Base | false> {
  const url = `${trgAbu}role_combat`;
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, server: user.region, active: 1, need_detail: true };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.Game.Combat.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  if (!resp.data.is_unlock) return false;
  return resp.data.data;
}

/**
 * @description 获取深渊螺旋记录
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
  const url = `${trgAbu}spiralAbyss`;
  const ck = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
  };
  const params = { role_id: user.gameUid, schedule_type: schedule, server: user.region };
  const header = getRequestHeader(ck, "GET", params, "common");
  const resp = await TGHttp<TGApp.Game.Abyss.Response | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

const TakumiRecordGenshinApi = {
  index: index,
  character: {
    list: characterList,
    detail: characterDetail,
  },
  roleCombat: roleCombat,
  spiralAbyss: spiralAbyss,
};

export default TakumiRecordGenshinApi;
