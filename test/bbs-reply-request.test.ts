/**
 * 米游社回复请求契约回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

import postReq from "../src/request/postReq.js";

const cookie = {
  account_id: "account-id",
  cookie_token: "cookie-token",
  ltoken: "ltoken-value",
  ltuid: "100000001",
};
const authCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
const successResponse = { retcode: 0, message: "ok", data: null };
const customEmoticon = {
  id: "custom-1",
  url: "https://example.com/custom.webp",
  size: { width: 128, height: 128, file_size: 1024 },
  is_available: true,
  hash: "custom-hash",
};
const gameUidInfo: TGApp.BBS.GameUid.Info = {
  game_biz: "hk4e_cn",
  game_name: "原神",
  game_uid: "100000001",
  level: 60,
  nickname: "旅行者",
  region_name: "天空岛",
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.post.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
});

describe("postReq.reply read requests", () => {
  it("keeps anonymous main and sub reply requests unchanged", async () => {
    await postReq.reply.main("123", 2);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/getPostReplies",
      {
        headers: { referer: "https://bbs.mihoyo.com/" },
        query: { post_id: "123", gids: 2, is_hot: true, size: 20 },
      },
    );

    await postReq.reply.sub(3, 2, "123");
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/getSubReplies",
      {
        headers: { referer: "https://bbs.mihoyo.com/" },
        query: { floor_id: 3, gids: 2, post_id: "123", size: 20 },
      },
    );
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
  });

  it("adds the minimal authenticated cookie after the existing size argument", async () => {
    await postReq.reply.main("123", 2, true, undefined, false, undefined, 20, cookie);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "GET",
      { post_id: "123", gids: 2, is_hot: true, size: 20 },
      "K2",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/getPostReplies",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { post_id: "123", gids: 2, is_hot: true, size: 20 },
      },
    );
  });

  it("adds the same authenticated headers to sub replies", async () => {
    await postReq.reply.sub(3, 2, "123", undefined, 20, cookie);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "GET",
      { floor_id: 3, gids: 2, post_id: "123", size: 20 },
      "K2",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/getSubReplies",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { floor_id: 3, gids: 2, post_id: "123", size: 20 },
      },
    );
  });
});

describe("postReq.reply mutation requests", () => {
  it("sends the official create, like, delete, and pin payloads", async () => {
    await postReq.reply.create({ postId: "123", gid: 2, content: "hello" }, cookie);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releaseReply",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: {
          post_id: "123",
          gids: "2",
          content: "hello",
          structured_content: JSON.stringify([{ insert: "hello\n" }]),
        },
      },
    );

    await postReq.reply.create({ postId: "123", gid: 2, content: "hello", replyId: "456" }, cookie);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releaseReply",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: {
          post_id: "123",
          gids: "2",
          content: "hello",
          structured_content: JSON.stringify([{ insert: "hello\n" }]),
          reply_id: "456",
        },
      },
    );

    await postReq.reply.like("123", "456", cookie);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/apihub/api/upvoteReply",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: { is_cancel: false, post_id: "123", reply_id: "456" },
      },
    );

    await postReq.reply.delete("123", "456", cookie);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/deleteReply",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: { post_id: "123", reply_id: "456" },
      },
    );

    await postReq.reply.pin("123", "456", cookie);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/pin/post/reply",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: { is_cancel: false, post_id: "123", reply_id: "456" },
      },
    );

    expect(mocks.getRequestHeader).toHaveBeenCalledTimes(5);
    for (const call of mocks.getRequestHeader.mock.calls) {
      expect(call[0]).toEqual(authCookie);
      expect(call[1]).toBe("POST");
      expect(call[3]).toBe("K2");
      expect(call[4]).toBe(true);
    }
  });

  it("sends validated structured reply content and derives its text", async () => {
    const structuredContent: Array<TGApp.BBS.Reply.SendNode> = [
      { insert: "hello " },
      { insert: { mention: { uid: 100000001, nickname: "旅行者" } } },
      { insert: "\n" },
      {
        insert: { image: "https://example.com/image.png" },
        attributes: { width: 640, height: 480 },
      },
      { insert: "\n" },
    ];

    await postReq.reply.create(
      { postId: "123", gid: 2, content: "hello @旅行者", structuredContent },
      cookie,
    );

    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releaseReply",
      expect.objectContaining({
        body: {
          post_id: "123",
          gids: "2",
          content: "hello @旅行者",
          structured_content: JSON.stringify(structuredContent),
        },
      }),
    );
  });

  it("rejects mismatched structured text and malformed nodes before HTTP", async () => {
    const structuredContent: Array<TGApp.BBS.Reply.SendNode> = [{ insert: "hello\n" }];

    await expect(
      postReq.reply.create(
        { postId: "123", gid: 2, content: "different", structuredContent },
        cookie,
      ),
    ).rejects.toThrow();
    await expect(
      postReq.reply.create(
        {
          postId: "123",
          gid: 2,
          content: "",
          structuredContent: <Array<TGApp.BBS.Reply.SendNode>>(
            (<unknown>[{ insert: { custom_emoticon: "smile" } }])
          ),
        },
        cookie,
      ),
    ).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("allows a pure image structured document with empty text", async () => {
    const structuredContent: Array<TGApp.BBS.Reply.SendNode> = [
      {
        insert: { image: "https://example.com/image.png" },
        attributes: { width: 640, height: 480 },
      },
      { insert: "\n" },
    ];

    await postReq.reply.create({ postId: "123", gid: 2, content: "", structuredContent }, cookie);

    expect(mocks.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: {
          post_id: "123",
          gids: "2",
          content: "",
          structured_content: JSON.stringify(structuredContent),
        },
      }),
    );
  });

  it("sends a pure custom emoticon with a deterministic text placeholder", async () => {
    const structuredContent: Array<TGApp.BBS.Reply.SendNode> = [
      { insert: { custom_emoticon: customEmoticon } },
      { insert: "\n" },
    ];

    await postReq.reply.create(
      { postId: "123", gid: 2, content: "[自定义表情]", structuredContent },
      cookie,
    );

    expect(mocks.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: {
          post_id: "123",
          gids: "2",
          content: "[自定义表情]",
          structured_content: JSON.stringify([
            {
              insert: {
                custom_emoticon: customEmoticon,
                backup_text: "[自定义表情]",
              },
            },
            { insert: "\n" },
          ]),
        },
      }),
    );
  });

  it("sends a UID-only reply with the APK game info fields and no invented backup text", async () => {
    const structuredContent: Array<TGApp.BBS.Reply.SendNode> = [
      { insert: { game_user_info: gameUidInfo } },
      { insert: "\n" },
    ];

    await postReq.reply.create({ postId: "123", gid: 2, content: "", structuredContent }, cookie);

    const body = {
      post_id: "123",
      gids: "2",
      content: "",
      structured_content: JSON.stringify([
        { insert: { game_user_info: gameUidInfo } },
        { insert: "\n" },
      ]),
    };
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releaseReply",
      expect.objectContaining({ body }),
    );
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "POST", body, "K2", true);
  });

  it("rejects malformed UID card fields or unknown backup fields before making a request", async () => {
    const invalidNodes = [
      { insert: { game_user_info: { ...gameUidInfo, level: "60" } } },
      { insert: { game_user_info: { ...gameUidInfo, game_uid: " 100000001" } } },
      { insert: { game_user_info: gameUidInfo, backup_text: "其他内容" } },
    ];

    for (const node of invalidNodes) {
      await expect(
        postReq.reply.create(
          {
            postId: "123",
            gid: 2,
            content: "",
            structuredContent: <Array<TGApp.BBS.Reply.SendNode>>(<unknown>[node, { insert: "\n" }]),
          },
          cookie,
        ),
      ).rejects.toThrow();
    }
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
  });

  it.each(<const>["like", "pin"])("sends the cancellation flag for %s", async (action) => {
    await postReq.reply[action]("123", "456", cookie, true);
    expect(mocks.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: { is_cancel: true, post_id: "123", reply_id: "456" },
      }),
    );
  });

  it("adds string gids when a game id is provided", async () => {
    await postReq.reply.like("123", "456", cookie, false, 2);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/apihub/api/upvoteReply",
      expect.objectContaining({
        body: { is_cancel: false, post_id: "123", reply_id: "456", gids: "2" },
      }),
    );

    await postReq.reply.delete("123", "456", cookie, 2);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/deleteReply",
      expect.objectContaining({ body: { post_id: "123", reply_id: "456", gids: "2" } }),
    );

    await postReq.reply.pin("123", "456", cookie, false, 2);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/pin/post/reply",
      expect.objectContaining({
        body: { is_cancel: false, post_id: "123", reply_id: "456", gids: "2" },
      }),
    );
  });

  it("passes through business errors and transport failures", async () => {
    const businessError = { retcode: -10001, message: "invalid request", data: null };
    mocks.post.mockResolvedValueOnce({ data: businessError });
    await expect(postReq.reply.like("123", "456", cookie)).resolves.toEqual(businessError);

    const transportError = new Error("network failure");
    mocks.post.mockRejectedValueOnce(transportError);
    await expect(postReq.reply.delete("123", "456", cookie)).rejects.toBe(transportError);
  });

  it("rejects invalid input before making an HTTP request", async () => {
    const cookieWithoutToken = <TGApp.App.Account.LoginCookie>{ ltuid: cookie.ltuid };
    const cookieWithoutUid = <TGApp.App.Account.LoginCookie>{ ltoken: cookie.ltoken };
    const requests = [
      () => postReq.reply.create({ postId: "0", gid: 2, content: "hello" }, cookie),
      () => postReq.reply.create({ postId: " 123", gid: 2, content: "hello" }, cookie),
      () => postReq.reply.create({ postId: "123", gid: 0, content: "hello" }, cookie),
      () => postReq.reply.create({ postId: "123", gid: -1, content: "hello" }, cookie),
      () => postReq.reply.create({ postId: "123", gid: 1.5, content: "hello" }, cookie),
      () => postReq.reply.create({ postId: "123", gid: 2, content: "  " }, cookie),
      () => postReq.reply.create({ postId: "123", gid: 2, content: "hello", replyId: "0" }, cookie),
      () => postReq.reply.like("0", "456", cookie),
      () => postReq.reply.like("123", " 456", cookie),
      () => postReq.reply.like("123", "456", cookie, false, 0),
      () => postReq.reply.delete("123", "0", cookie),
      () => postReq.reply.delete("123", "456", cookie, 1.5),
      () => postReq.reply.pin("123", "456", { ltoken: "", ltuid: cookie.ltuid }),
      () => postReq.reply.pin("123", "456", cookie, false, -1),
      () => postReq.reply.main("123", 2, true, undefined, false, undefined, 20, cookieWithoutToken),
      () => postReq.reply.sub(3, 2, "123", undefined, 20, cookieWithoutUid),
    ];

    for (const request of requests) await expect(request()).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
  });
});
