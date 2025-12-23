/**
 * Hutao 插件入口
 * @since Beta v0.6.3
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
import { getCombatStatistic, uploadCombatData } from "./request/combatReq.js";
import { transAbyssAvatars, transAbyssLocal } from "./utils/abyssUtil.js";
import { transCombatLocal } from "./utils/combatUtil.js";

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
};

export default Hutao;
