/**
 * 登录流程与网页资料页的用户信息请求回归测试。
 * @since Beta v0.13.2
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get } }));
vi.mock("@utils/common/toolFunc.js", () => ({
  getDeviceInfo: () => "test-device",
  getRandomNumber: () => 123456,
  getRandomString: () => "abcdef",
}));

import bbsReq from "../src/request/bbsReq.js";

const cookie: TGApp.App.Account.Cookie = {
  account_id_v2: "100000001",
  cookie_token_v2: "cookie-token",
  ltoken_v2: "ltoken-value",
  ltuid_v2: "100000001",
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: "100000001",
};

const success = { retcode: 0, message: "OK", data: { user_info: { uid: cookie.stuid } } };

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: success });
});

describe("米游社用户资料", () => {
  it("使用原生 Cookie 和 UID 查询登录账号的资料", async () => {
    await expect(bbsReq.currentUserInfo(cookie)).resolves.toBe(success);

    expect(get).toHaveBeenCalledWith("https://bbs-api.miyoushe.com/user/api/getUserFullInfo", {
      headers: expect.objectContaining({
        cookie: "mid=mid-value;stoken=stoken-value;stuid=100000001;",
        "x-rpc-client_type": "2",
      }),
      query: { uid: cookie.stuid },
    });
  });

  it("网页资料请求携带成对的 V2 凭据和 MID", async () => {
    await bbsReq.otherUserInfo("2", "100000002", cookie);

    expect(get).toHaveBeenCalledWith("https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo", {
      headers: expect.objectContaining({
        cookie:
          "account_id_v2=100000001;account_mid_v2=mid-value;cookie_token_v2=cookie-token;" +
          "ltmid_v2=mid-value;ltoken_v2=ltoken-value;ltuid_v2=100000001;",
      }),
      query: { gids: "2", uid: "100000002" },
    });
  });
});
