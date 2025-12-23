/**
 * 关于 BBS 的工具函数
 * @since Beta v0.8.4
 */

/**
 * salt 类型
 * @since Beta v0.8.4
 */
export type SaltKey = "K2" | "LK2" | "X4" | "X6" | "PROD";

const BBS_VERSION: Readonly<string> = "2.95.1";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * salt 值
 * @since Beta v0.8.4
 * @remarks 2.95.1
 */
const BBS_SALT: Readonly<Record<SaltKey, string>> = {
  K2: "sfYPEgpxkOe1I3XVMLdwp1Lyt9ORgZsq",
  LK2: "sidQFEglajEz7FA0Aj7HQPV88zpf17SO",
  X4: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  X6: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  PROD: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
