/**
 * 帖子瀑布流封面与布局回归测试。
 * @since Beta v0.14.1
 */

import { describe, expect, it } from "vitest";

import { layoutRankMasonry } from "../src/utils/bbs/forumRankMasonry.js";
import { getPostCover, getPostCoverRatio, getPostCoverUrl } from "../src/utils/bbs/postCover.js";

/** 帖子封面字段覆盖。 @since Beta v0.14.1 */
type PostCoverFixture = {
  /** 用户设置的封面 */
  cover?: TGApp.BBS.Post.CoverImage | null;
  /** 帖子图片列表 */
  imageList?: Array<TGApp.BBS.Post.CoverImage>;
  /** 旧版封面地址 */
  postCover?: string;
  /** 帖子图片地址列表 */
  postImages?: Array<string>;
};

/**
 * 创建仅包含封面字段的帖子测试数据。
 * @since Beta v0.14.1
 * @param fixture - 封面字段覆盖
 * @returns 帖子数据
 */
function createPost(fixture: PostCoverFixture): TGApp.BBS.Post.FullData {
  return <TGApp.BBS.Post.FullData>(<unknown>{
    post: {
      post_id: "1",
      subject: "",
      cover: fixture.postCover ?? "",
      images: fixture.postImages ?? [],
      created_at: 1,
      updated_at: 0,
    },
    cover: fixture.cover ?? null,
    image_list: fixture.imageList ?? [],
    forum: null,
    topics: [],
    user: null,
    stat: null,
    recommend_reason: null,
  });
}

describe("post card covers", () => {
  it("prefers the user cover and keeps its dimensions", () => {
    const cover = {
      url: "https://upload-bbs.miyoushe.com/cover.png?key=abc",
      width: 1200,
      height: 800,
    };
    const post = createPost({
      cover,
      postCover: "https://upload-bbs.miyoushe.com/other.png",
      postImages: ["https://upload-bbs.miyoushe.com/other.png"],
    });

    expect(getPostCover(post)).toEqual(cover);
    expect(getPostCoverRatio(post)).toBe(1.5);
  });

  it("matches a legacy cover URL to the image list while ignoring the processing query", () => {
    const post = createPost({
      postCover: "https://upload-bbs.miyoushe.com/first.webp?x-oss-process=image/crop,w_100",
      imageList: [{ url: "https://upload-bbs.miyoushe.com/first.webp", width: 900, height: 1200 }],
    });

    expect(getPostCover(post)).toEqual({
      url: "https://upload-bbs.miyoushe.com/first.webp?x-oss-process=image/crop,w_100",
      width: 900,
      height: 1200,
    });
    expect(getPostCoverRatio(post)).toBe(0.75);
  });

  it("falls back to the first image without dimensions and uses the empty cover ratio", () => {
    const post = createPost({ postImages: ["https://example.com/photo.jpg"] });

    expect(getPostCover(post)).toEqual({
      url: "https://example.com/photo.jpg",
      width: 0,
      height: 0,
    });
    expect(getPostCoverRatio(post)).toBe(69 / 32);
  });

  it("keeps exact cover ratios and defaults when no image exists", () => {
    const wide = createPost({
      cover: { url: "https://example.com/wide.png", width: 3000, height: 1000 },
    });
    const tall = createPost({
      cover: { url: "https://example.com/tall.png", width: 500, height: 2000 },
    });
    const empty = createPost({});

    expect(getPostCoverRatio(wide)).toBe(3);
    expect(getPostCoverRatio(tall)).toBe(0.25);
    expect(getPostCover(empty)).toBeUndefined();
    expect(getPostCoverRatio(empty)).toBe(69 / 32);
  });
});

describe("post card cover loading", () => {
  it("requests a thumbnail sized to the rendered card", () => {
    const url = new URL(getPostCoverUrl("https://upload-bbs.miyoushe.com/cover.jpg", 319.5, 80));

    expect(url.searchParams.get("x-oss-process")).toBe("image/resize,w_320/quality,Q_80");
  });

  it("keeps animated covers unprocessed unless the preview or share needs the original", () => {
    const gif = "https://upload-bbs.miyoushe.com/cover.gif?x-oss-process=image/crop,w_100";

    expect(getPostCoverUrl(gif, 320, 80)).toBe("https://upload-bbs.miyoushe.com/cover.gif");
    expect(getPostCoverUrl(gif, 320, 80, true)).toBe("https://upload-bbs.miyoushe.com/cover.gif");
  });

  it("uses the original URL for preview and falls back for unprocessable sources", () => {
    const source =
      "https://upload-bbs.miyoushe.com/cover.webp?key=abc&x-oss-process=image/crop,w_100";

    expect(getPostCoverUrl(source, 320, 80, true)).toBe(
      "https://upload-bbs.miyoushe.com/cover.webp?key=abc",
    );
    expect(getPostCoverUrl("/UI/post/defaultCover.webp", 320, 80)).toBe(
      "/UI/post/defaultCover.webp",
    );
    expect(getPostCoverUrl("", 320, 80)).toBe("");
  });
});

describe("post waterfall layout", () => {
  it("uses the post body estimate when columns are first estimated", () => {
    const items = [
      { id: "1", ratio: 1 },
      { id: "2", ratio: 2 },
      { id: "3", ratio: 1 },
    ];

    const compact = layoutRankMasonry(items, 524, new Map(), 100);
    const roomy = layoutRankMasonry(items, 524, new Map(), 260);

    expect(roomy.height).toBeGreaterThan(compact.height);
  });

  it("caps the waterfall at the requested column count", () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      ratio: 1,
    }));

    const layout = layoutRankMasonry(items, 1600, new Map(), 210, 5);

    expect(layout.columns).toBe(5);
    expect(new Set(layout.positions.map(({ left }) => left)).size).toBe(5);
    expect(layout.width).toBeGreaterThan(300);
  });

  it("caps the cover height when estimating columns", () => {
    const items = [{ id: "tall", ratio: 0.2 }];

    const uncapped = layoutRankMasonry(items, 524, new Map(), 210, 5);
    const capped = layoutRankMasonry(items, 524, new Map(), 210, 5, 480);

    expect(uncapped.positions[0].height).toBe(1490);
    expect(capped.positions[0].height).toBe(690);
  });
});
