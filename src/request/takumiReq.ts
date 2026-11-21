/**
 * Takumi 相关请求函数
 * @since Beta v0.14.1
 */
import { getWebAccountCookies } from "@utils/account/accountCookie.js";
import { getAppSignCookie, getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

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
 * @since Beta v0.14.1
 * @param cookie - 含 stoken 与 mid 的账号凭据
 * @param payload - payload
 * @returns authkey2响应数据
 */
async function genAuthKey2(
  cookie: Pick<TGApp.App.Account.Cookie, "mid" | "stoken">,
  payload: Record<string, string>,
): Promise<TGApp.BBS.Auth.AuthKeyResp> {
  const resp = await TGHttps.post<TGApp.BBS.Auth.AuthKeyResp>(`${taBu}binding/api/genAuthKey`, {
    headers: getRequestHeader(cookie, "POST", JSON.stringify(payload), "LK2", true),
    body: JSON.stringify(payload),
  });
  return resp.data;
}

/**
 * 米游社角色列表的响应格式，角色等级可为数字。
 * @since Beta v0.13.2
 */
type GameRoleListResp = TGApp.BBS.Response.BaseWithData<{
  list: Array<Omit<TGApp.BBS.Game.Account, "level"> & { level: number | string }>;
}>;

/**
 * 使用 stoken 获取当前账号绑定的游戏角色
 * @since Beta v0.13.2
 * @param cookie - 含 stuid、stoken、mid 和 ltuid_v2 的凭据
 * @returns 游戏账号响应数据
 */
async function getUserGameRolesByStoken(
  cookie: TGApp.App.Account.SignUidCookie,
): Promise<TGApp.BBS.Game.AccountResp> {
  const ck = getAppSignCookie(cookie);
  const { data: response } = await TGHttps.get<GameRoleListResp>(
    "https://api-takumi.miyoushe.com/binding/api/getUserGameRolesByStoken",
    {
      headers: {
        ...getRequestHeader(ck, "GET", {}, "K2", true),
        "x-rpc-client_type": "2",
      },
    },
  );
  if (response.retcode !== 0) return <TGApp.BBS.Game.AccountResp>response;
  const list = response.data.list.map((role) => ({ ...role, level: String(role.level) }));
  return { ...response, data: { ...response.data, list } };
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

/**
 * 批量计算角色或武器养成材料
 * @since Beta v0.13.2
 * @param cookie - 用户 Cookie
 * @param params - 养成计算参数
 * @returns 养成计算响应数据
 */
async function batchCompute(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.Game.Calculate.Params,
): Promise<TGApp.Game.Calculate.Resp> {
  const ck = getWebAccountCookies(cookie);
  const body = JSON.stringify(params);
  const headers = {
    ...getRequestHeader(ck, "POST", body),
    "Content-Type": "application/json",
    "x-rpc-cal_type": "0",
  };
  const resp = await TGHttps.post<TGApp.Game.Calculate.Resp>(
    `${taBu}event/e20200928calculate/v3/batch_compute`,
    { headers, body },
  );
  return resp.data;
}

/**
 * 获取全部可养成角色
 * @since Beta v0.13.2
 * @param cookie - 用户 Cookie
 * @param params - 角色列表参数
 * @returns 角色列表响应数据
 */
async function getAvatarList(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.Game.Calculate.AvatarListParams,
): Promise<TGApp.Game.Calculate.AvatarListResp> {
  const ck = getWebAccountCookies(cookie);
  const body = JSON.stringify(params);
  const headers = {
    ...getRequestHeader(ck, "POST", body),
    "Content-Type": "application/json",
  };
  const resp = await TGHttps.post<TGApp.Game.Calculate.AvatarListResp>(
    `${taBu}event/e20200928calculate/v1/avatar/list`,
    { headers, body },
  );
  return resp.data;
}

/**
 * 获取全部可养成武器
 * @since Beta v0.13.2
 * @param cookie - 用户 Cookie
 * @param params - 武器列表参数
 * @returns 武器列表响应数据
 */
async function getWeaponList(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.Game.Calculate.WeaponListParams,
): Promise<TGApp.Game.Calculate.WeaponListResp> {
  const ck = getWebAccountCookies(cookie);
  const body = JSON.stringify(params);
  const headers = {
    ...getRequestHeader(ck, "POST", body),
    "Content-Type": "application/json",
  };
  const resp = await TGHttps.post<TGApp.Game.Calculate.WeaponListResp>(
    `${taBu}event/e20200928calculate/v1/weapon/list`,
    { headers, body },
  );
  return resp.data;
}

/**
 * 同步用户角色列表
 * @since Beta v0.13.2
 * @param cookie - 用户 Cookie
 * @param params - 同步角色列表参数
 * @returns 同步角色列表响应数据
 */
async function syncAvatarList(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.Game.Calculate.SyncAvatarParams,
): Promise<TGApp.Game.Calculate.SyncAvatarResp> {
  const ck = getWebAccountCookies(cookie);
  const body = JSON.stringify(params);
  const headers = {
    ...getRequestHeader(ck, "POST", body),
    "Content-Type": "application/json",
  };
  const resp = await TGHttps.post<TGApp.Game.Calculate.SyncAvatarResp>(
    `${taBu}event/e20200928calculate/v1/sync/avatar/list`,
    { headers, body },
  );
  return resp.data;
}

const takumiReq = {
  auth: { actionTicket: getActionTicketBySToken },
  bind: { authKey: genAuthKey, authKey2: genAuthKey2, gameRoles: getUserGameRolesByStoken },
  calculate: {
    avatar: { list: getAvatarList, sync: syncAvatarList },
    batch: batchCompute,
    weapon: { list: getWeaponList },
  },
  game: { stoken: getSTokenByGameToken },
  obc: { gacha: getObcGachaPool, position: getObcHomePosition },
};

export default takumiReq;
