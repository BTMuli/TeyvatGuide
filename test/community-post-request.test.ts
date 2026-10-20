/**
 * 米游社个人中心帖子请求契约回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get },
}));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

import communityReq from "../src/request/communityReq.js";

const cookie = {
  account_id: "account-id",
  cookie_token: "cookie-token",
  ltoken: "ltoken-value",
  ltuid: "100000001",
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: "100000001",
};
const authCookie = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
const successResponse = { retcode: 0, message: "ok", data: null };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
});

describe("communityReq.posts", () => {
  it("uses the official self-post parameters without uid or gids", async () => {
    await communityReq.posts(cookie);

    const query = { size: 20 };
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/painter/wapi/userPostList",
      {
        headers: { "x-test-header": "test" },
        query,
      },
    );
  });

  it("uses the official offset cursor for the next page", async () => {
    await communityReq.posts(cookie, "next-offset");

    const query = { size: 20, offset: "next-offset" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/painter/wapi/userPostList",
      { headers: { "x-test-header": "test" }, query },
    );
  });

  it("passes through business responses and transport errors", async () => {
    const businessError = { retcode: 1001, message: "permission denied", data: null };
    mocks.get.mockResolvedValueOnce({ data: businessError });
    await expect(communityReq.posts(cookie)).resolves.toEqual(businessError);

    const transportError = new Error("network failure");
    mocks.get.mockRejectedValueOnce(transportError);
    await expect(communityReq.posts(cookie)).rejects.toBe(transportError);
  });
});
