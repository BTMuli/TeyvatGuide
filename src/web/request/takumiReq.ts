/**
 * @file web/request/takumiReq.ts
 * @description Takumi 相关请求函数
 * @since Beta v0.7.2
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
 * @since Beta v0.7.2
 * @param {TGApp.App.Account.Cookie} cookie Cookie
 * @param {TGApp.Sqlite.Account.Game} user 用户
 * @param {string} actionType 动作类型
 * @returns {Promise<TGApp.BBS.Response.Base>}
 */
async function getActionTicketBySToken(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  actionType: string,
): Promise<TGApp.BBS.Response.Base> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { action_type: actionType, stoken: cookie.stoken, uid: user.gameUid };
  return await TGHttp<TGApp.BBS.Response.Base>(`${taBu}auth/api/getActionTicketBySToken`, {
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
 * @since Beta v0.7.2
 * @param {TGApp.App.Account.Cookie} cookie cookie
 * @returns {Promise<TGApp.BBS.Account.GameAccount[]|TGApp.BBS.Response.Base>}
 */
async function getUserGameRolesByCookie(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Account.GameAccount[] | TGApp.BBS.Response.Base> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const params = { game_biz: "hk4e_cn" };
  type ResType = { list: Array<TGApp.BBS.Account.GameAccount> };
  const resp = await TGHttp<TGApp.BBS.Response.BaseWithData<ResType>>(
    `${taBu}binding/api/getUserGameRolesByCookie`,
    {
      method: "GET",
      headers: getRequestHeader(ck, "GET", params),
      query: params,
    },
  );
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.list;
}

/**
 * @description 获取卡池信息
 * @since Beta v0.7.2
 * @return {Promise<Array<TGApp.BBS.Obc.GachaItem>>}
 */
async function getObcGachaPool(): Promise<Array<TGApp.BBS.Obc.GachaItem>> {
  const resp = await TGHttp<TGApp.BBS.Obc.GachaResp>(
    `${taBu}common/blackboard/ys_obc/v1/gacha_pool`,
    {
      method: "GET",
      query: { app_sn: "ys_obc" },
      headers: { "Content-Type": "application/json" },
    },
  );
  return resp.data.list;
}

/**
 * @description 深度优先遍历
 * @since Beta v0.7.2
 * @param {Array<TGApp.BBS.Obc.ObcItem<TGApp.BBS.Obc.PositionItem>>} list 列表
 * @returns {Array<TGApp.BBS.Obc.PositionItem>} 返回列表
 */
function DfsObc(
  list: Array<TGApp.BBS.Obc.ObcItem<TGApp.BBS.Obc.PositionItem>>,
): Array<TGApp.BBS.Obc.PositionItem> {
  const res: Array<TGApp.BBS.Obc.PositionItem> = [];
  for (const item of list) {
    if (item.name === "近期活动") res.push(...item.list);
    if (item.children) res.push(...DfsObc(item.children));
  }
  return res;
}

/**
 * @description 获取热点追踪信息
 * @since Beta v0.7.2
 * @return {Promise<Array<TGApp.BBS.Obc.PositionItem>>}
 */
async function getObcHomePosition(): Promise<Array<TGApp.BBS.Obc.PositionItem>> {
  const resp = await TGHttp<TGApp.BBS.Obc.PositionResp>(
    `${taBu}common/blackboard/ys_obc/v1/home/position`,
    {
      method: "GET",
      query: { app_sn: "ys_obc" },
      headers: { "Content-Type": "application/json" },
    },
  );
  const data = resp.data.list;
  return DfsObc(data);
}

const TakumiApi = {
  auth: { actionTicket: getActionTicketBySToken },
  bind: { authKey: genAuthKey, authKey2: genAuthKey2, gameRoles: getUserGameRolesByCookie },
  game: { stoken: getSTokenByGameToken },
  obc: { gacha: getObcGachaPool, position: getObcHomePosition },
};

export default TakumiApi;
