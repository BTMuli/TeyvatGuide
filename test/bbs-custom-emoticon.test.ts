/**
 * 米游社收藏表情数据契约回归测试
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { parseCustomEmoticon, parseCustomEmoticonList } from "../src/utils/bbsCustomEmoticon.js";

const imageUrl = "https://example.com/emoticons/one.webp";

describe("parseCustomEmoticon", () => {
  it("validates optional fields and deep copies the nested size", () => {
    const source = {
      id: "one",
      url: imageUrl,
      size: { width: 64, height: 48, file_size: 1234 },
      is_available: false,
      hash: "hash-one",
    };

    const parsed = parseCustomEmoticon(source);
    expect(parsed).toEqual(source);

    source.size.width = 128;
    expect(parsed.size.width).toBe(64);
  });

  it.each([
    { id: "", url: imageUrl, size: { width: 64, height: 48 } },
    { id: "one", url: "http://example.com/emoticons/one.webp", size: { width: 64, height: 48 } },
    { id: "one", url: imageUrl, size: { width: 0, height: 48 } },
    { id: "one", url: imageUrl, size: { width: 64, height: 48, file_size: 0 } },
    { id: "one", url: imageUrl, size: { width: 64, height: 48 }, is_available: "yes" },
    { id: "one", url: imageUrl, size: { width: 64, height: 48 }, hash: 42 },
  ])("rejects an unsafe or malformed value: %o", (value) => {
    expect(() => parseCustomEmoticon(value)).toThrow();
  });
});

describe("parseCustomEmoticonList", () => {
  it("maps the real STATUS_ONLINE response without requiring is_available", () => {
    const source: TGApp.BBS.CustomEmoticon.ListRes = {
      list: [
        {
          id: "2",
          name: "",
          icon: "https://example.com/emoticons/custom.gif",
          sort_order: 0,
          static_icon: "",
          updated_at: "1676082106125",
          status: "STATUS_ONLINE",
          type: "EmoticonTypeCustom",
          img_ext: { file_size: 81194, width: 500, height: 491 },
        },
        {
          id: "1",
          name: "",
          icon: "https://example.com/emoticons/custom.jpg",
          sort_order: 0,
          static_icon: "",
          updated_at: "1676082083557",
          status: "STATUS_ONLINE",
          type: "EmoticonTypeCustom",
          img_ext: { file_size: 125681, width: 800, height: 883 },
        },
      ],
    };

    expect(parseCustomEmoticonList(source)).toEqual([
      {
        id: "2",
        url: "https://example.com/emoticons/custom.gif",
        size: { file_size: 81194, width: 500, height: 491 },
        is_available: true,
      },
      {
        id: "1",
        url: "https://example.com/emoticons/custom.jpg",
        size: { file_size: 125681, width: 800, height: 883 },
        is_available: true,
      },
    ]);
    expect(source.list[0]).not.toHaveProperty("is_available");
  });

  it.each([
    { status: "STATUS_OFFLINE" },
    { status: "STATUS_UNKNOWN" },
    { status: "STATUS_ONLINE", is_available: false },
    { status: "STATUS_ONLINE", usable: false },
    { status: "STATUS_OFFLINE", is_available: true },
  ])("does not enable unavailable or unknown statuses: %o", (availability) => {
    expect(
      parseCustomEmoticonList({
        list: [{ id: "one", icon: imageUrl, img_ext: { width: 64, height: 48 }, ...availability }],
      }),
    ).toEqual([]);
  });

  it("distinguishes an empty list from entries that all failed parsing", () => {
    expect(parseCustomEmoticonList({ list: [] })).toEqual([]);
    expect(() =>
      parseCustomEmoticonList({
        list: [{ id: "one", icon: imageUrl, img_ext: { width: 64, height: 48 } }],
      }),
    ).toThrow("收藏表情数据格式无效");
    expect(() =>
      parseCustomEmoticonList({
        list: [
          { id: "one", icon: imageUrl, img_ext: { width: 0, height: 48 }, status: "STATUS_ONLINE" },
        ],
      }),
    ).toThrow("收藏表情数据格式无效");
  });

  it("maps native fields, supports canonical aliases, and filters unavailable items", () => {
    const parsed = parseCustomEmoticonList({
      list: [
        {
          id: "native",
          icon: imageUrl,
          img_ext: { width: 64, height: 48, file_size: 1234 },
          is_available: true,
          hash: "native-hash",
        },
        {
          id: "native",
          icon: "https://example.com/emoticons/duplicate.webp",
          img_ext: { width: 80, height: 80 },
          is_available: true,
        },
        {
          id: "canonical",
          url: "https://example.com/emoticons/two.webp",
          size: { width: 32, height: 32 },
          is_available: true,
        },
        {
          id: "unavailable",
          icon: imageUrl,
          img_ext: { width: 64, height: 48 },
          is_available: false,
        },
        {
          id: "invalid-url",
          icon: "http://example.com/bad.webp",
          img_ext: { width: 64, height: 48 },
          is_available: true,
        },
        {
          id: "invalid-size",
          icon: imageUrl,
          img_ext: { width: 0, height: 48 },
          is_available: true,
        },
      ],
    });

    expect(parsed).toEqual([
      {
        id: "native",
        url: imageUrl,
        size: { width: 64, height: 48, file_size: 1234 },
        is_available: true,
        hash: "native-hash",
      },
      {
        id: "canonical",
        url: "https://example.com/emoticons/two.webp",
        size: { width: 32, height: 32 },
        is_available: true,
      },
    ]);
  });

  it("rejects malformed top-level data instead of treating it as an empty list", () => {
    expect(() => parseCustomEmoticonList(null)).toThrow("响应数据无效");
    expect(() => parseCustomEmoticonList({ list: null })).toThrow("缺少有效 list");
    expect(() =>
      parseCustomEmoticonList({ list: [], retcode: -100, message: "not login" }),
    ).toThrow("not login");
  });
});
