/**
 * @file web request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { getAnnoList, getAnnoContent } from "./getAnno";
import { getCookieTokenBySToken } from "./getCookieToken";
// import * from "./getEnkaData.ts";
import { getGameAccountsBySToken, getGameAccountsByCookie } from "./getGameAccounts";
import { getLTokenBySToken } from "./getLToken";
// import * from "./getRoleList.ts";
// import * from "./getTickets.ts";
import { getTokensByLoginTicket } from "./getTokens";
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
      getAccounts: getGameAccountsByCookie,
    },
    byLToken: {
      verify: verifyLToken,
    },
    bySToken: {
      getAccounts: getGameAccountsBySToken,
      getCookieToken: getCookieTokenBySToken,
      getLToken: getLTokenBySToken,
    },
  },
};

export default TGRequest;
