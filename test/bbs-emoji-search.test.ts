/**
 * 米游社表情包搜索回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { searchEmojiItems } from "../src/utils/bbs/emojiSearch.js";

/**
 * 创建表情测试数据。
 * @since Beta v0.13.0
 * @param id - 表情 ID
 * @param name - 表情名称
 * @param sortOrder - 表情排序
 * @param keywords - 表情关键词
 * @param overrides - 本次用例覆盖的字段
 * @returns 表情测试数据
 */
function createEmoji(
  id: number,
  name: string,
  sortOrder: number,
  keywords: Array<unknown> = [],
  overrides: Partial<TGApp.BBS.Emoji.Item> = {},
): TGApp.BBS.Emoji.Item {
  return {
    id,
    name,
    icon: `https://example.com/emoticons/${id}.png`,
    sort_order: sortOrder,
    static_icon: "",
    updated_at: 0,
    is_available: true,
    status: "published",
    keywords,
    ...overrides,
  };
}

/**
 * 创建表情系列测试数据。
 * @since Beta v0.13.0
 * @param id - 系列 ID
 * @param name - 系列名称
 * @param sortOrder - 系列排序
 * @param list - 系列内表情
 * @param overrides - 本次用例覆盖的字段
 * @returns 表情系列测试数据
 */
function createSeries(
  id: number,
  name: string,
  sortOrder: number,
  list: Array<TGApp.BBS.Emoji.Item>,
  overrides: Partial<TGApp.BBS.Emoji.Series> = {},
): TGApp.BBS.Emoji.Series {
  return {
    id,
    name,
    icon: `https://example.com/series/${id}.png`,
    sort_order: sortOrder,
    num: list.length,
    status: "published",
    list,
    updated_at: 0,
    is_available: true,
    ...overrides,
  };
}

describe("searchEmojiItems", () => {
  it("matches names and keywords across series", () => {
    const paimon = createSeries(1, "米游兔", 1, [
      createEmoji(1, "派蒙 开心", 1),
      createEmoji(2, "派蒙 难过", 2),
    ]);
    const klee = createSeries(2, "原神官方", 2, [
      createEmoji(3, "可莉 开心", 1),
      createEmoji(4, "可莉 登场", 2, ["蒙德", "火花"]),
    ]);

    expect(searchEmojiItems([paimon, klee], "开心").map((emoji) => emoji.id)).toEqual([1, 3]);
    expect(searchEmojiItems([paimon, klee], "派蒙开心").map((emoji) => emoji.id)).toEqual([1]);
    expect(searchEmojiItems([paimon, klee], "蒙德").map((emoji) => emoji.id)).toEqual([4]);
  });

  it("ranks exact, prefix, substring and keyword matches in order", () => {
    const series = createSeries(1, "测试", 1, [
      createEmoji(1, "难过", 1, ["开心"]),
      createEmoji(2, "不开心", 2),
      createEmoji(3, "开心果", 3),
      createEmoji(4, "开心", 4),
    ]);

    expect(searchEmojiItems([series], "开心").map((emoji) => emoji.id)).toEqual([4, 3, 2, 1]);
  });

  it("ignores unavailable entries, empty icons, unavailable series and duplicate ids", () => {
    const first = createSeries(1, "测试", 1, [
      createEmoji(1, "可用", 1),
      createEmoji(2, "隐藏", 2, [], { is_available: false }),
      createEmoji(3, "无图", 3, [], { icon: "" }),
    ]);
    const second = createSeries(2, "重复", 2, [
      createEmoji(1, "可用", 1),
      createEmoji(4, "重复", 2),
    ]);
    const hidden = createSeries(3, "隐藏系列", 3, [createEmoji(5, "可用", 1)], {
      is_available: false,
    });

    expect(searchEmojiItems([first, second, hidden], "可用").map((emoji) => emoji.id)).toEqual([1]);
    expect(searchEmojiItems([first, second, hidden], "重复").map((emoji) => emoji.id)).toEqual([4]);
  });

  it("returns no results for empty or unmatched queries", () => {
    const series = createSeries(1, "测试", 1, [createEmoji(1, "开心", 1)]);

    expect(searchEmojiItems([series], "")).toEqual([]);
    expect(searchEmojiItems([series], "   ")).toEqual([]);
    expect(searchEmojiItems([series], "不存在")).toEqual([]);
  });

  it("matches case-insensitively and ignores whitespace", () => {
    const series = createSeries(1, "测试", 1, [createEmoji(1, "Klee Spark", 1)]);

    expect(searchEmojiItems([series], "klee   spark").map((emoji) => emoji.id)).toEqual([1]);
  });
});
