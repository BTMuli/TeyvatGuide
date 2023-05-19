/**
 * @file web request initCookie.ts
 * @description 首次输入 cookie 后的一系列请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// utils
import TGSqlite from "../../utils/TGSqlite";
// request
import { getTokensByLoginTicket } from "./getTokens";
import { getCookieTokenBySToken } from "./getCookieToken";
import { verifyLToken } from "./verifyLToken";

/**
 * @description 根据输入 cookie 获取一堆 token
 * @since Alpha v0.2.0
 * @param {string} ticket login_ticket
 * @param {string} uid login_uid
 * @returns {Promise<void>}
 */
async function initCookie (ticket: string, uid: string): Promise<void> {
  const tokenRes = await getTokensByLoginTicket(ticket, uid);
  const cookie: BTMuli.User.Base.Cookie = {
    account_id: uid,
    cookie_token: "",
    login_ticket: ticket,
    mid: "",
    login_uid: uid,
    ltoken: "",
    ltuid: uid,
    stoken: "",
    stuid: uid,
  };
  if (Array.isArray(tokenRes)) {
    const lToken = tokenRes.find((item) => item.name === "ltoken");
    const sToken = tokenRes.find((item) => item.name === "stoken");
    if (lToken) {
      await TGSqlite.saveAppData("ltoken", lToken.token);
      cookie.ltoken = lToken.token;
    }
    if (sToken) {
      await TGSqlite.saveAppData("stoken", sToken.token);
      cookie.stoken = sToken.token;
    }
    const cookieToken = await getCookieTokenBySToken(uid, cookie.stoken);
    if (typeof cookieToken === "string") cookie.cookie_token = cookieToken;
    const mid = await verifyLToken(cookie.ltoken, cookie.ltuid, cookie.stoken);
    if (typeof mid === "string") cookie.mid = mid;
    await TGSqlite.saveAppData("cookie", JSON.stringify(cookie));
  }
}

export default initCookie;
