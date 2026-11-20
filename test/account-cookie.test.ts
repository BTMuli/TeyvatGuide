/**
 * 账号 Cookie 规范化与文本解析回归测试。
 * @since Beta v0.13.2
 */

import { describe, expect, it } from "vitest";

import {
  formatAccountCookie,
  hasSTokenCredentials,
  normalizeAccountCookie,
  parseAccountCookie,
} from "../src/utils/account/accountCookie.js";

const canonicalCookie: TGApp.App.Account.Cookie = {
  account_id_v2: "100000001",
  cookie_token_v2: "cookie-token-v2",
  ltoken_v2: "ltoken-v2",
  ltuid_v2: "100000001",
  mid: "mid-v2",
  stoken: "stoken",
  stuid: "100000001",
};

describe("normalizeAccountCookie", () => {
  it("defaults missing credentials to empty strings", () => {
    expect(normalizeAccountCookie({})).toEqual({
      account_id_v2: "",
      cookie_token_v2: "",
      ltoken_v2: "",
      ltuid_v2: "",
      mid: "",
      stoken: "",
      stuid: "",
    });
  });

  it("keeps canonical V2 fields and ignores unknown persisted fields", () => {
    const normalized = normalizeAccountCookie({ ...canonicalCookie, unknown: "ignored" });

    expect(normalized).toEqual(canonicalCookie);
    expect(normalized).not.toHaveProperty("unknown");
  });

  it("maps legacy persisted fields and numeric IDs into the canonical shape", () => {
    expect(
      normalizeAccountCookie({
        account_id: 100000001,
        cookie_token: "legacy-cookie-token",
        ltoken: "legacy-ltoken",
        ltuid: 100000001,
        mid: "legacy-mid",
        stoken: "legacy-stoken",
        stuid: 100000001,
        backup_only: true,
      }),
    ).toEqual({
      account_id_v2: "100000001",
      cookie_token_v2: "legacy-cookie-token",
      ltoken_v2: "legacy-ltoken",
      ltuid_v2: "100000001",
      mid: "legacy-mid",
      stoken: "legacy-stoken",
      stuid: "100000001",
    });
  });

  it("prefers canonical fields over legacy aliases even when canonical values are empty", () => {
    expect(
      normalizeAccountCookie({
        account_id_v2: "",
        account_id: "legacy-account",
        cookie_token_v2: "",
        cookie_token: "legacy-cookie-token",
        ltoken_v2: "",
        ltoken: "legacy-ltoken",
        ltuid_v2: "",
        ltuid: "100000001",
        mid: "",
        stoken: "stoken",
        stuid: "",
      }),
    ).toEqual({
      account_id_v2: "",
      cookie_token_v2: "",
      ltoken_v2: "",
      ltuid_v2: "",
      mid: "",
      stoken: "stoken",
      stuid: "",
    });
  });

  it("is idempotent after normalization", () => {
    const normalized = normalizeAccountCookie({
      account_id: 100000001,
      cookie_token: "cookie-token",
      ltoken: "ltoken",
      ltuid: 100000001,
      mid: "mid",
      stoken: "stoken",
      stuid: 100000001,
    });

    expect(normalizeAccountCookie(normalized)).toEqual(normalized);
  });

  it.each([null, [], "cookie", 1, undefined])("rejects non-object input: %j", (value) => {
    expect(() => normalizeAccountCookie(value)).toThrow(TypeError);
  });
});

describe("formatAccountCookie", () => {
  it("keeps the canonical field order and omits empty values", () => {
    expect(formatAccountCookie(canonicalCookie)).toBe(
      "account_id_v2=100000001;cookie_token_v2=cookie-token-v2;ltoken_v2=ltoken-v2;ltuid_v2=100000001;mid=mid-v2;stoken=stoken;stuid=100000001;",
    );
    expect(formatAccountCookie({ ...canonicalCookie, mid: "", stoken: "", stuid: "" })).toBe(
      "account_id_v2=100000001;cookie_token_v2=cookie-token-v2;ltoken_v2=ltoken-v2;ltuid_v2=100000001;",
    );
  });

  it("round-trips through parseAccountCookie", () => {
    expect(parseAccountCookie(formatAccountCookie(canonicalCookie))).toEqual({
      cookie: canonicalCookie,
      legacyKeys: [],
    });
  });
});

describe("parseAccountCookie", () => {
  it("accepts settings-page copy with separators, aliases and trailing equals signs", () => {
    const text = [
      " account_id_v2 = 100000001 ;",
      "cookie_token_v2=cookie-token-v2",
      "ltmid_v2=alias-mid",
      "ltoken_v2=ltoken-v2==",
      "ltuid_v2=100000001",
      "stoken=stoken=",
    ].join("\n");

    expect(parseAccountCookie(text)).toEqual({
      cookie: {
        account_id_v2: "100000001",
        cookie_token_v2: "cookie-token-v2",
        ltoken_v2: "ltoken-v2==",
        ltuid_v2: "100000001",
        mid: "alias-mid",
        stoken: "stoken=",
        stuid: "100000001",
      },
      legacyKeys: [],
    });
  });

  it("fills the missing account id fields from the available uid", () => {
    expect(
      parseAccountCookie("ltuid_v2=100000001;ltoken_v2=ltoken;cookie_token_v2=cookie-token").cookie,
    ).toEqual({
      account_id_v2: "100000001",
      cookie_token_v2: "cookie-token",
      ltoken_v2: "ltoken",
      ltuid_v2: "100000001",
      mid: "",
      stoken: "",
      stuid: "100000001",
    });
  });

  it("prefers canonical fields over aliases", () => {
    const parsed = parseAccountCookie("mid=canonical-mid;ltmid_v2=alias-mid;account_mid_v2=other");
    expect(parsed.cookie.mid).toBe("canonical-mid");
  });

  it("reports dead legacy keys without using their values", () => {
    const parsed = parseAccountCookie(
      "ltuid=100000001;ltoken=legacy-ltoken;cookie_token=legacy-cookie;account_id=100000001;stoken=stoken",
    );

    expect(parsed.legacyKeys).toEqual(["ltuid", "ltoken", "cookie_token", "account_id"]);
    expect(parsed.cookie).toEqual({
      account_id_v2: "",
      cookie_token_v2: "",
      ltoken_v2: "",
      ltuid_v2: "",
      mid: "",
      stoken: "stoken",
      stuid: "",
    });
  });

  it("ignores empty values, malformed segments and unknown keys", () => {
    expect(parseAccountCookie("ltoken_v2=;broken;=value;foo=bar;cookie_token_v2= ")).toEqual({
      cookie: {
        account_id_v2: "",
        cookie_token_v2: "",
        ltoken_v2: "",
        ltuid_v2: "",
        mid: "",
        stoken: "",
        stuid: "",
      },
      legacyKeys: [],
    });
  });
});

describe("hasSTokenCredentials", () => {
  it("requires stuid, stoken and mid", () => {
    expect(hasSTokenCredentials(canonicalCookie)).toBe(true);
    expect(hasSTokenCredentials({ ...canonicalCookie, stoken: "" })).toBe(false);
    expect(hasSTokenCredentials({ ...canonicalCookie, mid: "  " })).toBe(false);
    expect(hasSTokenCredentials({ ...canonicalCookie, stuid: "" })).toBe(false);
  });
});

describe("V2 stuid and mid compatibility", () => {
  it("derives stuid and mid from V2 fields and passes the stoken check", () => {
    const parsed = parseAccountCookie("ltuid_v2=100000001;ltmid_v2=v2-mid;stoken=stoken");

    expect(parsed.cookie).toEqual({
      account_id_v2: "100000001",
      cookie_token_v2: "",
      ltoken_v2: "",
      ltuid_v2: "100000001",
      mid: "v2-mid",
      stoken: "stoken",
      stuid: "100000001",
    });
    expect(hasSTokenCredentials(parsed.cookie)).toBe(true);
  });

  it("derives stuid from account_id_v2 when ltuid_v2 is missing", () => {
    const parsed = parseAccountCookie("account_id_v2=100000002;ltmid_v2=mid;stoken=stoken");

    expect(parsed.cookie.stuid).toBe("100000002");
    expect(parsed.cookie.ltuid_v2).toBe("100000002");
  });

  it("rejects a V2-only copy without stoken", () => {
    const webOnly = { ...canonicalCookie, mid: "", stoken: "", stuid: "" };
    const parsed = parseAccountCookie(formatAccountCookie(webOnly));

    expect(parsed.cookie.stuid).toBe("100000001");
    expect(hasSTokenCredentials(parsed.cookie)).toBe(false);
  });
});
