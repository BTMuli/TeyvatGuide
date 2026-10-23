/**
 * 米游社帖子预览表情映射回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import {
  collectPostPreviewEmoticonMap,
  getMissingPostPreviewEmoticonNames,
} from "../src/utils/bbsPostPreview.js";

const smileUrl = "https://example.com/emoticons/smile.png";
const customUrl = "https://example.com/emoticons/custom.webp";

describe("collectPostPreviewEmoticonMap", () => {
  it("collects only safe emoticons from current draft embeds", () => {
    const map = collectPostPreviewEmoticonMap([
      { insert: { emoticon: { name: "smile", src: smileUrl } } },
      { insert: { emoticon: { name: "unsafe", src: "http://example.com/unsafe.png" } } },
      { insert: "text" },
      {
        insert: "container",
        children: [{ insert: { emoticon: { name: "nested", src: smileUrl } } }],
      },
    ]);

    expect(map).toEqual({ smile: smileUrl, nested: smileUrl });
  });

  it("ignores malformed draft nodes without changing their input", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [
      { insert: { emoticon: { name: "bad name ", src: smileUrl } } },
      { insert: { emoticon: { name: "missing source" } } },
    ];

    expect(collectPostPreviewEmoticonMap(nodes)).toEqual({});
    expect(nodes).toEqual([
      { insert: { emoticon: { name: "bad name ", src: smileUrl } } },
      { insert: { emoticon: { name: "missing source" } } },
    ]);
  });

  it("keeps custom emoticon embeds out of the ordinary emoticon token map", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [
      {
        insert: {
          custom_emoticon: {
            id: "custom-one",
            url: customUrl,
            size: { width: 96, height: 64 },
            is_available: true,
          },
          backup_text: "[自定义表情]",
        },
      },
    ];

    expect(collectPostPreviewEmoticonMap(nodes)).toEqual({});
    expect(nodes[0]?.insert).toEqual({
      custom_emoticon: {
        id: "custom-one",
        url: customUrl,
        size: { width: 96, height: 64 },
        is_available: true,
      },
      backup_text: "[自定义表情]",
    });
  });
});

describe("getMissingPostPreviewEmoticonNames", () => {
  it("returns unknown token names for a possible directory refresh", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [{ insert: "前_(unknown)中_(smile)后_(unknown)" }];

    expect(getMissingPostPreviewEmoticonNames(nodes, { smile: smileUrl })).toEqual(["unknown"]);
  });
});
