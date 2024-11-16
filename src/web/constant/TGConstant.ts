/**
 * @file web/constant/TGConstant.ts
 * @description 常量
 * @since Beta v0.6.3
 */

import {
  BBS_APP_ID,
  BBS_SALT,
  BBS_UA_MOBILE,
  BBS_UA_PC,
  BBS_VERSION,
  CHANNEL_LIST,
} from "./bbs.js";
import { GAME_BIZ } from "./utils.js";

const TGConstant = {
  BBS: {
    VERSION: BBS_VERSION,
    UA_PC: BBS_UA_PC,
    UA_MOBILE: BBS_UA_MOBILE,
    APP_ID: BBS_APP_ID,
    CHANNELS: CHANNEL_LIST,
  },
  Salt: BBS_SALT,
  GAME_BIZ,
};

export default TGConstant;
