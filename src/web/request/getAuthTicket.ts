/**
 * @files web/request/getAuthTicket.ts
 * @description 获取登录 ticket
 * @since Beta v0.6.0
 */

import TGHttp from "../../utils/TGHttp.js";

/**
 * @description 获取登录ticket
 * @since Beta v0.6.0
 * @param {TGApp.Sqlite.Account.Game} account - 账户
 * @param {TGApp.App.Account.Cookie} cookie - cookie
 * @returns {Promise<TGApp.BBS.Response.Base|string>}
 */
async function getAuthTicket(
  account: TGApp.Sqlite.Account.Game,
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.Response.Base | string> {
  const url =
    "https://passport-api.mihoyo.com/account/ma-cn-verifier/app/createAuthTicketByGameBiz";
  const params = {
    game_biz: account.gameBiz,
    stoken: cookie.stoken,
    uid: account.gameUid,
    mid: cookie.mid,
  };
  const header = {
    "x-rpc-client_type": "3",
    "x-rpc-app_id": "ddxf5dufpuyo",
  };
  const resp = await TGHttp<TGApp.BBS.Response.getAuthTicketByGameBiz>(url, {
    method: "POST",
    headers: header,
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.ticket;
}

export default getAuthTicket;
