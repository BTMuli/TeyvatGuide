/**
 * @file web request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

import { getAbyss } from "./getAbyss";
import { getAnnoList, getAnnoContent } from "./getAnno";
import { getCookieTokenByGameToken, getCookieTokenBySToken } from "./getCookieToken";
// import * from "./getEnkaData.ts";
import { getGameAccountsBySToken, getGameAccountsByCookie } from "./getGameAccounts";
import { getGameRecord } from "./getGameRecord";
import { getLTokenBySToken } from "./getLToken";
import { getGameRoleListByLToken } from "./getRoleList";
import getSyncAvatarDetail from "./getSyncAvatarDetail";
import getSyncAvatarListAll from "./getSyncAvatarListAll";
import { getTokensByLoginTicket } from "./getTokens";
import { getUserInfoByCookie } from "./getUserInfo";
import { verifyLToken } from "./verifyLToken";
import { getStokenByGameToken } from "./getStoken";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
  User: {
    getRecord: getGameRecord,
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
    bgGameToken: {
      getCookieToken: getCookieTokenByGameToken,
      getStoken: getStokenByGameToken,
    },
    calculate: {
      getSyncAvatarListAll,
      getSyncAvatarDetail,
    },
  },
};

export default TGRequest;
