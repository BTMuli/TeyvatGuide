/**
 * 米游社帖子编辑器表情令牌回归测试。
 * @since Beta v0.12.6
 */

import { describe, expect, it } from "vitest";

import { parsePostEmoticonMap, splitPostEmoticonText } from "../src/utils/bbsPostEmoticon.js";

const smileUrl = "https://example.com/emoticons/smile.png";

describe("parsePostEmoticonMap", () => {
  it("keeps safe HTTPS mappings and ignores malformed cache entries", () => {
    const map = parsePostEmoticonMap(
      JSON.stringify({
        smile: smileUrl,
        "bad name ": smileUrl,
        unsafe: "http://example.com/emoticons/unsafe.png",
        broken: "not a URL",
      }),
    );

    expect(map).toEqual({ smile: smileUrl });
  });

  it("returns an empty map for invalid JSON or non-object values", () => {
    expect(parsePostEmoticonMap("not JSON")).toEqual({});
    expect(parsePostEmoticonMap(["smile", smileUrl])).toEqual({});
    expect(parsePostEmoticonMap(null)).toEqual({});
  });
});

describe("splitPostEmoticonText", () => {
  it("converts known tokens while preserving unknown text", () => {
    expect(splitPostEmoticonText("前_(unknown)中_(smile)后", { smile: smileUrl })).toEqual([
      { insert: "前_(unknown)中", sourceLength: 12 },
      { insert: { emoticon: { name: "smile", src: smileUrl } }, sourceLength: 8 },
      { insert: "后", sourceLength: 1 },
    ]);
  });

  it("does not interpret nested or line-breaking tokens", () => {
    const text = "_(smile_(nested))\n_(smile)";
    expect(splitPostEmoticonText(text, { smile: smileUrl })).toEqual([
      { insert: `${text.slice(0, -8)}`, sourceLength: text.length - 8 },
      { insert: { emoticon: { name: "smile", src: smileUrl } }, sourceLength: 8 },
    ]);
  });
});
