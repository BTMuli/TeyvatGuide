/**
 * TGHttps 边界结构校验回归测试。
 * @since Beta v0.13.0
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

import {
  isCollectionPostsResp,
  isPostDynamicResp,
  isPostFullResp,
} from "../src/request/respValidator.js";
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
