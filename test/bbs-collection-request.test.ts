/**
 * 米游社合集详情请求契约回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getRequestHeader: vi.fn(),
  getCollectionRequestHeader: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({
  default: { get: mocks.get },
}));
vi.mock("@utils/network/getRequestHeader.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/network/getRequestHeader.js")>()),
  getRequestHeader: mocks.getRequestHeader,
  getCollectionRequestHeader: mocks.getCollectionRequestHeader,
}));

import bbsReq from "../src/request/bbsReq.js";

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
const collectionHeaders = { "x-test-header": "collection" };
const successResponse = { retcode: 0, message: "ok", data: {} };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.getCollectionRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "app" });
  mocks.getCollectionRequestHeader.mockReturnValue(collectionHeaders);
});

describe("bbsReq.collection", () => {
  it("uses the anonymous web collection signature and preserves a large string ID", async () => {
    const collectionId = "90071992547409931234567890";
    await expect(bbsReq.collection(collectionId, 2)).resolves.toEqual(successResponse);

    expect(mocks.getCollectionRequestHeader).toHaveBeenCalledWith({}, "GET", {
      gids: 2,
      id: collectionId,
    });
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/detail",
      { headers: collectionHeaders, query: { gids: 2, id: collectionId } },
    );
  });

  it("uses only the account cookie fields for an authenticated request", async () => {
    await bbsReq.collection("17723", 6, cookie);

    expect(mocks.getCollectionRequestHeader).toHaveBeenCalledWith(authCookie, "GET", {
      gids: 6,
      id: "17723",
    });
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/detail",
      { headers: collectionHeaders, query: { gids: 6, id: "17723" } },
    );
  });

  it("passes through business responses and transport errors", async () => {
    const businessError = { retcode: 1001, message: "permission denied", data: null };
    mocks.get.mockResolvedValueOnce({ data: businessError });
    await expect(bbsReq.collection("17723", 2)).resolves.toEqual(businessError);

    const transportError = new Error("network failure");
    mocks.get.mockRejectedValueOnce(transportError);
    await expect(bbsReq.collection("17723", 2)).rejects.toBe(transportError);
  });
});
