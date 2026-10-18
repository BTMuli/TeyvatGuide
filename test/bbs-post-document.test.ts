/**
 * 米游社富文本帖子文档回归测试。
 * @since Beta v0.12.6
 */

import { describe, expect, it } from "vitest";

import {
  assertPostDocumentContent,
  buildPostDocument,
  isPostUrl,
  parsePostNodes,
} from "../src/utils/bbsPostDocument.js";

const imageUrl = "https://example.com/images/post.png";
const mention = { uid: 100000001, nickname: "旅行者" };

describe("parsePostNodes", () => {
  it("preserves inline and line attributes while copying the document", () => {
    const nodes: Array<TGApp.BBS.PostEdit.Node> = [
      {
        insert: "styled",
        attributes: {
          bold: true,
          italic: true,
          color: "#A1b2C3",
        },
      },
      { insert: "linked", attributes: { link: "https://example.com/a'b" } },
      { insert: "\n", attributes: { header: 2, align: "right" } },
    ];
    const before = structuredClone(nodes);

    const parsed = parsePostNodes(nodes);

    expect(parsed).toEqual(nodes);
    expect(nodes).toEqual(before);
  });

  it("normalizes linked text color without mutating the input", () => {
    const nodes: Array<TGApp.BBS.PostEdit.Node> = [
      {
        insert: "linked",
        attributes: { color: "#A1b2C3", link: "https://example.com" },
      },
      { insert: "\n" },
    ];
    const before = structuredClone(nodes);

    const parsed = parsePostNodes(nodes);

    expect(parsed[0]?.attributes).toEqual({ link: "https://example.com" });
    expect(nodes).toEqual(before);
  });

  it.each(<const>[1, 2])("preserves header level %s", (header) => {
    const document = buildPostDocument([
      { insert: `heading ${header}` },
      { insert: "\n", attributes: { header } },
    ]);

    expect(document.nodes.at(-1)).toEqual({ insert: "\n", attributes: { header } });
  });

  it.each(<const>["left", "center", "right"])("preserves %s line alignment", (align) => {
    const document = buildPostDocument([
      { insert: "aligned" },
      { insert: "\n", attributes: { align } },
    ]);

    expect(document.nodes.at(-1)).toEqual({ insert: "\n", attributes: { align } });
  });

  it("clones nested mentions, attributes, and input nodes", () => {
    const nodes: Array<TGApp.BBS.PostEdit.Node> = [
      { insert: "styled", attributes: { bold: true } },
      { insert: { mention: { ...mention } } },
    ];
    const before = structuredClone(nodes);

    const parsed = parsePostNodes(nodes);
    const first = parsed[0];
    if (first?.attributes !== undefined) first.attributes.bold = false;
    const second = parsed[1];
    if (second && typeof second.insert !== "string" && "mention" in second.insert) {
      second.insert.mention.nickname = "修改后的昵称";
    }

    expect(nodes).toEqual(before);
    expect(parsed).not.toBe(nodes);
    expect(parsed[0]).not.toBe(nodes[0]);
  });

  it("adds one trailing newline and does not duplicate an existing one", () => {
    expect(parsePostNodes([{ insert: "hello" }])).toEqual([{ insert: "hello" }, { insert: "\n" }]);
    expect(parsePostNodes([{ insert: "hello\n" }])).toEqual([{ insert: "hello\n" }]);
  });
});

describe("buildPostDocument", () => {
  it("normalizes official editor emoticons to their post text token", () => {
    const nodes = [
      { insert: { emoticon: { src: "https://example.com/emoticons/smile.png", name: "smile" } } },
      { insert: "\n" },
    ];

    expect(parsePostNodes(nodes)).toEqual([{ insert: "_(smile)" }, { insert: "\n" }]);
    expect(buildPostDocument(nodes).text).toBe("_(smile)");
  });

  it("preserves images, optional image links, and mentions", () => {
    const document = buildPostDocument([
      { insert: "hello " },
      { insert: { mention } },
      { insert: { image: imageUrl }, attributes: { link: "https://example.com/image" } },
    ]);

    expect(document.text).toBe("hello @旅行者");
    expect(document.images).toEqual([imageUrl]);
    expect(document.nodes[1]).toEqual({ insert: { mention } });
    expect(document.nodes[2]).toEqual({
      insert: { image: imageUrl },
      attributes: { link: "https://example.com/image" },
    });
  });

  it("preserves literal text, mention names, and URL data", () => {
    const text = `<img src=x onerror='x'>&"'`;
    const nickname = `<img src=x onerror='mention'>`;
    const linkedText = buildPostDocument([
      { insert: text, attributes: { link: "https://example.com/a'b" } },
      { insert: "\n" },
    ]);
    const mentionDocument = buildPostDocument([
      { insert: { mention: { uid: 100000001, nickname } } },
      { insert: "\n" },
    ]);
    const imageDocument = buildPostDocument([
      { insert: { image: "https://example.com/a'b.png" } },
      { insert: "\n" },
    ]);

    expect(linkedText.text).toBe(text);
    expect(linkedText.nodes[0]?.attributes?.link).toBe("https://example.com/a'b");
    expect(mentionDocument.text).toBe(`@${nickname}`);
    expect(imageDocument.images).toEqual(["https://example.com/a'b.png"]);
  });

  it("rejects whitespace-only content but allows an image-only document", () => {
    const whitespace = buildPostDocument([{ insert: " \n\t " }]);
    const imageOnly = buildPostDocument([{ insert: { image: imageUrl } }, { insert: "\n" }]);

    expect(() => assertPostDocumentContent(whitespace)).toThrow();
    expect(() => assertPostDocumentContent(imageOnly)).not.toThrow();
  });

  it("removes only the document's final newline from the plain-text preview", () => {
    const document = buildPostDocument([{ insert: "first\nsecond\n" }]);

    expect(document.text).toBe("first\nsecond");
  });

  it.each([30000, 30001])("checks the %s-character content boundary", (length) => {
    const document = buildPostDocument([{ insert: "字".repeat(length) }]);
    const validate = () => assertPostDocumentContent(document);
    if (length === 30000) expect(validate).not.toThrow();
    else expect(validate).toThrow("30000");
  });

  it.each([50, 51])("checks the %s-image boundary", (length) => {
    const document = buildPostDocument(
      Array.from({ length }, () => ({ insert: { image: imageUrl } })),
    );
    const validate = () => assertPostDocumentContent(document);
    if (length === 50) expect(validate).not.toThrow();
    else expect(validate).toThrow("50 张图片");
  });

  it.each([50, 51])("checks the %s-emoticon boundary", (length) => {
    const document = buildPostDocument([{ insert: "_(smile)".repeat(length) }]);
    const validate = () => assertPostDocumentContent(document);
    if (length === 50) expect(validate).not.toThrow();
    else expect(validate).toThrow("50 个表情");
  });

  it.each([100, 101])("checks the %s-mention boundary", (length) => {
    const document = buildPostDocument(Array.from({ length }, () => ({ insert: { mention } })));
    const validate = () => assertPostDocumentContent(document);
    if (length === 100) expect(validate).not.toThrow();
    else expect(validate).toThrow("100 位用户");
  });
});

describe("post URL validation", () => {
  it("allows HTTP/HTTPS links and HTTPS images", () => {
    expect(isPostUrl("http://example.com/article")).toBe(true);
    expect(isPostUrl("https://example.com/article")).toBe(true);
    expect(isPostUrl("https://example.com/image.png", true)).toBe(true);
    expect(isPostUrl("http://example.com/image.png", true)).toBe(false);
  });

  it.each(<const>[
    "ftp://example.com/file",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://user:pass@example.com/file",
    "https://example.com/file\nnext",
    "https://example.com/file\tfragment",
  ])("rejects unsafe link URL %s", (url) => {
    expect(isPostUrl(url)).toBe(false);
  });

  it.each(<const>[
    "http://example.com/image.png",
    "data:image/png;base64,abc",
    "blob:https://example.com/id",
    "https://user:pass@example.com/image.png",
    "https://example.com/image.png\nnext",
  ])("rejects unsafe image URL %s", (url) => {
    expect(() => parsePostNodes([{ insert: { image: url } }])).toThrow();
  });
});

describe("unsupported post content", () => {
  it.each(<ReadonlyArray<unknown>>[
    [{ insert: { emoticon: { src: "http://example.com/smile.png", name: "smile" } } }],
    [{ insert: { emoticon: { src: imageUrl, name: "smile()" } } }],
    [{ insert: { custom_emoticon: "smile" } }],
    [{ insert: { video: "https://example.com/video" } }],
    [{ insert: { link_card: "card-id" } }],
    [{ insert: { game_user_info: { uid: 100000001 } } }],
    [{ insert: "safe" }, { retain: 1 }],
    [{ insert: "safe" }, { delete: 1 }],
    [{ insert: "safe", attributes: { background: "red" } }],
    [{ insert: { image: imageUrl }, attributes: { width: 1, height: 1, alt: "image" } }],
    [{ insert: { image: imageUrl }, attributes: { width: 1 } }],
    [{ insert: { image: imageUrl }, attributes: { width: "640", height: 480 } }],
    [{ insert: { image: imageUrl }, attributes: { width: 0, height: 480 } }],
    [{ insert: { image: imageUrl }, attributes: { width: 1.5, height: 480 } }],
    [{ insert: { image: imageUrl }, attributes: { width: 640, height: -1 } }],
  ])("rejects unsupported embeds, deltas, or rich formats %j", (nodes) => {
    expect(() => parsePostNodes(nodes)).toThrow();
  });

  it.each(<ReadonlyArray<unknown>>[
    [{ insert: { mention: { uid: "100000001", nickname: "旅行者" } } }],
    [{ insert: { mention: { uid: 0, nickname: "旅行者" } } }],
    [{ insert: { mention: { uid: 1.5, nickname: "旅行者" } } }],
    [{ insert: { mention: { uid: Number.MAX_SAFE_INTEGER + 1, nickname: "旅行者" } } }],
    [{ insert: { mention: { uid: 100000001, nickname: " " } } }],
    [{ insert: { mention: { uid: 100000001, nickname: "旅行者\n攻击" } } }],
  ])("rejects invalid numeric mention data %j", (nodes) => {
    expect(() => parsePostNodes(nodes)).toThrow();
  });

  it("rejects empty or non-array documents", () => {
    expect(() => parsePostNodes([])).toThrow();
    expect(() => parsePostNodes({ insert: "safe" })).toThrow();
  });
});
