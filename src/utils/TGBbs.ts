/**
 * 关于 BBS 的工具函数
 * @since Beta v0.12.2
 */

import bbsEnum from "@enum/bbs.js";

const BBS_VERSION: Readonly<string> = "2.115.0";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.12.2
 * @remarks 2.115.0
 */
const BBS_SALT: Readonly<Record<TGApp.BBS.Auth.SaltKeyEnum, string>> = {
  [bbsEnum.saltKey.K2]: "09d39d16528ca0e4900a39ecc07d5062",
  [bbsEnum.saltKey.LK2]: "b99b74d9023a6511231be2c7209b6fdb",
  [bbsEnum.saltKey.X4]: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  [bbsEnum.saltKey.X6]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  [bbsEnum.saltKey.PROD]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
