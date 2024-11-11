/**
 * @file web/request/TGRequest.ts
 * @description 应用用到的请求函数
 * @since Beta v0.6.3
 */

import { genAuthkey, genAuthkey2 } from "./genAuthkey.js";
import { getAbyss } from "./getAbyss.js";
import { getActionTicketBySToken } from "./getActionTicket.js";
import { getAnnoContent, getAnnoList } from "./getAnno.js";
import getAuthTicket from "./getAuthTicket.js";
import { getAvatarList, getAvatarDetail, getAvatarIndex } from "./getAvatarDetail.js";
import getCode from "./getCode.js";
import { getCookieTokenByGameToken, getCookieTokenBySToken } from "./getCookieToken.js";
import { getDeviceFp } from "./getDeviceFp.js";
import { getGachaLog } from "./getGachaLog.js";
import { getGameAccountsByCookie, getGameAccountsBySToken } from "./getGameAccounts.js";
import { getGameRecord } from "./getGameRecord.js";
import { getLTokenBySToken } from "./getLToken.js";
import { getRoleCombat } from "./getRoleCombat.js";
import { getStokenByGameToken, getTokenBySToken } from "./getStoken.js";
import { getUserCollect } from "./getUserCollect.js";
import { getUserInfoByCookie } from "./getUserInfo.js";
import { verifyLToken } from "./verifyLToken.js";

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
    getAuthTicket,
    getCollect: getUserCollect,
    getGachaLog,
    getRecord: getGameRecord,
    verifyLToken,
    byCookie: {
      getAbyss,
      getAccounts: getGameAccountsByCookie,
      getUserInfo: getUserInfoByCookie,
      getAvatarIndex,
      getAvatarList,
      getAvatarDetail,
      getCombat: getRoleCombat,
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
  },
  Nav: {
    getCode,
  },
};

export default TGRequest;
