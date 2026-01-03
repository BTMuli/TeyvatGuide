/**
 * Hutao 插件入口
 * @since Beta v0.9.1
 */

import {
  getAbyssOverview,
  getAvatarCollect,
  getAvatarHoldRate,
  getAvatarUpRate,
  getAvatarUseRate,
  getTeamCollect,
  uploadAbyssData,
} from "./request/abyssReq.js";
import { getUserInfo, loginPassport, refreshToken } from "./request/accountReq.js";
import { getCombatStatistic, uploadCombatData } from "./request/combatReq.js";
import { transAbyssAvatars, transAbyssLocal } from "./utils/abyssUtil.js";
import { transCombatLocal } from "./utils/combatUtil.js";

const _ = "Not Implemented";

const Hutao = {
  Abyss: {
    avatar: {
      collect: getAvatarCollect,
      hold: getAvatarHoldRate,
      up: getAvatarUpRate,
      use: getAvatarUseRate,
    },
    overview: getAbyssOverview,
    team: getTeamCollect,
    upload: uploadAbyssData,
    utils: {
      transData: transAbyssLocal,
      transAvatars: transAbyssAvatars,
    },
  },
  Combat: {
    upload: uploadCombatData,
    data: getCombatStatistic,
    trans: transCombatLocal,
  },
  Account: {
    register: _,
    login: loginPassport,
    verify: _,
    cancel: _,
    reset: {
      username: _,
      password: _,
    },
    token: {
      refresh: refreshToken,
      revoke: _,
      revokeAll: _,
    },
    info: getUserInfo,
  },
  Gacha: {
    log: _,
    upload: _,
    delete: _,
  },
};

export default Hutao;
