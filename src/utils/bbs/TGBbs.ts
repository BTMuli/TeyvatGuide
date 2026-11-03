/**
 * 关于 BBS 的工具函数
 * @since Beta v0.13.0
 */

import bbsEnum from "@enum/bbs.js";

const BBS_VERSION: Readonly<string> = "2.117.0";
/**
 * 合集接口网页端版本号
 * @since Beta v0.13.0
 * @remarks 与服务端 2.102 版本线绑定，升级版本线时需同步更换 salt
 */
const BBS_COLLECTION_VERSION: Readonly<string> = "2.102.0";
/**
 * 合集接口 salt
 * @since Beta v0.13.0
 * @remarks 合集接口只接受网页端 2.102 版本线的签名
 */
const BBS_COLLECTION_SALT: Readonly<string> = "r3KppdID2yT6ht6P7MxzQykauJj0Cmtg";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.13.0
 * @remarks 2.117.0
 */
const BBS_SALT: Readonly<Record<TGApp.BBS.Auth.SaltKeyEnum, string>> = {
  [bbsEnum.saltKey.K2]: "9c7b896d7483e9070b27c55f1959c4d5",
  [bbsEnum.saltKey.LK2]: "4751cb5557bfad5e249e58462c39fb0a",
  [bbsEnum.saltKey.X4]: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  [bbsEnum.saltKey.X6]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  [bbsEnum.saltKey.PROD]: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = {
  version: BBS_VERSION,
  co: {
    ver: BBS_COLLECTION_VERSION,
    salt: BBS_COLLECTION_SALT,
  },
  ua: BBS_UA_MOBILE,
  uap: BBS_UA_PC,
  salt: BBS_SALT,
};

export default TGBbs;
