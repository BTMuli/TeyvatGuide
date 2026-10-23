/**
 * 米游社回复表情编辑器工具回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { buildReplyDocument } from "../src/utils/bbs/replyDocument.js";
import {
  getReplyEditorInsertLength,
  normalizeReplyEditorEmoticon,
  parseReplyEditorText,
  serializeReplyEditorOps,
  type ReplyEditorOperation,
} from "../src/utils/bbs/replyEditor.js";

const smileUrl = "https://example.com/emoticons/smile.png";
const smile = { name: "smile", src: smileUrl };

describe("reply editor emoticon operations", () => {
  it("round trips mixed text, repeated emoticons, and line endings", () => {
    const operations = parseReplyEditorText("前_(smile)中_(smile)\n后\n", { smile: smileUrl });

    expect(operations).toEqual([
      { insert: "前" },
      { insert: { emoticon: smile } },
      { insert: "中" },
      { insert: { emoticon: smile } },
      { insert: "\n后\n" },
    ]);
    const quillOperations = [...operations, { insert: "\n" }];
    expect(serializeReplyEditorOps(quillOperations)).toBe("前_(smile)中_(smile)\n后\n");
    expect(serializeReplyEditorOps(quillOperations, false)).toBe("前_(smile)中_(smile)\n后\n\n");
  });

  it("keeps unknown tokens as plain text while parsing known tokens", () => {
    expect(parseReplyEditorText("_(unknown)_(smile)", { smile: smileUrl })).toEqual([
      { insert: "_(unknown)" },
      { insert: { emoticon: smile } },
    ]);
  });

  it("rejects unsafe emoticon names and URLs", () => {
    expect(() => normalizeReplyEditorEmoticon({ name: "bad(name", src: smileUrl })).toThrow();
    expect(() => normalizeReplyEditorEmoticon({ name: "bad\nname", src: smileUrl })).toThrow();
    expect(() =>
      normalizeReplyEditorEmoticon({ name: "smile", src: "http://example.com/smile.png" }),
    ).toThrow();
    expect(() =>
      serializeReplyEditorOps([
        { insert: { emoticon: { name: "smile", src: "data:image/png,x" } } },
      ]),
    ).toThrow();
  });

  it("serializes editor-shaped operations after a replacement", () => {
    const operations: Array<ReplyEditorOperation> = [
      { insert: "hello " },
      { insert: { emoticon: smile } },
      { insert: " world" },
    ];

    expect(serializeReplyEditorOps([...operations, { insert: "\n" }])).toBe("hello _(smile) world");
    expect(getReplyEditorInsertLength(operations[1].insert)).toBe(1);
    expect(getReplyEditorInsertLength(operations[0].insert)).toBe(6);
  });
});

describe("reply editor send compatibility", () => {
  it("keeps emoticon tokens while building a document with mentions and images", () => {
    const operations = parseReplyEditorText("前_(smile) @旅行者", { smile: smileUrl });
    const content = serializeReplyEditorOps([...operations, { insert: "\n" }]);
    const document = buildReplyDocument(
      content,
      [{ uid: 100000001, nickname: "旅行者" }],
      [{ url: "https://example.com/reply.png", width: 640, height: 480 }],
    );

    expect(document.content).toBe("前_(smile) @旅行者");
    expect(document.structuredContent).toEqual([
      { insert: "前_(smile) " },
      { insert: { mention: { uid: 100000001, nickname: "旅行者" } } },
      { insert: "\n" },
      {
        insert: { image: "https://example.com/reply.png" },
        attributes: { width: 640, height: 480 },
      },
      { insert: "\n" },
    ]);
  });
});
