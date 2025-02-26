/**
 * @file web/request/takumiReq.ts
 * @description Takumi 相关请求函数
 * @since Beta v0.7.0
 */
import TGBbs from "@/utils/TGBbs.js";
import TGHttp from "@/utils/TGHttp.js";
import { getDeviceInfo } from "@/utils/toolFunc.js";
import { getDS, getRequestHeader } from "@/web/utils/getRequestHeader.js";

// TakumiApiBaseUrl => taBu
const taBu: Readonly<string> = "https://api-takumi.mihoyo.com/";

/**
 * @description 根据gameToken获取stoken
 * @todo -100
 * @param {TGApp.Game.Login.StatusPayloadRaw} raw 状态数据
 * @returns {Promise<TGApp.BBS.Response.Base|string>}
 */
async function getSTokenByGameToken(
  raw: TGApp.Game.Login.StatusPayloadRaw,
): Promise<TGApp.BBS.Response.Base> {
  const data = { account_id: raw.uid, game_token: raw.token };
  // const header = {
  //   ...getRequestHeader(ck, "POST", JSON.stringify(data), "X6"),
  //   "x-rpc-client_type": "4",
  //   "x-rpc-app_id": "bll8iq97cem8",
  //   "x-rpc-game_biz": "bbs_cn",
  // };
  const header = {
    "x-rpc-app_version": TGBbs.version,
    "x-rpc-aigis": "",
    "Content-Type": "application/json",
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-sys_version": "12",
    "x-rpc-device_id": getDeviceInfo("device_id"),
    "x-rpc-device_name": getDeviceInfo("device_name"),
    "x-rpc-device_model": getDeviceInfo("product"),
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-client_type": "4",
    "User-Agent": "okhttp/4.9.3",
    ds: getDS("POST", JSON.stringify(data), "X6", false),
    cookie: `account_id=${raw.uid};ltuid=${raw.uid};stuid=${raw.uid};game_token=${raw.token};`,
  };
  const resp = await TGHttp<TGApp.BBS.Response.Base>(
    `${taBu}account/ma-cn-session/app/getTokenByGameToken`,
    {
      method: "POST",
      headers: header,
      body: JSON.stringify(data),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  console.log(resp);
  return resp;
}

/**
 * @description 根据stoken获取action_ticket
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string} actionType 动作类型
 * @returns {Promise<ActionTicketByStokenResp>}
 */
async function getActionTicketBySToken(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  actionType: string,
): Promise<ActionTicketByStokenResp> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { action_type: actionType, stoken: cookie.stoken, uid: user.gameUid };
  return await TGHttp<ActionTicketByStokenResp>(`${taBu}auth/api/getActionTicketBySToken`, {
    method: "GET",
    headers: getRequestHeader(ck, "GET", params, "K2"),
    query: params,
  });
}

/**
 * @description 生成authkey
 * @since Beta v0.6.3
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} account 账户
 * @return {Promise<string|TGApp.BBS.Response.Base>} authkey
 */
async function genAuthKey(
  cookie: TGApp.App.Account.Cookie,
  account: TGApp.Sqlite.Account.Game,
): Promise<string | TGApp.BBS.Response.Base> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const data = {
    auth_appid: "webview_gacha",
    game_biz: account.gameBiz,
    game_uid: account.gameUid,
    region: account.region,
  };
  const resp = await TGHttp<TGApp.Game.Gacha.AuthkeyResponse | TGApp.BBS.Response.Base>(
    `${taBu}binding/api/genAuthKey`,
    {
      method: "POST",
      headers: getRequestHeader(ck, "POST", JSON.stringify(data), "LK2", true),
      body: JSON.stringify(data),
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.authkey;
}

/**
 * @description 生成authkey-v2，专门用于JSBridge
 * @since Beta v0.6.3
 * @param {Record<string,string>} cookie cookie
 * @param {Record<string,string>} payload payload
 * @returns {Promise<TGApp.BBS.Response.Base>}
 */
async function genAuthKey2(
  cookie: Record<string, string>,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Response.Base> {
  return await TGHttp<TGApp.BBS.Response.Base>(`${taBu}binding/api/genAuthKey`, {
    method: "POST",
    headers: getRequestHeader(cookie, "POST", JSON.stringify(payload), "LK2", true),
    body: JSON.stringify(payload),
  });
}

/**
 * @description 通过cookie获取游戏账号
 * @since Beta v0.6.5
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @returns {Promise<TGApp.BBS.Account.GameAccount[]|TGApp.BBS.Response.Base>}
 */
async function getUserGameRolesByCookie(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Account.GameAccount[] | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { game_biz: "hk4e_cn" };
  const resp = await TGHttp<GameAccountsResp>(`${taBu}binding/api/getUserGameRolesByCookie`, {
    method: "GET",
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

const TakumiApi = {
  auth: { actionTicket: getActionTicketBySToken },
  bind: { authKey: genAuthKey, authKey2: genAuthKey2, gameRoles: getUserGameRolesByCookie },
  game: { stoken: getSTokenByGameToken },
};

export default TakumiApi;

/// 一些类型 ///
type ActionTicketByStokenResp = TGApp.BBS.Response.BaseWithData & {
  data: {
    ticket: string;
    is_verified: boolean;
    account_info: {
      is_realname: boolean;
      mobile: string;
      safe_mobile: string;
      account_id: string;
      account_name: string;
      email: string;
      is_email_verify: boolean;
      area_code: string;
      safe_area_code: string;
      real_name: string;
      identity_code: string;
      create_time: string;
      create_ip: string;
      change_pwd_time: string;
      nickname: string;
      user_icon_id: number;
      safe_level: number;
      black_endtime: string;
      black_note: string;
      gender: number;
      real_stat: number;
      apple_name: string;
      sony_name: string;
      tap_name: string;
      reactivate_ticket: string;
    };
  };
};

type GameAccountsResp = TGApp.BBS.Response.BaseWithData & {
  data: { list: Array<TGApp.BBS.Account.GameAccount> };
};
