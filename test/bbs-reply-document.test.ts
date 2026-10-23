/**
 * 米游社回复结构化文档回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import {
  buildReplyDocument,
  getReplyContentFromSendNodes,
  serializeReplySendNodes,
  validateReplySendNodes,
} from "../src/utils/bbsReplyDocument.js";

const mention = { uid: 100000001, nickname: "旅行者" };
const firstImage = { url: "https://example.com/first.png", width: 640, height: 480 };
const secondImage = { url: "https://example.com/second.png", width: 320, height: 240 };
const customEmoticon = {
  id: "custom-1",
  url: "https://example.com/custom.webp",
  size: { width: 128, height: 128, file_size: 1024 },
  is_available: true,
  hash: "custom-hash",
};

describe("buildReplyDocument", () => {
  it("keeps text and mentions in order before appending images", () => {
    const document = buildReplyDocument(
      " 你好 _(开心) @旅行者 @普通文本 @旅行者 ",
      [mention],
      [firstImage, secondImage],
    );

    expect(document.content).toBe("你好 _(开心) @旅行者 @普通文本 @旅行者");
    expect(document.structuredContent).toEqual([
      { insert: "你好 _(开心) " },
      { insert: { mention } },
      { insert: " @普通文本 " },
      { insert: { mention } },
      { insert: "\n" },
      {
        insert: { image: firstImage.url },
        attributes: { width: firstImage.width, height: firstImage.height },
      },
      { insert: "\n" },
      {
        insert: { image: secondImage.url },
        attributes: { width: secondImage.width, height: secondImage.height },
      },
      { insert: "\n" },
    ]);
    expect(document.preview).toContain("@旅行者");
    expect(document.preview).toContain("图片 2 张");
  });

  it("requires a complete selected nickname and keeps ordinary @ text plain", () => {
    const document = buildReplyDocument("@旅行者人 @旅行者 @未选择", [mention], []);

    expect(document.structuredContent).toEqual([
      { insert: "@旅行者人 " },
      { insert: { mention } },
      { insert: " @未选择\n" },
    ]);
  });

  it("recognizes a selected nickname directly after existing text", () => {
    const document = buildReplyDocument("你好@旅行者 ", [mention], []);

    expect(document.structuredContent).toEqual([
      { insert: "你好" },
      { insert: { mention } },
      { insert: "\n" },
    ]);
  });

  it("removes a mention node when the selected mention is removed", () => {
    const document = buildReplyDocument("@旅行者", [], []);

    expect(document.content).toBe("@旅行者");
    expect(document.structuredContent).toEqual([{ insert: "@旅行者\n" }]);
  });

  it("supports repeated mentions and rejects conflicting duplicate nicknames", () => {
    const document = buildReplyDocument("@旅行者 @旅行者", [mention, { ...mention }], []);
    expect(document.structuredContent).toEqual([
      { insert: { mention } },
      { insert: " " },
      { insert: { mention } },
      { insert: "\n" },
    ]);

    expect(() =>
      buildReplyDocument("@旅行者", [mention, { uid: 100000002, nickname: mention.nickname }], []),
    ).toThrow();
  });

  it("supports pure image documents and treats whitespace-only text as empty", () => {
    const document = buildReplyDocument(" \n\t ", [], [firstImage, secondImage]);

    expect(document.content).toBe("");
    expect(document.structuredContent).toEqual([
      {
        insert: { image: firstImage.url },
        attributes: { width: firstImage.width, height: firstImage.height },
      },
      { insert: "\n" },
      {
        insert: { image: secondImage.url },
        attributes: { width: secondImage.width, height: secondImage.height },
      },
      { insert: "\n" },
    ]);
    expect(document.preview).toBe("图片 2 张");
    expect(buildReplyDocument(" \t ", [], [])).toEqual({
      content: "",
      structuredContent: [],
      preview: "",
    });
  });

  it("places one custom emoticon after text and mentions before images", () => {
    const document = buildReplyDocument("hello @旅行者", [mention], [firstImage], customEmoticon);

    expect(document.content).toBe("hello @旅行者\n[自定义表情]");
    expect(document.structuredContent).toEqual([
      { insert: "hello " },
      { insert: { mention } },
      { insert: "\n" },
      {
        insert: {
          custom_emoticon: customEmoticon,
          backup_text: "[自定义表情]",
        },
      },
      { insert: "\n" },
      {
        insert: { image: firstImage.url },
        attributes: { width: firstImage.width, height: firstImage.height },
      },
      { insert: "\n" },
    ]);
    expect(document.preview).toBe("hello @旅行者 · [自定义表情] · 图片 1 张");
  });

  it("allows a pure custom emoticon document and copies its nested metadata", () => {
    const before = structuredClone(customEmoticon);
    const document = buildReplyDocument("", [], [], customEmoticon);

    expect(document.content).toBe("[自定义表情]");
    expect(document.structuredContent).toEqual([
      {
        insert: {
          custom_emoticon: customEmoticon,
          backup_text: "[自定义表情]",
        },
      },
      { insert: "\n" },
    ]);
    expect(document.preview).toBe("[自定义表情]");
    expect(customEmoticon).toEqual(before);
    const node = document.structuredContent[0];
    if (typeof node.insert === "string" || !("custom_emoticon" in node.insert)) {
      throw new Error("expected custom emoticon node");
    }
    expect(node.insert.custom_emoticon).not.toBe(customEmoticon);
    expect(node.insert.custom_emoticon.size).not.toBe(customEmoticon.size);
  });

  it("rejects unavailable custom emoticons", () => {
    expect(() =>
      buildReplyDocument("", [], [], { ...customEmoticon, is_available: false }),
    ).toThrow();
  });

  it("does not mutate mentions or images", () => {
    const mentions = [mention];
    const images = [firstImage];
    const mentionsSnapshot = structuredClone(mentions);
    const imagesSnapshot = structuredClone(images);

    buildReplyDocument("@旅行者", mentions, images);

    expect(mentions).toEqual(mentionsSnapshot);
    expect(images).toEqual(imagesSnapshot);
  });
});

describe("reply send node validation", () => {
  it.each([
    [{ insert: { custom_emoticon: "smile" } }],
    [
      {
        insert: {
          custom_emoticon: {
            id: "custom-1",
            url: "http://example.com/custom.webp",
            size: { width: 128, height: 128 },
          },
        },
      },
    ],
    [
      {
        insert: {
          custom_emoticon: {
            id: "custom-1",
            url: "https://user:pass@example.com/custom.webp",
            size: { width: 128, height: 128 },
          },
        },
      },
    ],
    [
      {
        insert: {
          custom_emoticon: {
            id: "custom-1",
            url: "https://example.com/custom.webp",
            size: { width: 0, height: 128 },
          },
        },
      },
    ],
    [
      {
        insert: {
          custom_emoticon: customEmoticon,
          backup_text: "wrong",
        },
      },
    ],
    [{ insert: { game_user_info: { uid: 1 } } }],
    [{ insert: { image: "http://example.com/image.png" }, attributes: { width: 1, height: 1 } }],
    [{ insert: { image: "data:image/png;base64,abc" }, attributes: { width: 1, height: 1 } }],
    [{ insert: { image: "blob:https://example.com/id" }, attributes: { width: 1, height: 1 } }],
    [
      {
        insert: { image: "https://user:pass@example.com/image.png" },
        attributes: { width: 1, height: 1 },
      },
    ],
    [{ insert: { image: "https://example.com/image.png" }, attributes: { width: 0, height: 1 } }],
    [{ insert: { image: "https://example.com/image.png" }, attributes: { width: 1.5, height: 1 } }],
    [{ insert: { mention: { uid: 0, nickname: "旅行者" } } }],
    [{ insert: { mention: { uid: Number.MAX_SAFE_INTEGER + 1, nickname: "旅行者" } } }],
  ])("rejects invalid node %j", (nodes) => {
    expect(() => validateReplySendNodes(nodes)).toThrow();
  });

  it("rejects unknown and empty documents", () => {
    expect(() => validateReplySendNodes([{ insert: "\n" }])).toThrow();
    expect(() => validateReplySendNodes([])).toThrow();
  });

  it("serializes validated nodes without changing their values", () => {
    const nodes: Array<TGApp.BBS.Reply.SendNode> = [
      { insert: "hello " },
      { insert: { mention } },
      { insert: "\n" },
      {
        insert: { image: firstImage.url },
        attributes: { width: firstImage.width, height: firstImage.height },
      },
      { insert: "\n" },
    ];
    const before = structuredClone(nodes);

    expect(JSON.parse(serializeReplySendNodes(nodes))).toEqual(nodes);
    expect(getReplyContentFromSendNodes(nodes)).toBe("hello @旅行者");
    expect(nodes).toEqual(before);
  });

  it("normalizes custom emoticon backup text and rejects duplicates", () => {
    const node = { insert: { custom_emoticon: customEmoticon } };
    expect(validateReplySendNodes([node])).toEqual([
      {
        insert: {
          custom_emoticon: customEmoticon,
          backup_text: "[自定义表情]",
        },
      },
    ]);
    expect(() => validateReplySendNodes([node, node])).toThrow();
    expect(getReplyContentFromSendNodes(validateReplySendNodes([node]))).toBe("[自定义表情]");
  });
});
