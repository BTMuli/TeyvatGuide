/**
 * @file web request getDailyNotes.ts
 * @description 获取实时便笺
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import TGApi from "../api/TGApi";
// utils
import { getRequestHeader } from "../utils/getRequestHeader";

/**
 * @description 获取实时便笺
 * @since Alpha v0.2.2
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.Sqlite.Account.Game} account 游戏账号
 * @returns {Promise<TGApp.Game.DailyNotes.FullInfo|TGApp.App.Base.Response>}
 */
export async function getDailyNotes(
  cookie: Record<string, string>,
  account: TGApp.Sqlite.Account.Game,
): Promise<TGApp.Game.DailyNotes.FullInfo | TGApp.BBS.Response.Base> {
  const url = TGApi.GameData.getDailyNotes;
  const role_id = account.gameUid;
  const params = { role_id, server: account.region };
  const header = getRequestHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.Game.DailyNotes.Response>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}

/**
 * @description 获取极验验证码
 * @since Alpha v0.2.2
 * @param {Record<string, string>} cookie cookie
 * @returns {Promise<TGApp.App.Base.Response|TGApp.BBS.Geetest.getData>}
 */
export async function getGeeTest(
  cookie: Record<string, string>,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.Geetest.getData> {
  const url = "https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/createVerification";
  const params = { is_high: "true" };
  const header = getRequestHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Geetest.getResponse>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}

/**
 * @description 发送极验验证码
 * @since Alpha v0.2.2
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.BBS.Geetest.postData} geetest 极验验证的请求数据
 * @returns {Promise<TGApp.BBS.Response.Base>}
 */
export async function postGeeTest(
  cookie: Record<string, string>,
  geetest: TGApp.BBS.Geetest.postData,
): Promise<TGApp.BBS.Response.Base> {
  const url = "https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/verifyVerification";
  const data = {
    geetest_challenge: geetest.challenge,
    geetest_seccode: `${geetest.validate}|jordan`,
    geetest_validate: geetest.validate,
  };
  const header = getRequestHeader(cookie, "POST", data, "common");
  console.log(header);
  console.log(cookie);
  console.log(data);
  return await http
    .fetch<TGApp.BBS.Response.Base>(url, {
      headers: header,
      method: "POST",
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}
