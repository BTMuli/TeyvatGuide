/**
 * @file web/request/TGRequest.ts
 * @description 应用用到的请求函数
 * @since Beta v0.5.3
 */

import { genAuthkey, genAuthkey2 } from "./genAuthkey.js";
import { getAbyss } from "./getAbyss.js";
import { getActionTicketBySToken } from "./getActionTicket.js";
import { getAnnoContent, getAnnoList } from "./getAnno.js";
import { getAvatarList, getAvatarDetail } from "./getAvatarDetail.js";
import getCode from "./getCode.js";
import { getCookieTokenByGameToken, getCookieTokenBySToken } from "./getCookieToken.js";
import { getDeviceFp } from "./getDeviceFp.js";
import { getGachaLog } from "./getGachaLog.js";
import { getGameAccountsByCookie, getGameAccountsBySToken } from "./getGameAccounts.js";
import { getGameRecord } from "./getGameRecord.js";
import { getLTokenBySToken } from "./getLToken.js";
import { getGameRoleListByLToken } from "./getRoleList.js";
import { getStokenByGameToken, getTokenBySToken } from "./getStoken.js";
import getSyncAvatarDetail from "./getSyncAvatarDetail.js";
import getSyncAvatarListAll from "./getSyncAvatarListAll.js";
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
    getCollect: getUserCollect,
    getGachaLog,
    getRecord: getGameRecord,
    byCookie: {
      getAbyss,
      getAccounts: getGameAccountsByCookie,
      getUserInfo: getUserInfoByCookie,
      getAvatarList,
      getAvatarDetail,
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
  Nav: {
    getCode,
  },
};

export default TGRequest;
