/**
 * APK 发现推荐流请求契约回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), header: vi.fn() }));

vi.mock("@utils/TGHttps.js", () => ({ default: { get: mocks.get } }));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.header }));

import painterReq from "../src/request/painterReq.js";

const endpoint = "https://bbs-api.miyoushe.com/painter/api/feeds/posts";
const successResponse: TGApp.BBS.Forum.DiscoverResp = {
  retcode: 0,
  message: "OK",
  data: { list: [], last_id: "42_560991" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.header.mockReturnValue({ cookie: "", "x-rpc-client_type": "5", ds: "signed" });
});

describe("painterReq discover", () => {
  it("uses the native APK endpoint and refresh parameters for an anonymous first load", async () => {
    const resp = await painterReq.discover(2, "", true);
    const query = {
      gids: "2",
      last_id: "",
      fresh_action: 1,
      is_first_initialize: true,
      filter: "",
      algorithm_type: 0,
      is_triggered_by_resource: false,
    };

    expect(mocks.header).toHaveBeenCalledWith({}, "GET", query, "K2", true);
    expect(mocks.get).toHaveBeenCalledWith(endpoint, {
      query,
      headers: { cookie: "", "x-rpc-client_type": "2", ds: "signed" },
    });
    expect(resp).toBe(successResponse);
    expect(resp.data.is_last).toBeUndefined();
  });

  it("passes the opaque last_id back unchanged with the load-more action", async () => {
    await painterReq.discover(6, "42_560991", false);

    expect(mocks.get).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        query: expect.objectContaining({
          gids: "6",
          last_id: "42_560991",
          fresh_action: 2,
          is_first_initialize: false,
        }),
      }),
    );
  });

  it("refreshes without a cursor after initialization", async () => {
    await painterReq.discover(2);

    expect(mocks.get).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        query: expect.objectContaining({
          last_id: "",
          fresh_action: 1,
          is_first_initialize: false,
        }),
      }),
    );
  });

  it("uses only the native login cookies for personalized recommendations", async () => {
    const cookie: TGApp.App.Account.Cookie = {
      stuid: "10001",
      stoken: "native-token",
      mid: "mid",
      ltuid: "10001",
      ltoken: "web-token",
      account_id: "10001",
      cookie_token: "cookie-token",
    };

    await painterReq.discover(2, "", true, cookie);

    expect(mocks.header).toHaveBeenCalledWith(
      { stuid: "10001", stoken: "native-token", mid: "mid" },
      "GET",
      expect.any(Object),
      "K2",
      true,
    );
  });

  it("preserves an explicit end-of-feed flag", async () => {
    const response = { ...successResponse, data: { list: [], last_id: "", is_last: true } };
    mocks.get.mockResolvedValueOnce({ data: response });

    await expect(painterReq.discover(2, "42_560991")).resolves.toBe(response);
  });

  it("passes through business failures without accessing their null data", async () => {
    const failure = { retcode: -10001, message: "invalid request", data: null };
    mocks.get.mockResolvedValueOnce({ data: failure });

    await expect(painterReq.discover(2)).resolves.toBe(failure);
  });

  it("propagates transport failures", async () => {
    mocks.get.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(painterReq.discover(2)).rejects.toThrow("network unavailable");
  });
});
