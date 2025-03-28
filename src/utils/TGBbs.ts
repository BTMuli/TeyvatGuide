/**
 * @file utils/TGBbs.ts
 * @description 关于 BBS 的工具函数
 * @since Beta v0.7.3
 */

/**
 * @description salt 类型
 * @since Beta v0.7.3
 */
export type SaltKey = "K2" | "LK2" | "X4" | "X6" | "PROD";

const BBS_VERSION: Readonly<string> = "2.85.1";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
const BBS_UA_PC: Readonly<string> = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

/**
 * @description salt 值
 * @version 2.85.1
 * @since Beta v0.7.3
 */
const BBS_SALT: Readonly<Record<SaltKey, string>> = {
  K2: "ss6ZUzUlaWv6iDe0SHPSdCZYr0RSKPdi",
  LK2: "gW20AtTxpc0V5GR3SmsytCLhVBgXtW6I",
  X4: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  X6: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  PROD: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, uap: BBS_UA_PC, salt: BBS_SALT };

export default TGBbs;
