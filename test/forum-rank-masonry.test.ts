/**
 * 榜单瀑布流定位回归测试。
 * @since Beta v0.13.2
 */

import { describe, expect, it } from "vitest";

import { getRankCoverThumbnailUrl } from "../src/utils/bbs/forumRank.js";
import { getRankMasonryTimings, layoutRankMasonry } from "../src/utils/bbs/forumRankMasonry.js";

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

describe("forum ranking covers", () => {
  it("sizes the thumbnail to the rendered card and applies the selected JPEG quality", () => {
    const source = "https://upload-bbs.miyoushe.com/cover.jpg?key=abc";
    const thumbnail = new URL(getRankCoverThumbnailUrl(source, 319.5, 80));

    expect(thumbnail.searchParams.get("x-oss-process")).toBe("image/resize,w_320/quality,Q_80");
    expect(thumbnail.searchParams.get("key")).toBe("abc");
  });

  it("preserves lossless and animated formats and skips rewrites for other hosts", () => {
    const png = "https://upload-bbs.mihoyo.com/cover.png";
    const gif = "https://upload-bbs.miyoushe.com/cover.gif";
    const other = "https://example.com/cover.jpg";

    for (const source of [png, gif]) {
      const thumbnail = new URL(getRankCoverThumbnailUrl(source, 320, 80));
      expect(thumbnail.searchParams.get("x-oss-process")).toBe("image/resize,w_320");
      expect(thumbnail.pathname).toBe(new URL(source).pathname);
    }
    expect(getRankCoverThumbnailUrl(other, 320, 80)).toBe(other);
    expect(getRankCoverThumbnailUrl(png, 0, 80)).toBe(png);
  });
});
