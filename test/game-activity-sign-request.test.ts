/**
 * 活动日历和游戏签到请求的 V2 Cookie 回归测试。
 * @since Beta v0.13.2
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@utils/network/TGHttps.js", () => ({ default: mocks }));
vi.mock("@utils/common/toolFunc.js", () => ({
  getDeviceInfo: () => "test-device",
  getRandomNumber: () => 123456,
  getRandomString: () => "abcdef",
}));

import lunaReq from "../src/request/lunaReq.js";
import recordReq from "../src/request/recordReq.js";

const account: TGApp.Sqlite.Account.Game = {
  uid: "100000001",
  gameBiz: "hk4e_cn",
  gameUid: "123456789",
  isChosen: 1,
  isOfficial: 1,
  level: "60",
  nickname: "旅行者",
  region: "cn_gf01",
  regionName: "天空岛",
  updated: "",
};

const cookie: TGApp.App.Account.Cookie = {
  account_id_v2: account.uid,
  cookie_token_v2: "cookie-token",
  ltoken_v2: "ltoken-value",
  ltuid_v2: account.uid,
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: account.uid,
};

const signUrl = "https://api-takumi.mihoyo.com/event/luna/hk4e/";
const signParams = { lang: "zh-cn", act_id: "e202311201442471" };
const signRoleParams = { ...signParams, region: account.region, uid: account.gameUid };
const cookieHeader =
  "account_id_v2=100000001;account_mid_v2=mid-value;cookie_token_v2=cookie-token";
const success = { retcode: 0, message: "OK", data: {} };

beforeEach(() => {
  mocks.get.mockReset().mockResolvedValue({ data: success });
  mocks.post.mockReset().mockResolvedValue({ data: success });
});

describe("近期活动", () => {
  it.each([undefined, "verified-challenge"])(
    "使用带 MID 的 V2 Cookie，challenge=%s",
    async (challenge) => {
      await expect(recordReq.actCalendar(cookie, account, challenge)).resolves.toBe(success);
      expect(mocks.post).toHaveBeenCalledWith(
        "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/act_calendar",
        {
          headers: expect.objectContaining({
            cookie: `${cookieHeader};ltmid_v2=mid-value;ltoken_v2=ltoken-value;ltuid_v2=100000001;`,
            ...(challenge ? { "x-rpc-challenge": challenge } : {}),
          }),
          body: JSON.stringify({ role_id: account.gameUid, server: account.region }),
        },
      );
    },
  );
});

describe("Luna 游戏签到", () => {
  it.each([
    { path: "home", get: lunaReq.sign.info, query: signParams },
    { path: "info", get: lunaReq.sign.stat, query: signRoleParams },
    { path: "resign_info", get: lunaReq.resign.info, query: signRoleParams },
  ])("$path 查询使用带 MID 的 V2 Cookie", async ({ path, get, query }) => {
    await expect(get(account, cookie)).resolves.toBe(success);
    expect(mocks.get).toHaveBeenCalledWith(signUrl + path, {
      headers: expect.objectContaining({
        cookie: cookieHeader.replaceAll(";", "; "),
        "x-rpc-signgame": "hk4e",
      }),
      query,
    });
  });

  it.each([
    { path: "sign", post: lunaReq.sign.oper },
    { path: "resign", post: lunaReq.resign.oper },
  ])("$path 提交保留挑战和游戏签名头", async ({ path, post }) => {
    const challenge = "verified-challenge";
    await expect(post(account, cookie, challenge)).resolves.toBe(success);
    expect(mocks.post).toHaveBeenCalledWith(signUrl + path, {
      headers: expect.objectContaining({
        cookie: `${cookieHeader};`,
        ds: expect.any(String),
        "x-rpc-client_type": "2",
        "x-rpc-signgame": "hk4e",
        "x-rpc-challenge": challenge,
      }),
      body: JSON.stringify(signRoleParams),
    });
  });
});
