/**
 * 米游社用户信息请求参数回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({ default: { get: mocks.get } }));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

import bbsReq from "../src/request/bbsReq.js";

const cookie: TGApp.App.Account.Cookie = {
  account_id: "100000001",
  cookie_token: "cookie-token",
  ltoken: "ltoken",
  ltuid: "100000001",
  mid: "mid",
  stoken: "stoken",
  stuid: "100000001",
};
const response = { retcode: 0, message: "ok", data: {} };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: response });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
});

describe("bbsReq.userInfo", () => {
  it("keeps the original gid 2 default", async () => {
    await bbsReq.userInfo(cookie);

    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
      expect.objectContaining({ query: { gids: "2" } }),
    );
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { cookie_token: cookie.cookie_token, account_id: cookie.account_id },
      "GET",
      { gids: "2" },
      "X4",
      true,
    );
  });

  it("passes a selected gid to the authenticated request", async () => {
    await bbsReq.userInfo(cookie, "6");

    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/getUserFullInfo",
      expect.objectContaining({ query: { gids: "6" } }),
    );
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { cookie_token: cookie.cookie_token, account_id: cookie.account_id },
      "GET",
      { gids: "6" },
      "X4",
      true,
    );
  });
});
