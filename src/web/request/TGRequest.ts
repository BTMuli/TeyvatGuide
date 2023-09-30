/**
 * @file web request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

import { genAuthkey } from "./genAuthkey";
import { getAbyss } from "./getAbyss";
import { getAnnoContent, getAnnoList } from "./getAnno";
import { getCookieTokenByGameToken, getCookieTokenBySToken } from "./getCookieToken";
// import * from "./getEnkaData.ts";
import { getGachaLog } from "./getGachaLog";
import { getGameAccountsByCookie, getGameAccountsBySToken } from "./getGameAccounts";
import { getGameRecord } from "./getGameRecord";
import { getLTokenBySToken } from "./getLToken";
import { getGameRoleListByLToken } from "./getRoleList";
import { getStokenByGameToken } from "./getStoken";
import getSyncAvatarDetail from "./getSyncAvatarDetail";
import getSyncAvatarListAll from "./getSyncAvatarListAll";
import { getTokensByLoginTicket } from "./getTokens";
import { getUserInfoByCookie } from "./getUserInfo";
import { getVerification, submitVerification } from "./operVerification";
import { verifyLToken } from "./verifyLToken";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
  User: {
    getAuthkey: genAuthkey,
    getGachaLog,
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
    verification: {
      get: getVerification,
      verify: submitVerification,
    },
  },
};

export default TGRequest;
