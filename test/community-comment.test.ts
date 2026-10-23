/**
 * 米游社个人中心评论正文转换回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { getCommunityCommentContent } from "../src/utils/community/comment.js";

/**
 * 评论正文测试的字段覆盖值。
 * @since Beta v0.13.0
 */
type CommentOverrides = {
  reply?: Record<string, unknown>;
  images?: Array<TGApp.BBS.Post.Image>;
  stat?: Record<string, unknown>;
  r_post?: Record<string, unknown> | null;
};

/**
 * 构造正文转换所需的最小评论响应夹具。
 * @since Beta v0.13.0
 * @param overrides - 待覆盖的字段
 * @returns 评论响应夹具
 */
function createComment(overrides: CommentOverrides = {}): TGApp.BBS.Community.Comment {
  const { reply, ...rest } = overrides;
  return <TGApp.BBS.Community.Comment>(<unknown>{
    reply: {
      post_id: "post-1",
      content: "",
      struct_content: "",
      structured_content_rows: [],
      created_at: 1_700_000_000,
      ...reply,
    },
    images: [],
    stat: { like_num: 0 },
    r_post: { post_id: "post-1", subject: "原帖标题" },
    ...rest,
  });
}

/**
 * 构造评论图片夹具。
 * @since Beta v0.13.0
 * @param url - 图片地址
 * @returns 评论图片夹具
 */
function createImage(url: string): TGApp.BBS.Post.Image {
  return <TGApp.BBS.Post.Image>(<unknown>{
    url,
    width: 640,
    height: 360,
    format: "jpg",
    size: "1",
  });
}

describe("getCommunityCommentContent", () => {
  it("keeps plain text emoji tokens for TpParser", () => {
    const comment = createComment({ reply: { content: "转发 _(2)" } });

    expect(getCommunityCommentContent(comment)).toEqual([{ insert: "转发 _(2)" }]);
  });

  it("preserves structured text, mentions, links, and images", () => {
    const comment = createComment({
      reply: {
        struct_content: JSON.stringify([
          { insert: "查看 ", attributes: { bold: true } },
          { insert: { mention: { uid: "100", nickname: "旅行者" } } },
          { insert: " 官网", attributes: { link: "https://example.com" } },
          {
            insert: { image: "https://example.com/comment.jpg" },
            attributes: { width: 320, height: 180 },
          },
        ]),
      },
    });

    expect(getCommunityCommentContent(comment)).toEqual([
      { insert: "查看 ", attributes: { bold: true } },
      { insert: { mention: { uid: "100", nickname: "旅行者" } } },
      { insert: " 官网", attributes: { link: "https://example.com" } },
      {
        insert: { image: "https://example.com/comment.jpg" },
        attributes: { width: 320, height: 180 },
      },
    ]);
  });

  it("uses plain text and appends top-level images when structured content is invalid", () => {
    const comment = createComment({
      reply: { struct_content: "{invalid", content: "图片评论" },
      images: [createImage("https://example.com/fallback.jpg")],
    });

    expect(getCommunityCommentContent(comment)).toEqual([
      { insert: "图片评论" },
      { insert: "\n" },
      {
        insert: { image: expect.objectContaining({ url: "https://example.com/fallback.jpg" }) },
        attributes: { width: 640, height: 360 },
      },
    ]);
  });

  it("keeps valid nodes when malformed nodes appear in the same structured array", () => {
    const comment = createComment({
      reply: {
        struct_content: JSON.stringify([
          { insert: null },
          { insert: "保留 _(2)", children: "invalid" },
          { insert: 42 },
          { insert: { mention: { uid: "100", nickname: "旅行者" } } },
        ]),
        content: "不应覆盖有效节点",
      },
    });

    expect(getCommunityCommentContent(comment)).toEqual([
      { insert: "保留 _(2)" },
      { insert: { mention: { uid: "100", nickname: "旅行者" } } },
    ]);
  });

  it("does not duplicate an image already present in structured content", () => {
    const image = createImage("https://example.com/duplicate.jpg");
    const comment = createComment({
      reply: {
        struct_content: JSON.stringify([{ insert: { image: image.url } }]),
      },
      images: [image],
    });

    expect(getCommunityCommentContent(comment)).toEqual([{ insert: { image: image.url } }]);
  });
});
