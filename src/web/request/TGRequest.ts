/**
 * @file web/request/TGRequest.ts
 * @description 应用用到的请求函数
 * @since Beta v0.4.5
 */

import { genAuthkey, genAuthkey2 } from "./genAuthkey";
import { getAbyss } from "./getAbyss";
import { getActionTicketBySToken } from "./getActionTicket";
import { getAnnoContent, getAnnoList } from "./getAnno";
import { getCookieTokenByGameToken, getCookieTokenBySToken } from "./getCookieToken";
import { getDeviceFp } from "./getDeviceFp";
// import * from "./getEnkaData.ts";
import { getGachaLog } from "./getGachaLog";
import { getGameAccountsByCookie, getGameAccountsBySToken } from "./getGameAccounts";
import { getGameRecord } from "./getGameRecord";
import { getLTokenBySToken } from "./getLToken";
import { getGameRoleListByLToken } from "./getRoleList";
import { getStokenByGameToken, getTokenBySToken } from "./getStoken";
import getSyncAvatarDetail from "./getSyncAvatarDetail";
import getSyncAvatarListAll from "./getSyncAvatarListAll";
import { getTokensByLoginTicket } from "./getTokens";
import { getUserCollect } from "./getUserCollect";
import { getUserInfoByCookie } from "./getUserInfo";
import { verifyLToken } from "./verifyLToken";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
  Device: {
    getFp: getDeviceFp,
  },
  User: {
    getAuthkey: genAuthkey,
    getAuthkey2: genAuthkey2,
    getCollect: getUserCollect,
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
      update: getTokenBySToken,
      getAccounts: getGameAccountsBySToken,
      getCookieToken: getCookieTokenBySToken,
      getLToken: getLTokenBySToken,
      getActionTicket: getActionTicketBySToken,
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
