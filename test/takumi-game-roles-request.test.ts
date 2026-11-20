/**
 * 已绑定游戏角色列表的请求契约回归测试。
 * @since Beta v0.13.2
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({
  get: vi.fn<(url: string, config: TGApp.App.Response.ReqConfParams) => Promise<unknown>>(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get } }));

import takumiReq from "../src/request/takumiReq.js";
import TGBbs from "../src/utils/bbs/TGBbs.js";

const cookie: TGApp.App.Account.Cookie = {
  account_id_v2: "100000001",
  cookie_token_v2: "legacy-cookie-token",
  ltoken_v2: "legacy-ltoken",
  ltuid_v2: "100000001",
  mid: "test-mid",
  stoken: "test-stoken",
  stuid: "100000001",
};
const role = {
  game_biz: "hk4e_cn",
  game_uid: "100000002",
  is_chosen: true,
  is_official: true,
  level: 60,
  nickname: "旅行者",
  region: "cn_gf01",
  region_name: "天空岛",
};

describe("takumiReq.bind.gameRoles", () => {
  beforeEach(() => {
    get.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({ deviceInfo: { device_id: "test-device", device_fp: "0123456789012" } }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads all roles using the APK route and the signed stoken cookie", async () => {
    get.mockResolvedValue({ data: { retcode: 0, message: "OK", data: { list: [role] } } });

    const result = await takumiReq.bind.gameRoles(cookie);

    const request = get.mock.lastCall;
    assert.ok(request);
    const [url, { headers, query }] = request;
    assert.ok(headers);
    expect(url).toBe("https://api-takumi.miyoushe.com/binding/api/getUserGameRolesByStoken");
    expect(query).toBeUndefined();
    expect(headers.cookie).toBe("mid=test-mid;stoken=test-stoken;stuid=100000001;");
    expect(headers["x-rpc-client_type"]).toBe("2");
    expect(headers.ds).toMatch(/^\d+,[A-Za-z0-9]{6},[a-f0-9]{32}$/);
    const [time, nonce, digest] = headers.ds.split(",");
    const signature = ["salt=" + TGBbs.salt.K2, "t=" + time, "r=" + nonce].join("&");
    expect(digest).toBe(createHash("md5").update(signature).digest("hex"));
    expect(result.data.list).toEqual([{ ...role, level: "60" }]);
  });

  it("returns the service error when there is no role payload", async () => {
    const response = { retcode: -100, message: "尚未登录", data: null };
    get.mockResolvedValue({ data: response });

    await expect(takumiReq.bind.gameRoles(cookie)).resolves.toEqual(response);
  });

  it("does not send a role request with incomplete stoken credentials", async () => {
    await expect(takumiReq.bind.gameRoles({ ...cookie, stoken: "" })).rejects.toThrow(
      "登录凭据不完整",
    );
    expect(get).not.toHaveBeenCalled();
  });
});
