/**
 * @file web constant TGConstant.ts
 * @description 常量
 * @since Beta v0.3.3
 */

import { BBS_VERSION, BBS_HEADER_AGENT, BBS_APP_ID, BBS_SALT } from "./bbs";
import SERVER from "./server";
import { GAME_BIZ } from "./utils";

const TGConstant = {
  BBS: {
    VERSION: BBS_VERSION,
    USER_AGENT: BBS_HEADER_AGENT,
    APP_ID: BBS_APP_ID,
  },
  Salt: BBS_SALT,
  Server: SERVER,
  Utils: {
    GAME_BIZ,
  },
};

export default TGConstant;
