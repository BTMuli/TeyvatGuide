/**
 * 米游社话题请求参数回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({ default: { get: mocks.get, post: mocks.post } }));

import topicReq from "../src/request/topicReq.js";

const response = { retcode: 0, message: "ok", data: { topics: [] } };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.get.mockResolvedValue({ data: response });
  mocks.post.mockResolvedValue({ data: response });
});

describe("topicReq.info", () => {
  it("keeps the topic detail request parameters", async () => {
    await topicReq.info("2", "477");

    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/topic/wapi/getTopicFullInfo",
      {
        headers: { referer: "https://bbs.mihoyo.com/", cookie: "" },
        query: { gids: "2", id: "477" },
      },
    );
  });
});

describe("topicReq.recommend", () => {
  it("posts the editor context to the recommendation endpoint", async () => {
    await topicReq.recommend(2, 33, 1, "帖子标题", "帖子正文");

    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/topic/outerApi/getRecommendedTopicsForText",
      {
        headers: { referer: "https://bbs.mihoyo.com/", cookie: "" },
        body: {
          game_id: 2,
          forum_id: 33,
          view_type: 1,
          title: "帖子标题",
          content: "帖子正文",
          limit: 10,
          scene: "post",
        },
      },
    );
  });

  it("excludes selected topics from recommendations", async () => {
    await topicReq.recommend(2, 33, 1, "帖子标题", "帖子正文", ["238", "2496"]);

    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/topic/outerApi/getRecommendedTopicsForText",
      {
        headers: { referer: "https://bbs.mihoyo.com/", cookie: "" },
        body: {
          game_id: 2,
          forum_id: 33,
          view_type: 1,
          title: "帖子标题",
          content: "帖子正文",
          limit: 10,
          scene: "post",
          ignore_topic_ids: ["238", "2496"],
        },
      },
    );
  });
});

describe("topicReq.search", () => {
  it("queries the topic search endpoint with the keyword and size", async () => {
    await topicReq.search("甘雨");

    expect(mocks.get).toHaveBeenCalledWith("https://bbs-api.miyoushe.com/topic/wapi/searchTopic", {
      headers: { referer: "https://bbs.mihoyo.com/", cookie: "" },
      query: { keyword: "甘雨", size: 10 },
    });
  });
});
