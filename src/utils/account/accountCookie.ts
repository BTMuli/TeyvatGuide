/**
 * 账号 Cookie 的兼容读取、解析与格式化。
 * @since Beta v0.13.2
 */

import { isRecord } from "@utils/common/typeGuards.js";

/**
 * 账号 Cookie 的规范字段与复制顺序。
 * @since Beta v0.13.2
 */
const ACCOUNT_COOKIE_FIELDS: ReadonlyArray<keyof TGApp.App.Account.Cookie> = [
  "account_id_v2",
  "cookie_token_v2",
  "ltoken_v2",
  "ltuid_v2",
  "mid",
  "stoken",
  "stuid",
];

/** 账号 Cookie 规范字段集合，用于解析时判定字段归属。 */
const ACCOUNT_COOKIE_FIELD_NAMES: ReadonlySet<string> = new Set(ACCOUNT_COOKIE_FIELDS);

/** 已失效的旧版 Cookie 字段，仅用于登录提示。 */
const LEGACY_COOKIE_KEYS: ReadonlySet<string> = new Set([
  "account_id",
  "cookie_token",
  "ltoken",
  "ltuid",
]);

/** V2 Cookie 中与规范字段同义的别名。 */
const COOKIE_ALIASES: ReadonlyMap<string, keyof TGApp.App.Account.Cookie> = new Map([
  ["account_mid_v2", "mid"],
  ["ltmid_v2", "mid"],
]);

/**
 * 账号 Cookie 文本解析结果。
 * @since Beta v0.13.2
 */
export type AccountCookieParseResult = {
  /** 规范化后的账号 Cookie */
  cookie: TGApp.App.Account.Cookie;
  /** 文本中出现的已失效旧版字段名 */
  legacyKeys: Array<string>;
};

/**
 * 读取旧存档或新存档中的账号 UID。
 * @since Beta v0.13.2
 * @param value - 存档里的账号标识
 * @returns 字符串 UID
 */
function readUid(value: unknown): string {
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : "";
}

/**
 * 读取存档中的凭据字符串。
 * @since Beta v0.13.2
 * @param value - 存档里的凭据
 * @returns 原始字符串
 */
function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * 按 V2 字段优先读取账号 Cookie，兼容旧 SQLite 数据和备份。
 * @since Beta v0.13.2
 * @param value - 从持久化存储读取的账号 Cookie
 * @returns 应用内使用的账号 Cookie
 */
export function normalizeAccountCookie(value: unknown): TGApp.App.Account.Cookie {
  if (!isRecord(value)) throw new TypeError("账号 Cookie 格式无效");
  return {
    account_id_v2: readUid(
      Object.hasOwn(value, "account_id_v2") ? value.account_id_v2 : value.account_id,
    ),
    cookie_token_v2: readText(
      Object.hasOwn(value, "cookie_token_v2") ? value.cookie_token_v2 : value.cookie_token,
    ),
    ltoken_v2: readText(Object.hasOwn(value, "ltoken_v2") ? value.ltoken_v2 : value.ltoken),
    ltuid_v2: readUid(Object.hasOwn(value, "ltuid_v2") ? value.ltuid_v2 : value.ltuid),
    mid: readText(value.mid ?? value.account_mid_v2 ?? value.ltmid_v2),
    stoken: readText(value.stoken),
    stuid: readUid(value.stuid),
  };
}

/**
 * 判断字段名是否为账号 Cookie 的规范字段。
 * @since Beta v0.13.2
 * @param key - Cookie 字段名
 * @returns 是否为规范字段
 */
function isAccountCookieField(key: string): key is keyof TGApp.App.Account.Cookie {
  return ACCOUNT_COOKIE_FIELD_NAMES.has(key);
}

/**
 * 将账号 Cookie 格式化为可复制的文本。
 * @since Beta v0.13.2
 * @param cookie - 账号 Cookie
 * @returns 以 `;` 分隔的 Cookie 文本，空字段省略
 */
export function formatAccountCookie(cookie: TGApp.App.Account.Cookie): string {
  return ACCOUNT_COOKIE_FIELDS.filter((field) => cookie[field] !== "")
    .map((field) => `${field}=${cookie[field]};`)
    .join("");
}

/**
 * 解析用户粘贴的账号 Cookie 文本。
 * @since Beta v0.13.2
 * @param input - Cookie 文本，支持 `;`、换行分隔与 V2 字段别名
 * @returns 规范化 Cookie 与已失效的旧版字段名
 * @remarks V2 的 ltuid_v2/account_id_v2、ltmid_v2/account_mid_v2 可作为 stuid、mid 来源；旧版字段仅用于提示
 */
export function parseAccountCookie(input: string): AccountCookieParseResult {
  const canonical: Partial<Record<keyof TGApp.App.Account.Cookie, string>> = {};
  const aliased: Partial<Record<keyof TGApp.App.Account.Cookie, string>> = {};
  const legacyKeys: Array<string> = [];
  for (const segment of input.split(/[;\r\n]+/u)) {
    const text = segment.trim();
    if (text === "") continue;
    const separator = text.indexOf("=");
    if (separator <= 0) continue;
    const key = text.slice(0, separator).trim();
    const value = text.slice(separator + 1).trim();
    if (value === "") continue;
    if (isAccountCookieField(key)) {
      canonical[key] = value;
      continue;
    }
    const alias = COOKIE_ALIASES.get(key);
    if (alias !== undefined) {
      aliased[alias] = value;
      continue;
    }
    if (LEGACY_COOKIE_KEYS.has(key) && !legacyKeys.includes(key)) legacyKeys.push(key);
  }
  const read = (field: keyof TGApp.App.Account.Cookie): string =>
    canonical[field] ?? aliased[field] ?? "";
  const uid = read("ltuid_v2") || read("account_id_v2") || read("stuid");
  return {
    cookie: {
      account_id_v2: read("account_id_v2") || uid,
      cookie_token_v2: read("cookie_token_v2"),
      ltoken_v2: read("ltoken_v2"),
      ltuid_v2: read("ltuid_v2") || uid,
      mid: read("mid"),
      stoken: read("stoken"),
      stuid: read("stuid") || uid,
    },
    legacyKeys,
  };
}

/**
 * 判断账号 Cookie 是否具备 stoken 换票所需的凭据。
 * @since Beta v0.13.2
 * @param cookie - 账号 Cookie
 * @returns 是否同时具备 stuid、stoken 与 mid
 */
export function hasSTokenCredentials(cookie: TGApp.App.Account.Cookie): boolean {
  return cookie.stuid.trim() !== "" && cookie.stoken.trim() !== "" && cookie.mid.trim() !== "";
}

/**
 * 提取 CookieToken V2 及配套账号字段。
 * @since Beta v0.13.2
 * @param cookie - 账号凭据
 * @returns 请求使用的 CookieToken V2 字段
 */
export function getCookieTokenCookie(
  cookie: Pick<TGApp.App.Account.Cookie, "account_id_v2" | "cookie_token_v2" | "mid">,
): TGApp.App.Account.CookieTokenCookie {
  return {
    account_id_v2: cookie.account_id_v2,
    account_mid_v2: cookie.mid,
    cookie_token_v2: cookie.cookie_token_v2,
  };
}

/**
 * 提取 LToken V2 及配套账号字段。
 * @since Beta v0.13.2
 * @param cookie - 账号凭据
 * @returns 请求使用的 LToken V2 字段
 */
export function getLTokenCookie(
  cookie: Pick<TGApp.App.Account.Cookie, "ltoken_v2" | "ltuid_v2" | "mid">,
): TGApp.App.Account.LoginCookie {
  return {
    ltmid_v2: cookie.mid,
    ltoken_v2: cookie.ltoken_v2,
    ltuid_v2: cookie.ltuid_v2,
  };
}

/**
 * 提取米游社网页会话的 V2 Cookie。
 * @since Beta v0.13.2
 * @param cookie - 当前账号的凭据
 * @returns 两组 V2 凭据及各自的 MID 字段
 */
export function getWebAccountCookies(cookie: TGApp.App.Account.Cookie): Record<string, string> {
  return {
    ...getCookieTokenCookie(cookie),
    ...getLTokenCookie(cookie),
  };
}
