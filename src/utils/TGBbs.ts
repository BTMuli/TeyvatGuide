/**
 * 关于 BBS 的工具函数
 * @since Beta v0.11.0
 */

/**
 * salt 类型
 * @since Beta v0.9.6
 */
export type SaltKey = "K2" | "LK2" | "X4" | "X6" | "PROD";

const BBS_VERSION: Readonly<string> = "2.109.0";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.11.0
 * @remarks 2.109.0
 */
const BBS_SALT: Readonly<Record<SaltKey, string>> = {
  K2: "47f15f1b66bee46b816115d8e8e6ebb6",
  LK2: "d9200c846b10886e8c874fc33c8f308b",
  X4: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  X6: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  PROD: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
