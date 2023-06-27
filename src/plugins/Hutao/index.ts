/**
 * @file plugins Hutao index.ts
 * @description Hutao 插件入口
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

import getAvatarCollect from "./request/getAvatarCollect";
import getAvatarHoldRate from "./request/getAvatarHoldRate";
import getAvatarUpRate from "./request/getAvatarUpRate";
import getAvatarUseRate from "./request/getAvatarUseRate";
import getOverview from "./request/getOverview";
import getTeamCollect from "./request/getTeamCollect";
import { checkUid, getUserData } from "./request/getUserData";
import getWeaponCollect from "./request/getWeaponCollect";
import uploadData from "./request/uploadData";
import { transAvatars, transLocal } from "./utils/transLocal";

const HutaoRequest = {
  Abyss: {
    avatar: {
      getCollect: getAvatarCollect,
      getHoldRate: getAvatarHoldRate,
      getUpRate: getAvatarUpRate,
      getUseRate: getAvatarUseRate,
    },
    getOverview,
    getTeamCollect,
    user: {
      checkExist: checkUid,
      getRecord: getUserData,
    },
    getWeaponCollect,
    postData: uploadData,
    utils: {
      transData: transLocal,
      transAvatars,
    },
  },
};

export default HutaoRequest;
