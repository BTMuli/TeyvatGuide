/**
 * @file core request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { getAnnoList, getAnnoContent } from "./getAnno";
import { getTokensByLoginTicket, getLtokenByStoken, getCookieTokenByStoken, vetifyStoken } from "./getTokens";
import { getGameCard, getGameRoles } from "./getGameData";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
  User: {
    getTokens: getTokensByLoginTicket,
    getLToken: getLtokenByStoken,
    getCookieToken: getCookieTokenByStoken,
    vetifyStoken,
    getGameCard,
    getGameRoles,
  },
};

export default TGRequest;
