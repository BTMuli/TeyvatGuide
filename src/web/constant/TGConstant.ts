/**
 * @file web constant TGConstant.ts
 * @description 常量
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { BBS_VERSION, BBS_HEADER_AGENT } from "./bbs";
import SALT from "./salt";
import SERVER from "./server";
import { GAME_BIZ } from "./utils";

const TGConstant = {
  BBS: {
    VERSION: BBS_VERSION,
    USER_AGENT: BBS_HEADER_AGENT,
  },
  Salt: SALT,
  Server: SERVER,
  Utils: {
    GAME_BIZ,
  },
};

export default TGConstant;
