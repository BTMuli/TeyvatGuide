/**
 * 米游社个人中心请求契约回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
  getCollectionRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/getRequestHeader.js", () => ({
  getRequestHeader: mocks.getRequestHeader,
  getCollectionRequestHeader: mocks.getCollectionRequestHeader,
}));

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
const appHeaders = { "x-test-header": "app" };
const collectionHeaders = { "x-test-header": "collection" };
const successResponse = { retcode: 0, message: "ok", data: null };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.getCollectionRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.post.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue(appHeaders);
  mocks.getCollectionRequestHeader.mockReturnValue(collectionHeaders);
});

describe("communityReq read requests", () => {
  it("omits the current user's UID from comments and keeps the minimum cookie", async () => {
    await communityReq.comments(cookie, cookie.ltuid);

    const query = { size: 20 };
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.getCollectionRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenLastCalledWith("https://bbs-api.miyoushe.com/post/wapi/userReply", {
      headers: appHeaders,
      query,
    });
  });

  it("uses the collection signature and official offset for the collection list", async () => {
    await communityReq.collections(cookie, cookie.ltuid, "collection-offset");

    const query = { gids: 2, size: 20, offset: "collection-offset" };
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(authCookie, "GET", query);
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/userList",
      { headers: collectionHeaders, query },
    );
  });

  it("signs favorite posts and favorite collections with their own headers", async () => {
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
      { headers: appHeaders, query: favoritePostQuery },
    );

    await communityReq.favoriteCollections(cookie, "200000002", "favorite-collection-offset");
    const favoriteCollectionQuery = {
      gids: 2,
      size: 20,
      uid: "200000002",
      offset: "favorite-collection-offset",
    };
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "GET",
      favoriteCollectionQuery,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/followingList",
      { headers: collectionHeaders, query: favoriteCollectionQuery },
    );
  });

  it("uses the app signature and official last_id cursor for following and followers", async () => {
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
      headers: appHeaders,
      query: followingQuery,
    });

    await communityReq.followers(cookie, cookie.ltuid);
    const followersQuery = { gids: 2, page_size: 20 };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "GET",
      followersQuery,
      "X4",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith("https://bbs-api.miyoushe.com/user/wapi/followers", {
      headers: appHeaders,
      query: followersQuery,
    });
  });

  it("searches a user's posts with keyword, UID and numeric offset cursor", async () => {
    await communityReq.searchPosts("200000002", "生日");
    const firstQuery = { keyword: "生日", uid: "200000002", size: 20 };
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/painter/api/user_instant/search/list",
      { headers: { referer: "https://www.miyoushe.com/" }, query: firstQuery },
    );

    await communityReq.searchPosts("200000002", "生日", "20");
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/painter/api/user_instant/search/list",
      { headers: { referer: "https://www.miyoushe.com/" }, query: { ...firstQuery, offset: "20" } },
    );
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
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

describe("communityReq favorite write requests", () => {
  it("cancels a favorite with a signed JSON body", async () => {
    await communityReq.unfavoritePost(cookie, "79040314");

    const body = { post_id: "79040314", is_cancel: 1 };
    const favoriteCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      favoriteCookie,
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/collectPost",
      {
        headers: {
          ...appHeaders,
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body,
      },
    );
  });
});

describe("communityReq history write requests", () => {
  it("deletes selected history entries with the SToken signature", async () => {
    const params: TGApp.BBS.Community.HistoryDeleteParams = {
      is_delete_all: false,
      operate_id_list: [{ item_type: "HISTORY_ITEM_TYPE_POST", item_id: "79040314" }],
      user_last_view_at: 1729600000,
    };
    await communityReq.deleteHistory(cookie, params);

    const historyCookie = { mid: cookie.mid, stoken: cookie.stoken, stuid: cookie.stuid };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      historyCookie,
      "POST",
      JSON.stringify(params),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/history_view/api/history/operate",
      {
        headers: {
          ...appHeaders,
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: params,
      },
    );
  });

  it("deletes all history except the excluded entries", async () => {
    const params: TGApp.BBS.Community.HistoryDeleteParams = {
      is_delete_all: true,
      operate_id_list: [{ item_type: "HISTORY_ITEM_TYPE_POST", item_id: "79040315" }],
      user_last_view_at: 1729600100,
    };
    await communityReq.deleteHistory(cookie, params);

    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/history_view/api/history/operate",
      expect.objectContaining({ body: params }),
    );
  });
});

describe("communityReq collection management requests", () => {
  it("creates a collection with a signed JSON body and returns the new ID", async () => {
    const response = { retcode: 0, message: "ok", data: { id: 123456 } };
    mocks.post.mockResolvedValueOnce({ data: response });
    const params = {
      title: "提瓦特游记",
      desc: "记录旅行见闻",
      cover: "https://upload-bbs.miyoushe.com/upload/cover.png",
    };

    await expect(communityReq.createCollection(cookie, params)).resolves.toEqual(response);
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(params),
    );
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/create",
      { headers: { ...collectionHeaders, "Content-Type": "application/json" }, body: params },
    );
  });

  it("edits a collection with its ID and updated fields", async () => {
    const params = {
      id: 123456,
      title: "新标题",
      desc: "新的合集描述",
      cover: "https://upload-bbs.miyoushe.com/upload/cover.png",
    };

    await communityReq.editCollection(cookie, params);
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(params),
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/edit",
      { headers: { ...collectionHeaders, "Content-Type": "application/json" }, body: params },
    );
  });

  it("deletes a collection by ID", async () => {
    await communityReq.deleteCollection(cookie, 123456);
    const body = { id: 123456 };
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/del",
      { headers: { ...collectionHeaders, "Content-Type": "application/json" }, body },
    );
  });

  it("sorts collections with the complete ID order", async () => {
    await communityReq.sortCollections(cookie, [3, 1, 2]);
    const body = { ids: [3, 1, 2] };
    expect(mocks.getCollectionRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/collection/wapi/collection/list/sort",
      { headers: { ...collectionHeaders, "Content-Type": "application/json" }, body },
    );
  });
});

describe("communityReq follow write requests", () => {
  it("follows a user with a signed JSON body", async () => {
    await communityReq.setFollow(cookie, "200000002", true);

    const body = { entity_id: "200000002" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/timeline/wapi/follow",
      { headers: { ...appHeaders, "Content-Type": "application/json" }, body },
    );
  });

  it("unfollows a user and rejects following the current account", async () => {
    await communityReq.setFollow(cookie, "200000002", false);
    const body = { entity_id: "200000002" };
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/timeline/wapi/unfollow",
      { headers: { ...appHeaders, "Content-Type": "application/json" }, body },
    );

    await expect(communityReq.setFollow(cookie, cookie.ltuid, true)).rejects.toThrow(
      "不能关注自己",
    );
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});

describe("communityReq notification requests", () => {
  it("requests notifications by category with the official cursor and focus flag", async () => {
    await communityReq.notifications(cookie, "reply");
    const replyQuery = { category: "reply", gids: 2, page_size: 20, only_focus: "false" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "GET",
      replyQuery,
      "X4",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/notification/wapi/getUserGameNotifications",
      { headers: appHeaders, query: replyQuery },
    );

    await communityReq.notifications(cookie, "system", "last-id");
    const systemQuery = { category: "system", gids: 2, page_size: 20, last_id: "last-id" };
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/notification/wapi/getUserGameNotifications",
      { headers: appHeaders, query: systemQuery },
    );
  });

  it("reads unread counts for the Genshin community", async () => {
    await communityReq.notificationUnread(cookie);
    const query = { gids: 2 };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/notification/wapi/getUserGameUnreadCount",
      { headers: appHeaders, query },
    );
  });

  it("clears unread notifications with a signed JSON body", async () => {
    await communityReq.clearNotificationUnread(cookie, "comment");
    const body = { category: "comment", only_focus: false };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/notification/wapi/clearUserGameUnread",
      { headers: { ...appHeaders, "Content-Type": "application/json" }, body },
    );
  });

  it("reads notification settings for the current user", async () => {
    await communityReq.notificationSettings(cookie, "10001");
    const query = { gids: 2, uid: "10001" };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(authCookie, "GET", query, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/notify/settings",
      { headers: appHeaders, query },
    );
  });

  it("updates notification settings with the full settings object", async () => {
    const settings: TGApp.BBS.Notification.Settings = {
      reply: "Follow",
      mention: "All",
      active_mention: "All",
      upvote: "Never",
      follow: "All",
      system: true,
      chat: true,
      push_reply_and_mention: "ON",
      push_follow: "ON",
      push_upvote: "ON",
      push_system_v2: "OPTION_ONLY_IMPORTANT",
      low_freq_notify_at_ts: "0",
    };
    await communityReq.updateNotificationSettings(cookie, settings);
    const body = { settings };
    expect(mocks.getRequestHeader).toHaveBeenLastCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/notify/settings/update",
      { headers: { ...appHeaders, "Content-Type": "application/json" }, body },
    );
  });
});
