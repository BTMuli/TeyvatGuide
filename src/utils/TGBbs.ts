/**
 * 关于 BBS 的工具函数
 * @since Beta v0.10.2
 */

/**
 * salt 类型
 * @since Beta v0.9.6
 */
export type SaltKey = "K2" | "LK2" | "X4" | "X6" | "PROD";

const BBS_VERSION: Readonly<string> = "2.106.2";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.10.2
 * @remarks 2.106.2
 */
const BBS_SALT: Readonly<Record<SaltKey, string>> = {
  K2: "f70f2a3fb531ea0960674df467b5ee4c",
  LK2: "e50a686e737180bf5d2d5b988279bcda",
  X4: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  X6: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  PROD: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
