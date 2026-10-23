/**
 * 米游社富文本帖子文档回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import {
  assertPostDocumentContent,
  assertPostFoldTitle,
  buildPostDocument,
  isPostDivider,
  isPostUrl,
  parsePostFold,
  parsePostNodes,
  parsePostVote,
} from "../src/utils/bbsPostDocument.js";

const imageUrl = "https://example.com/images/post.png";
const mention = { uid: 100000001, nickname: "旅行者" };
const customEmoticon = {
  id: "custom-one",
  url: "https://example.com/emoticons/custom-one.webp",
  size: { width: 96, height: 64, file_size: 2048 },
  is_available: true,
  hash: "custom-one-hash",
};
const vod = {
  id: "2112510696792002560",
  duration: 782407,
  cover: "https://example.com/images/vod-cover.jpg",
  resolutions: [
    {
      url: "https://example.com/video/720p.mp4",
      definition: "720P",
      height: 720,
      width: 1280,
      bitrate: 833679,
      size: 81534558,
      format: ".mp4",
      label: "720P",
      codec: "h264",
    },
  ],
  view_num: 40,
  transcoding_status: 2,
  review_status: 2,
  backup_resolutions: [],
};

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

  it("normalizes and deep copies custom emoticon nodes", () => {
    const nodes = [
      {
        insert: {
          custom_emoticon: customEmoticon,
          backup_text: <const>"[自定义表情]",
        },
      },
    ];
    const before = structuredClone(nodes);

    const parsed = parsePostNodes(nodes);
    expect(parsed[0]).toEqual({
      insert: {
        custom_emoticon: customEmoticon,
        backup_text: "[自定义表情]",
      },
    });
    const insert = parsed[0]?.insert;
    if (typeof insert === "string" || !("custom_emoticon" in insert)) {
      throw new Error("自定义表情节点未保留");
    }
    insert.custom_emoticon.size.width = 128;

    expect(nodes).toEqual(before);
    expect(insert.custom_emoticon).not.toBe(customEmoticon);
    expect(insert.custom_emoticon.size).not.toBe(customEmoticon.size);
  });

  it("keeps an unavailable existing custom emoticon for safe editing", () => {
    const unavailable = { ...customEmoticon, is_available: false };

    expect(parsePostNodes([{ insert: { custom_emoticon: unavailable } }])).toEqual([
      {
        insert: {
          custom_emoticon: unavailable,
          backup_text: "[自定义表情]",
        },
      },
      { insert: "\n" },
    ]);
  });

  it("adds one trailing newline and does not duplicate an existing one", () => {
    expect(parsePostNodes([{ insert: "hello" }])).toEqual([{ insert: "hello" }, { insert: "\n" }]);
    expect(parsePostNodes([{ insert: "hello\n" }])).toEqual([{ insert: "hello\n" }]);
  });

  it.each(<const>["line_1", "line_2", "line_3", "line_4"])(
    "preserves %s divider nodes and appends one trailing newline",
    (divider) => {
      const nodes = [{ insert: { divider } }];
      const before = structuredClone(nodes);

      expect(parsePostNodes(nodes)).toEqual([{ insert: { divider } }, { insert: "\n" }]);
      expect(nodes).toEqual(before);
    },
  );

  it("preserves a divider followed by an existing trailing newline", () => {
    expect(parsePostNodes([{ insert: { divider: "line_4" } }, { insert: "\n" }])).toEqual([
      { insert: { divider: "line_4" } },
      { insert: "\n" },
    ]);
  });

  it("preserves APK vote values and legacy fold backup text", () => {
    const title = JSON.stringify([{ insert: "标题" }, { insert: "\n" }]);
    const content = JSON.stringify([{ insert: "正文" }, { insert: "\n" }]);
    const vote = { id: "vote-1", uid: "100000001", url: "https://example.com/vote" };
    const fold = { title, content, id: "fold-1", size: "2" };
    const nodes = [{ insert: { vote } }, { insert: { backup_text: "", fold } }];

    expect(parsePostVote(vote)).toEqual({
      id: "vote-1",
      uid: "100000001",
      url: "https://example.com/vote",
    });
    expect(parsePostFold(fold)).toEqual({
      title,
      content,
      id: "fold-1",
      size: "2",
    });
    expect(parsePostNodes(nodes)).toEqual([nodes[0], nodes[1], { insert: "\n" }]);
  });

  it("preserves official video metadata without mutating the input", () => {
    const nodes = [{ insert: { vod } }];
    const before = structuredClone(nodes);

    const parsed = parsePostNodes(nodes);

    expect(parsed).toEqual([{ insert: { vod } }, { insert: "\n" }]);
    expect(nodes).toEqual(before);
    const insert = parsed[0]?.insert;
    if (typeof insert === "string" || !("vod" in insert)) throw new Error("视频节点未保留");
    insert.vod.duration = 1;
    expect(nodes).toEqual(before);
  });

  it("accepts a video without a cover", () => {
    const noCover = { ...vod, cover: "" };

    expect(parsePostNodes([{ insert: { vod: noCover } }])).toEqual([
      { insert: { vod: noCover } },
      { insert: "\n" },
    ]);
  });

  it("clones proxied video metadata without structured clone errors", () => {
    const proxied = new Proxy({ ...vod, resolutions: new Proxy(vod.resolutions, {}) }, {});

    const parsed = parsePostNodes([{ insert: { vod: proxied } }]);

    expect(parsed[0]).toEqual({ insert: { vod } });
  });

  it.each(<ReadonlyArray<unknown>>[
    [{ insert: { vod: null } }],
    [{ insert: { vod: { ...vod, id: "" } } }],
    [{ insert: { vod: { ...vod, id: "id\nnext" } } }],
    [{ insert: { vod: { ...vod, duration: -1 } } }],
    [{ insert: { vod: { ...vod, duration: 1.5 } } }],
    [{ insert: { vod: { ...vod, cover: "http://example.com/vod-cover.jpg" } } }],
    [{ insert: { vod: { ...vod, view_num: -1 } } }],
    [{ insert: { vod }, attributes: {} }],
    [{ insert: { vod, backup_text: "" } }],
  ])("rejects invalid video nodes %j", (nodes) => {
    expect(() => parsePostNodes(nodes)).toThrow();
  });

  it.each(<ReadonlyArray<unknown>>[
    [{ insert: { divider: "line_0" } }],
    [{ insert: { divider: "line_1" }, attributes: {} }],
    [{ insert: { divider: "line_1" }, attributes: { bold: true } }],
    [{ insert: { divider: "line_1", image: imageUrl } }],
  ])("rejects invalid or attributed divider nodes %j", (nodes) => {
    expect(() => parsePostNodes(nodes)).toThrow();
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

  it("strips official image metadata attributes while retaining the image", () => {
    const nodes = [
      {
        insert: { image: imageUrl },
        attributes: { height: 1068, width: 1079, size: 876615, ext: "png" },
      },
      { insert: "\n" },
    ];

    expect(parsePostNodes(nodes)).toEqual([{ insert: { image: imageUrl } }, { insert: "\n" }]);
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

  it("collects fold images and text recursively", () => {
    const document = buildPostDocument([
      {
        insert: {
          fold: {
            title: JSON.stringify([{ insert: "标题" }, { insert: "\n" }]),
            content: JSON.stringify([
              { insert: "正文 " },
              { insert: { mention } },
              { insert: { image: imageUrl } },
              { insert: "\n" },
            ]),
          },
        },
      },
    ]);

    expect(document.text).toBe("标题正文 @旅行者");
    expect(document.images).toEqual([imageUrl]);
    expect(() => assertPostDocumentContent(document)).not.toThrow();
  });

  it("applies mention and custom emoticon limits inside folds", () => {
    const nestedMentions = Array.from({ length: 101 }, () => ({ insert: { mention } }));
    const mentionDocument = buildPostDocument([
      {
        insert: {
          fold: {
            title: JSON.stringify(nestedMentions),
            content: JSON.stringify([{ insert: "正文" }]),
          },
        },
      },
    ]);
    expect(() => assertPostDocumentContent(mentionDocument)).toThrow("100 位用户");

    const customDocument = buildPostDocument([
      {
        insert: {
          fold: {
            title: JSON.stringify([{ insert: { custom_emoticon: customEmoticon } }]),
            content: JSON.stringify([
              { insert: { custom_emoticon: { ...customEmoticon, id: "two" } } },
            ]),
          },
        },
      },
    ]);
    expect(() => assertPostDocumentContent(customDocument)).toThrow("一个自定义表情");
  });

  it("rejects whitespace-only content but allows an image-only document", () => {
    const whitespace = buildPostDocument([{ insert: " \n\t " }]);
    const imageOnly = buildPostDocument([{ insert: { image: imageUrl } }, { insert: "\n" }]);

    expect(() => assertPostDocumentContent(whitespace)).toThrow();
    expect(() => assertPostDocumentContent(imageOnly)).not.toThrow();
  });

  it("counts a custom emoticon placeholder as content without treating it as an image", () => {
    const document = buildPostDocument([{ insert: { custom_emoticon: customEmoticon } }]);

    expect(document.text).toBe("[自定义表情]");
    expect(document.images).toEqual([]);
    expect(() => assertPostDocumentContent(document)).not.toThrow();
  });

  it("rejects more than one custom emoticon instead of dropping content", () => {
    expect(() =>
      parsePostNodes([
        { insert: { custom_emoticon: customEmoticon } },
        { insert: { custom_emoticon: { ...customEmoticon, id: "custom-two" } } },
      ]),
    ).toThrow("一个自定义表情");
  });

  it("counts an embedded video as content without treating it as an image", () => {
    const document = buildPostDocument([{ insert: { vod } }]);

    expect(document.text).toBe("[视频]");
    expect(document.images).toEqual([]);
    expect(() => assertPostDocumentContent(document)).not.toThrow();
  });

  it("excludes dividers from text and image statistics", () => {
    const document = buildPostDocument([{ insert: { divider: "line_2" } }]);

    expect(document.text).toBe("");
    expect(document.images).toEqual([]);
    expect(() => assertPostDocumentContent(document)).toThrow("正文不能为空");
  });

  it("removes only the document's final newline from the plain-text preview", () => {
    const document = buildPostDocument([{ insert: "first\nsecond\n" }]);

    expect(document.text).toBe("first\nsecond");
  });

  it("accepts text with supported fold title formats", () => {
    const document = buildPostDocument([
      { insert: "折叠标题", attributes: { bold: true, italic: true, header: 2, color: "#ff0000" } },
    ]);

    expect(() => assertPostFoldTitle(document)).not.toThrow();
  });

  it("rejects non-text fold title nodes", () => {
    const document = buildPostDocument([{ insert: { image: imageUrl } }]);

    expect(() => assertPostFoldTitle(document)).toThrow("仅支持文字");
  });

  it("rejects unsupported fold title formats", () => {
    const document = buildPostDocument([{ insert: "折叠标题", attributes: { align: "center" } }]);

    expect(() => assertPostFoldTitle(document)).toThrow("粗体、斜体、标题和颜色");
  });

  it.each([40, 41])("checks the %s-character fold title boundary", (length) => {
    const document = buildPostDocument([{ insert: "字".repeat(length) }]);
    const validate = () => assertPostFoldTitle(document);
    if (length === 40) expect(validate).not.toThrow();
    else expect(validate).toThrow("40");
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

describe("post divider validation", () => {
  it.each(<const>["line_1", "line_2", "line_3", "line_4"])("accepts %s", (divider) => {
    expect(isPostDivider(divider)).toBe(true);
  });

  it.each(<const>["line_0", "line-1", "", null, 1, undefined])(
    "rejects unsupported divider %j",
    (divider) => {
      expect(isPostDivider(divider)).toBe(false);
    },
  );
});

describe("unsupported post content", () => {
  it.each(<ReadonlyArray<unknown>>[
    [{ insert: { emoticon: { src: "http://example.com/smile.png", name: "smile" } } }],
    [{ insert: { emoticon: { src: imageUrl, name: "smile()" } } }],
    [{ insert: { custom_emoticon: "smile" } }],
    [{ insert: { custom_emoticon: { ...customEmoticon, url: "http://example.com/bad.webp" } } }],
    [{ insert: { custom_emoticon: { ...customEmoticon, size: { width: 0, height: 64 } } } }],
    [{ insert: { custom_emoticon: customEmoticon }, attributes: {} }],
    [{ insert: { custom_emoticon: customEmoticon, backup_text: "[表情]" } }],
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
