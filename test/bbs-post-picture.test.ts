/**
 * 米游社图片帖正文契约回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import {
  assertPicturePostDocument,
  buildPicturePostDocument,
  parsePicturePostContent,
  serializePicturePostDescribe,
} from "../src/utils/bbs/postPicture.js";

/**
 * 生成固定的图片测试地址。
 * @since Beta v0.13.0
 * @param index - 图片序号
 * @returns 图片地址
 */
const imageUrl = (index: number): string => `https://example.com/images/picture-${index}.png`;
const oneImage = [imageUrl(1)];

describe("bbsPostPicture document", () => {
  it("counts normal text and mentions using the official 500-character rule", () => {
    const document = buildPicturePostDocument(
      [
        { insert: "说明 " },
        { insert: { mention: { uid: 100000001, nickname: "旅行者" } } },
        { insert: "\n" },
      ],
      oneImage,
    );

    expect(document.text).toBe("说明 @旅行者");
    expect(document.length).toBe("说明 ".length + "旅行者".length + 2);
    expect(serializePicturePostDescribe(document.nodes)).toBe("说明 @旅行者 \n");
    expect(document.images).toEqual(oneImage);
    expect(() => assertPicturePostDocument(document)).not.toThrow();
  });

  it("rejects the 501st character while accepting exactly 500", () => {
    const valid = buildPicturePostDocument([{ insert: `${"a".repeat(500)}\n` }], oneImage);
    expect(valid.length).toBe(500);
    expect(() => assertPicturePostDocument(valid)).not.toThrow();

    const invalid = buildPicturePostDocument([{ insert: `${"a".repeat(501)}\n` }], oneImage);
    expect(invalid.length).toBe(501);
    expect(() => assertPicturePostDocument(invalid)).toThrow("500");
  });

  it("accepts eighteen images, rejects nineteen by default, and preserves order", () => {
    const eighteen = Array.from({ length: 18 }, (_, index) => imageUrl(index + 1));
    const document = buildPicturePostDocument([{ insert: "说明\n" }], eighteen);
    expect(document.images).toEqual(eighteen);
    expect(() => assertPicturePostDocument(document)).not.toThrow();

    const nineteen = [...eighteen, imageUrl(19)];
    const tooMany = buildPicturePostDocument([{ insert: "说明\n" }], nineteen);
    expect(() => assertPicturePostDocument(tooMany)).toThrow("18");
    expect(() => assertPicturePostDocument(tooMany, 19)).not.toThrow();
  });

  it("requires at least one image", () => {
    const document = buildPicturePostDocument([{ insert: "说明\n" }], []);
    expect(() => assertPicturePostDocument(document)).toThrow("至少需要 1 张图片");
  });

  it.each([
    [{ insert: { image: imageUrl(1) } }],
    [{ insert: { video: "https://example.com/video" } }],
    [{ insert: "说明", attributes: { bold: true } }],
  ])("rejects unsupported picture introduction nodes: %j", (node) => {
    expect(() => buildPicturePostDocument([node, { insert: "\n" }], oneImage)).toThrow();
  });
});

describe("bbsPostPicture content", () => {
  it("parses imgs and describe while allowing an empty link-card list", () => {
    expect(
      parsePicturePostContent(
        JSON.stringify({ imgs: oneImage, describe: "说明\n", link_card_ids: [] }),
      ),
    ).toEqual({ imgs: oneImage, describe: "说明\n", link_card_ids: [] });
  });

  it.each([
    { imgs: oneImage, describe: "说明\n", link_card_ids: ["card-1"] },
    { imgs: oneImage, describe: "说明\n", vote: { id: "vote-1" } },
    { imgs: ["http://example.com/insecure.png"], describe: "说明\n" },
  ])("rejects content metadata or URLs that cannot be preserved", (content) => {
    expect(() => parsePicturePostContent(content)).toThrow();
  });

  it("rejects malformed JSON and missing picture fields", () => {
    expect(() => parsePicturePostContent("not-json")).toThrow("有效 JSON");
    expect(() => parsePicturePostContent(JSON.stringify({ imgs: oneImage }))).toThrow();
    expect(() => parsePicturePostContent(JSON.stringify({ describe: "说明\n" }))).toThrow();
  });
});
