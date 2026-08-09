/**
 * 关于 BBS 的工具函数
 * @since Beta v0.11.3
 */

import bbsEnum from "@enum/bbs.js";

const BBS_VERSION: Readonly<string> = "2.112.0";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.11.3
 * @remarks 2.112.0
 */
const BBS_SALT: Readonly<Record<TGApp.BBS.Auth.SaltKeyEnum, string>> = {
  [bbsEnum.saltKey.K2]: "5e54bba5a8acdf5981ae2c95e528d56f",
  [bbsEnum.saltKey.LK2]: "720eebad04f745764ea4413fe603f3a9",
  [bbsEnum.saltKey.X4]: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  [bbsEnum.saltKey.X6]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  [bbsEnum.saltKey.PROD]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
