/**
 * 米游社个人中心请求契约回归测试。
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

describe("communityReq read requests", () => {
  it("omits the current user's UID from comments and keeps the minimum cookie", async () => {
    await communityReq.comments(cookie, cookie.ltuid);

    const query = { size: 20 };
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith("https://bbs-api.miyoushe.com/post/wapi/userReply", {
      headers: { "x-test-header": "test" },
      query,
    });
  });

  it("uses the official offset and omits self UID for the collection list", async () => {
    await communityReq.collections(cookie, cookie.ltuid, "collection-offset");

    const query = { gids: 2, size: 20, offset: "collection-offset" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/userList",
      { headers: { "x-test-header": "test" }, query },
    );
  });

  it("reads favorite posts and favorite collections from the website endpoints", async () => {
    await communityReq.favorites(cookie, cookie.ltuid, "favorite-offset");
    const favoritePostQuery = { size: 20, offset: "favorite-offset" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "GET",
      favoritePostQuery,
      "X4",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/userFavouritePost",
      { headers: { "x-test-header": "test" }, query: favoritePostQuery },
    );

    await communityReq.favoriteCollections(cookie, "200000002", "favorite-collection-offset");
    const favoriteCollectionQuery = {
      gids: 2,
      size: 20,
      uid: "200000002",
      offset: "favorite-collection-offset",
    };
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/followingList",
      { headers: { "x-test-header": "test" }, query: favoriteCollectionQuery },
    );
  });

  it("uses the official last_id cursor for following and followers", async () => {
    await communityReq.following(cookie, cookie.ltuid, "following-last-id");
    const followingQuery = {
      gids: 2,
      page_size: 20,
      last_id: "following-last-id",
    };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "GET",
      followingQuery,
      "X4",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith("https://bbs-api.miyoushe.com/user/wapi/following", {
      headers: { "x-test-header": "test" },
      query: followingQuery,
    });

    await communityReq.followers(cookie, cookie.ltuid);
    const followersQuery = { gids: 2, page_size: 20 };
    expect(mocks.get).toHaveBeenLastCalledWith("https://bbs-api.miyoushe.com/user/wapi/followers", {
      headers: { "x-test-header": "test" },
      query: followersQuery,
    });
  });

  it("passes through business responses and transport errors", async () => {
    const businessError = { retcode: 1001, message: "permission denied", data: null };
    mocks.get.mockResolvedValueOnce({ data: businessError });
    await expect(communityReq.comments(cookie, cookie.ltuid)).resolves.toEqual(businessError);

    const transportError = new Error("network failure");
    mocks.get.mockRejectedValueOnce(transportError);
    await expect(communityReq.followers(cookie, cookie.ltuid)).rejects.toBe(transportError);
  });
});
