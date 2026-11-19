/**
 * TGHttps 边界结构校验回归测试。
 * @since Beta v0.13.2
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  loggerWarn: vi.fn(async () => undefined),
  useProxy: false,
}));

vi.mock("@store/app.js", () => ({ default: () => ({ useProxy: mocks.useProxy }) }));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: mocks.fetch }));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Warn: mocks.loggerWarn } }));

import forumRankReq from "../src/request/forumRankReq.js";
import {
  isCollectionPostsResp,
  isForumImageRankForumsResp,
  isForumImageRankPostsResp,
  isPostDynamicResp,
  isPostFullResp,
} from "../src/request/respValidator.js";
import { getImageRankOptions } from "../src/utils/bbs/forumRank.js";
import TGHttps from "../src/utils/network/TGHttps.js";

const fullData = {
  post: {
    post_id: "123",
    subject: "示例帖子",
    content: "示例内容",
    structured_content: "[]",
    view_type: 1,
    created_at: 1700000000,
    images: [],
  },
  topics: [],
  image_list: [],
};

/**
 * 创建 JSON 成功响应替身。
 * @since Beta v0.13.0
 * @param payload - 响应 JSON 数据
 * @returns 可被 TGHttps 消费的成功响应
 */
function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200, statusText: "OK" });
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockImplementation(() => Promise.resolve(jsonResponse({ default: true })));
  mocks.loggerWarn.mockClear();
  mocks.useProxy = false;
});

describe("TGHttps response validation", () => {
  it("returns parsed data when the guard passes", async () => {
    const payload = { retcode: 0, message: "OK", data: { post: fullData } };
    mocks.fetch.mockResolvedValueOnce(jsonResponse(payload));

    const resp = await TGHttps.get(
      "https://example.com/getPostFull",
      { query: { post_id: 1 } },
      isPostFullResp,
    );

    expect(resp.data).toEqual(payload);
    expect(resp.status).toBe(200);
  });

  it("throws an HTTP error carrying the payload when the guard fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const payload = { retcode: 0, message: "OK", data: { post: null } };
    mocks.fetch.mockResolvedValueOnce(jsonResponse(payload));

    try {
      await expect(
        TGHttps.get("https://example.com/getPostFull", {}, isPostFullResp),
      ).rejects.toMatchObject({
        message: expect.stringContaining("响应数据结构校验失败"),
        data: payload,
      });
      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("keeps unchecked responses unchanged when no guard is provided", async () => {
    const payload = { anything: true };
    mocks.fetch.mockResolvedValueOnce(jsonResponse(payload));

    const resp = await TGHttps.post("https://example.com/submit", { body: { a: 1 } });

    expect(resp.data).toEqual(payload);
  });
});

describe("forum rankings", () => {
  it("loads the partition's ranked forums and uses the chosen forum, period and cursor", async () => {
    const catalog: TGApp.BBS.Forum.ImageRankForumsResp = {
      retcode: 0,
      message: "OK",
      data: {
        list: [{ forum_id: 40, post_image_list_name: "同人榜", typeList: [2, 3] }],
      },
    };
    const list: Array<TGApp.BBS.Forum.ImageRankPost> = [
      {
        post: {
          post_id: "123",
          subject: "图榜帖子",
          cover: "",
          images: [],
          created_at: 1700000000,
          updated_at: 1700000001,
        },
        cover: { url: "https://example.com/cover.png", width: 800, height: 1200 },
        image_list: [],
        user: {
          uid: "456",
          nickname: "旅行者",
          avatar_url: "https://example.com/avatar.png",
          pendant: "",
          introduce: "插画作者",
          level_exp: { level: 5 },
        },
        stat: { view_num: 120, like_num: 24, reply_num: 2, bookmark_num: 4, forward_num: 0 },
      },
    ];
    const page: TGApp.BBS.Forum.ImageRankPostsResp = {
      retcode: 0,
      message: "OK",
      data: { list, is_last: false, last_id: 21 },
    };
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse(catalog))
      .mockResolvedValueOnce(jsonResponse(page));
    const { signal } = new AbortController();

    await expect(forumRankReq.imageForums(3, signal)).resolves.toEqual(catalog);
    expect(getImageRankOptions(catalog.data.list[0].typeList)).toEqual([
      { title: "周榜", value: 2, icon: "mdi-calendar-week" },
      { title: "月榜", value: 3, icon: "mdi-calendar-month-outline" },
    ]);
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      1,
      "https://bbs-api.miyoushe.com/forum/wapi/getImagePostInfoList?gids=3",
      expect.anything(),
    );
    await expect(forumRankReq.imagePosts(40, 2, "2", signal)).resolves.toEqual(page);
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      2,
      "https://bbs-api.miyoushe.com/post/wapi/getImagePostList?forum_id=40&cate_id=0&type=2&last_id=2&page_size=20",
      expect.anything(),
    );
    expect(isForumImageRankForumsResp({ ...catalog, data: { list: [] } })).toBe(true);
    expect(
      isForumImageRankPostsResp({
        ...page,
        data: {
          ...page.data,
          list: [{ ...list[0], cover: null, user: null, stat: null }],
        },
      }),
    ).toBe(true);
  });

  it("accepts business errors and rejects malformed successful rankings", () => {
    const failed = { retcode: -502, message: "请求参数错误", data: null };
    expect(isForumImageRankForumsResp(failed)).toBe(true);
    expect(isForumImageRankPostsResp(failed)).toBe(true);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(
        isForumImageRankForumsResp({
          retcode: 0,
          message: "OK",
          data: { list: [{ forum_id: 40, post_image_list_name: "同人榜", typeList: ["2"] }] },
        }),
      ).toBe(false);
      expect(
        isForumImageRankPostsResp({
          retcode: 0,
          message: "OK",
          data: { list: [{ post: null }], is_last: true, last_id: 0 },
        }),
      ).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(2);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("respValidator BBS response guards", () => {
  it("accepts a well-formed success payload for post detail", () => {
    expect(isPostFullResp({ retcode: 0, message: "OK", data: { post: fullData } })).toBe(true);
  });

  it("accepts a well-formed success payload for post dynamic data", () => {
    const data = {
      list: [
        {
          post_id: "123",
          is_upvote: true,
          stat: { like_num: 10 },
          self_operation: { attitude: 1, is_collected: false, upvote_type: 1 },
        },
      ],
    };
    expect(isPostDynamicResp({ retcode: 0, message: "OK", data })).toBe(true);
  });

  it("accepts non-zero business envelopes without checking data", () => {
    expect(isPostFullResp({ retcode: 1034, message: "请完成验证", data: null })).toBe(true);
    expect(isCollectionPostsResp({ retcode: 1001, message: "帖子不存在" })).toBe(true);
    expect(isPostDynamicResp({ retcode: -10001, message: "invalid request", data: null })).toBe(
      true,
    );
  });

  it("rejects success payloads whose data skeleton drifted", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(isPostFullResp({ retcode: 0, message: "OK", data: null })).toBe(false);
      expect(
        isPostFullResp({
          retcode: 0,
          message: "OK",
          data: { post: { ...fullData, post: { ...fullData.post, post_id: 123 } } },
        }),
      ).toBe(false);
      expect(isCollectionPostsResp({ retcode: 0, message: "OK", data: { posts: "broken" } })).toBe(
        false,
      );
      expect(
        isPostDynamicResp({
          retcode: 0,
          message: "OK",
          data: { list: [{ post_id: 123, is_upvote: false, stat: { like_num: 10 } }] },
        }),
      ).toBe(false);
      expect(
        isPostDynamicResp({
          retcode: 0,
          message: "OK",
          data: { list: [{ post_id: "123", is_upvote: false, stat: null }] },
        }),
      ).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(5);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("rejects malformed envelopes", () => {
    expect(isPostFullResp(null)).toBe(false);
    expect(isPostFullResp({ message: "缺少 retcode" })).toBe(false);
    expect(isCollectionPostsResp({ retcode: "0", message: "OK" })).toBe(false);
  });
});
