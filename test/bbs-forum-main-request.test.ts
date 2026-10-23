/**
 * 米游社版块主页请求契约回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get, post: vi.fn() },
}));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: vi.fn() }));

import apiHubReq from "../src/request/apiHubReq.js";

const successResponse = {
  retcode: 0,
  message: "OK",
  data: { top_posts: [{ post_id: "52394", subject: "版规" }] },
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
});

describe("apiHubReq forumMain", () => {
  it("requests the forum main endpoint with the current game and forum ids", async () => {
    const resp = await apiHubReq.forumMain(26, 2);

    expect(mocks.get).toHaveBeenCalledWith("https://bbs-api.miyoushe.com/apihub/api/forumMain", {
      headers: { "Content-Type": "application/json", referer: "https://bbs.mihoyo.com/" },
      query: { forum_id: 26, gids: 2 },
    });
    expect(resp.data.top_posts).toEqual([{ post_id: "52394", subject: "版规" }]);
  });
});
