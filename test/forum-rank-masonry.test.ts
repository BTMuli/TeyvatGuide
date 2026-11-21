/**
 * 榜单瀑布流定位回归测试。
 * @since Beta v0.14.1
 */

import { describe, expect, it } from "vitest";

import { getImageRankOption, getImageRankOptions } from "../src/utils/bbs/forumRank.js";
import { getRankMasonryTimings, layoutRankMasonry } from "../src/utils/bbs/forumRankMasonry.js";
import { getPostImageOriginalUrl, getPostImageThumbnailUrl } from "../src/utils/bbs/postImage.js";

const items = [
  { id: "1", ratio: 1 },
  { id: "2", ratio: 2 },
  { id: "3", ratio: 1 },
];

describe("forum ranking masonry", () => {
  it("starts each card halfway through the preceding one and finishes within the total duration", () => {
    const timings = getRankMasonryTimings(3, 800);

    expect(timings.map(({ delay }) => delay)).toEqual([0, 200, 400]);
    expect(timings.every(({ duration }) => duration === 400)).toBe(true);
    expect(timings[2].delay + timings[2].duration).toBe(800);
  });

  it("keeps the original rank and column when newly measured content adds height", () => {
    const estimates = layoutRankMasonry(items, 524, new Map());
    const measured = layoutRankMasonry(items, 524, new Map([["2", { width: 256, height: 350 }]]));

    expect(measured.width).toBe(256);
    expect(measured.positions.map(({ index }) => index)).toEqual([0, 1, 2]);
    expect(measured.positions[2]).toMatchObject({ top: 362, left: estimates.positions[2].left });
    expect(measured.height).toBe(measured.positions[2].top + measured.positions[2].height);
  });

  it("retains positions when appending and discards measurements from another width", () => {
    const sizes = new Map([["2", { width: 256, height: 350 }]]);
    const before = layoutRankMasonry(items, 524, sizes);
    const after = layoutRankMasonry([...items, { id: "4", ratio: 2 }], 524, sizes);
    const narrow = layoutRankMasonry(items, 300, sizes);
    expect(after.positions.slice(0, 3)).toEqual(before.positions);
    expect(narrow.positions.every(({ left }) => left === 0)).toBe(true);
    expect(narrow.positions[1].height).not.toBe(350);
  });
});

describe("forum ranking periods", () => {
  it("maps each selectable leaderboard period to its own icon", () => {
    const options = getImageRankOptions([1, 2, 3, 4]);

    expect(options.map(({ value, icon }) => [value, icon])).toEqual([
      [1, "mdi-calendar-today"],
      [2, "mdi-calendar-week"],
      [3, "mdi-calendar-month-outline"],
      [4, "mdi-account-star-outline"],
    ]);
    for (const option of options) {
      expect(getImageRankOption(option.value)).toEqual(option);
    }
    expect(getImageRankOption(0)).toBeUndefined();
  });
});

describe("forum ranking covers", () => {
  it("sizes the thumbnail to the rendered card and applies the selected JPEG quality", () => {
    const source = "https://upload-bbs.miyoushe.com/cover.jpg?key=abc";
    const thumbnail = new URL(getPostImageThumbnailUrl(source, 319.5, 80));

    expect(thumbnail.searchParams.get("x-oss-process")).toBe("image/resize,w_320/quality,Q_80");
    expect(thumbnail.searchParams.get("key")).toBe("abc");
  });

  it("preserves lossless and animated formats and skips rewrites for other hosts", () => {
    const png = "https://upload-bbs.mihoyo.com/cover.png";
    const gif = "https://upload-bbs.miyoushe.com/cover.gif";
    const other = "https://example.com/cover.jpg";

    for (const source of [png, gif]) {
      const thumbnail = new URL(getPostImageThumbnailUrl(source, 320, 80));
      expect(thumbnail.searchParams.get("x-oss-process")).toBe("image/resize,w_320");
      expect(thumbnail.pathname).toBe(new URL(source).pathname);
    }
    expect(getPostImageThumbnailUrl(other, 320, 80)).toBe(other);
    expect(getPostImageThumbnailUrl(png, 0, 80)).toBe(png);
  });

  it("sizes a community post thumbnail by height and removes cropping from the image preview", () => {
    const source =
      "https://upload-bbs.miyoushe.com/post.webp?key=abc&x-oss-process=image/crop,w_100";
    const thumbnail = new URL(getPostImageThumbnailUrl(source, 160, 80, "height"));
    const original = getPostImageOriginalUrl(source);

    expect(thumbnail.searchParams.get("x-oss-process")).toBe("image/resize,h_160/quality,Q_80");
    expect(original?.href).toBe("https://upload-bbs.miyoushe.com/post.webp?key=abc");
  });
});
