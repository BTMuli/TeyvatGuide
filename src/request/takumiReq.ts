/**
 * Takumi 相关请求函数
 * @since Beta v0.10.1
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

// TakumiApiBaseUrl => taBu
const taBu: Readonly<string> = "https://api-takumi.mihoyo.com/";

/**
 * 根据gameToken获取stoken
 * @since Beta v0.10.1
 * @param raw - 状态数据
 * @returns stoken响应数据
 */
async function getSTokenByGameToken(
  raw: TGApp.Game.Login.StatPayloadRaw,
): Promise<TGApp.Game.Login.StResp> {
  const data = { account_id: Number(raw.uid), game_token: raw.token };
  const header = {
    ...getRequestHeader({}, "POST", JSON.stringify(data), "X6"),
    "x-rpc-client_type": "4",
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-sys_version": "12",
  };
  const resp = await TGHttps.post<TGApp.Game.Login.StResp>(
    `${taBu}account/ma-cn-session/app/getTokenByGameToken`,
    {
      headers: header,
      body: JSON.stringify(data),
    },
  );
  return resp.data;
}

/**
 * 根据stoken获取action_ticket
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param user - 用户
 * @param actionType - 动作类型
 * @returns action_ticket响应数据
 */
async function getActionTicketBySToken(
  cookie: TGApp.App.Account.Cookie,
  user: TGApp.Sqlite.Account.Game,
  actionType: string,
): Promise<TGApp.BBS.Auth.ActionTicketResp> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const params = { action_type: actionType, stoken: cookie.stoken, uid: user.gameUid };
  const resp = await TGHttps.get<TGApp.BBS.Auth.ActionTicketResp>(
    `${taBu}auth/api/getActionTicketBySToken`,
    {
      headers: getRequestHeader(ck, "GET", params, "K2"),
      query: params,
    },
  );
  return resp.data;
}

/**
 * 生成authkey
 * @since Beta v0.10.1
 * @param cookie - cookie
 * @param account - 账户
 * @returns authkey响应数据
 */
async function genAuthKey(
  cookie: TGApp.App.Account.Cookie,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.Gacha.AuthKeyResp> {
  const ck = { stoken: cookie.stoken, mid: cookie.mid };
  const data = {
    auth_appid: "webview_gacha",
    game_biz: account.gameBiz,
    game_uid: account.gameUid,
    region: account.region,
  };
  const resp = await TGHttps.post<TGApp.Game.Gacha.AuthKeyResp>(`${taBu}binding/api/genAuthKey`, {
    headers: getRequestHeader(ck, "POST", JSON.stringify(data), "LK2", true),
    body: JSON.stringify(data),
  });
  return resp.data;
}

/**
 * 生成authkey-v2，专门用于JSBridge
 * @since Beta v0.10.1
 * @param cookie - cookie
 * @param payload - payload
 * @returns authkey2响应数据
 */
async function genAuthKey2(
  cookie: Record<string, string>,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Auth.AuthKeyResp> {
  const resp = await TGHttps.post<TGApp.BBS.Auth.AuthKeyResp>(`${taBu}binding/api/genAuthKey`, {
    headers: getRequestHeader(cookie, "POST", JSON.stringify(payload), "LK2", true),
    body: JSON.stringify(payload),
  });
  return resp.data;
}

/**
 * 通过cookie获取游戏账号
 * @since Beta v0.10.1
 * @param cookie - cookie
 * @returns 游戏账号响应数据
 */
async function getUserGameRolesByCookie(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Game.AccountResp> {
  const ck = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
  const resp = await TGHttps.get<TGApp.BBS.Game.AccountResp>(
    `${taBu}binding/api/getUserGameRolesByCookie`,
    {
      headers: getRequestHeader(ck, "GET", {}),
    },
  );
  return resp.data;
}

/**
 * 获取卡池信息
 * @since Beta v0.10.1
 * @returns 卡池信息响应数据
 */
async function getObcGachaPool(): Promise<TGApp.BBS.Obc.GachaResp> {
  const resp = await TGHttps.get<TGApp.BBS.Obc.GachaResp>(
    `${taBu}common/blackboard/ys_obc/v1/gacha_pool`,
    {
      headers: { "Content-Type": "application/json" },
      query: { app_sn: "ys_obc" },
    },
  );
  return resp.data;
}

/**
 * 获取热点追踪信息
 * @since Beta v0.10.1
 * @returns 近期活动响应数据
 */
async function getObcHomePosition(): Promise<TGApp.BBS.Obc.PositionResp> {
  const resp = await TGHttps.get<TGApp.BBS.Obc.PositionResp>(
    `${taBu}common/blackboard/ys_obc/v1/home/position`,
    { headers: { "Content-Type": "application/json" }, query: { app_sn: "ys_obc" } },
  );
  return resp.data;
}

const takumiReq = {
  auth: { actionTicket: getActionTicketBySToken },
  bind: { authKey: genAuthKey, authKey2: genAuthKey2, gameRoles: getUserGameRolesByCookie },
  game: { stoken: getSTokenByGameToken },
  obc: { gacha: getObcGachaPool, position: getObcHomePosition },
};

export default takumiReq;
