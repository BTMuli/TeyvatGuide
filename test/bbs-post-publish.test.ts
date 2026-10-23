/**
 * 米游社发帖版块筛选测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { canPublishForumPost } from "../src/utils/bbsPostPublish.js";

type PublishForum = Pick<
  TGApp.BBS.Forum.GameForumItem,
  "post_limit" | "visible" | "src_type" | "view_type"
>;

function getForum(overrides: Partial<PublishForum> = {}): PublishForum {
  return { post_limit: 3, visible: 1, src_type: 0, view_type: 1, ...overrides };
}

describe("canPublishForumPost", () => {
  it("allows long and picture posts in a normal forum", () => {
    expect(canPublishForumPost(getForum(), 1)).toBe(true);
    expect(canPublishForumPost(getForum(), 2)).toBe(true);
  });

  it("only allows picture posts in an image-only forum", () => {
    const forum = getForum({ view_type: 2 });
    expect(canPublishForumPost(forum, 1)).toBe(false);
    expect(canPublishForumPost(forum, 2)).toBe(true);
  });

  it("allows picture posts in forums without long-post support", () => {
    expect(canPublishForumPost(getForum({ view_type: 5 }), 1)).toBe(false);
    expect(canPublishForumPost(getForum({ view_type: 5 }), 2)).toBe(true);
  });

  it("rejects hidden or restricted forums", () => {
    expect(canPublishForumPost(getForum({ visible: 0 }), 2)).toBe(false);
    expect(canPublishForumPost(getForum({ post_limit: 1 }), 2)).toBe(false);
  });

  it("rejects forums with unsupported source types", () => {
    for (const srcType of [1, 4, 99, 999]) {
      expect(canPublishForumPost(getForum({ src_type: srcType }), 2)).toBe(false);
    }
  });
});
