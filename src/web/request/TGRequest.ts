/**
 * @file web request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

import { getAbyss } from "./getAbyss";
import { getAnnoList, getAnnoContent } from "./getAnno";
import { getCookieTokenBySToken } from "./getCookieToken";
// import * from "./getEnkaData.ts";
import { getGameAccountsBySToken, getGameAccountsByCookie } from "./getGameAccounts";
import { getLTokenBySToken } from "./getLToken";
import { getGameRoleListByLToken } from "./getRoleList";
// import * from "./getTickets.ts";
import { getTokensByLoginTicket } from "./getTokens";
import { getUserInfoByCookie } from "./getUserInfo";
// import * from "./getUserCard";
import initCookie from "./initCookie";
import { verifyLToken } from "./verifyLToken";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
  User: {
    init: initCookie,
    byLoginTicket: {
      getTokens: getTokensByLoginTicket,
    },
    byCookie: {
      getAbyss,
      getAccounts: getGameAccountsByCookie,
      getUserInfo: getUserInfoByCookie,
    },
    byLToken: {
      verify: verifyLToken,
      getRoleList: getGameRoleListByLToken,
    },
    bySToken: {
      getAccounts: getGameAccountsBySToken,
      getCookieToken: getCookieTokenBySToken,
      getLToken: getLTokenBySToken,
    },
  },
};

export default TGRequest;
