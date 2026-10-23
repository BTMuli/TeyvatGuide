/**
 * 米游社图片帖正文校验与内容统计。
 * @since Beta v0.13.0
 */

import { isPostUrl } from "@utils/bbs/postDocument.js";
import { isRecord } from "@utils/common/typeGuards.js";

const maxPictureContentLength: Readonly<number> = 500;

/**
 * 解析图片帖介绍节点。
 * @since Beta v0.13.0
 * @param input - 未知来源的结构化节点
 * @returns 仅包含文字和用户提及的规范化节点
 */
function parsePicturePostNodes(input: unknown): Array<TGApp.BBS.PostEdit.Node> {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError("图片帖介绍不能为空");
  const nodes = input.map((value): TGApp.BBS.PostEdit.Node => {
    if (
      !isRecord(value) ||
      Object.keys(value).some((key) => key !== "insert" && key !== "attributes")
    ) {
      throw new TypeError("图片帖介绍结构化节点无效");
    }
    const insert = value.insert;
    let node: TGApp.BBS.PostEdit.Node;
    if (typeof insert === "string") {
      node = { insert };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && isRecord(insert.mention)) {
      const mention = insert.mention;
      if (
        Object.keys(mention).some((key) => key !== "uid" && key !== "nickname") ||
        typeof mention.uid !== "number" ||
        !Number.isSafeInteger(mention.uid) ||
        mention.uid <= 0 ||
        typeof mention.nickname !== "string" ||
        !mention.nickname.trim() ||
        /[\r\n]/u.test(mention.nickname)
      ) {
        throw new TypeError("图片帖介绍提及用户无效");
      }
      node = { insert: { mention: { uid: mention.uid, nickname: mention.nickname } } };
    } else {
      throw new TypeError("图片帖介绍包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if (value.attributes !== undefined) {
      if (!isRecord(value.attributes) || Object.keys(value.attributes).length > 0) {
        throw new TypeError("图片帖介绍包含暂不支持的格式属性，请在米游社网页版编辑");
      }
    }
    return node;
  });
  const last = nodes.at(-1);
  if (!last || typeof last.insert !== "string" || !last.insert.endsWith("\n")) {
    nodes.push({ insert: "\n" });
  }
  return nodes;
}

/**
 * 规范化图片帖介绍为官方 `$normalizeDelta(..., { mention: true })` 的文本。
 * @since Beta v0.13.0
 * @param nodes - 已校验的图片帖介绍节点
 * @returns 供 `content.describe` 使用的文本
 */
export function serializePicturePostDescribe(nodes: Array<TGApp.BBS.PostEdit.Node>): string {
  return nodes
    .map((node) => {
      if (typeof node.insert === "string") return node.insert;
      if ("mention" in node.insert) return `@${node.insert.mention.nickname} `;
      throw new TypeError("图片帖介绍包含暂不支持的卡片或附件，请在米游社网页版编辑");
    })
    .join("");
}

/**
 * 构建图片帖编辑文档。
 * @since Beta v0.13.0
 * @param nodes - 图片帖介绍节点
 * @param images - 独立图片 URL 列表
 * @returns 规范化节点、UI 文本、官方字数和图片顺序
 */
export function buildPicturePostDocument(
  nodes: unknown,
  images: unknown,
): TGApp.BBS.PostEdit.DraftDocument & { length: number } {
  const normalizedNodes = parsePicturePostNodes(nodes);
  if (!Array.isArray(images)) throw new TypeError("图片帖图片列表无效");
  const normalizedImages = images.map((image) => {
    if (!isPostUrl(image, true)) throw new TypeError("图片帖图片必须使用 HTTPS 地址");
    return image;
  });

  let text = "";
  let length = 0;
  for (const node of normalizedNodes) {
    if (typeof node.insert === "string") {
      text += node.insert;
      length += node.insert.length;
    } else if ("mention" in node.insert) {
      text += `@${node.insert.mention.nickname}`;
      // The official helper normalizes a mention to "@nickname " before
      // Quill's getText(), so the mention costs nickname.length + 2.
      length += node.insert.mention.nickname.length + 2;
    } else {
      throw new TypeError("图片帖介绍包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
  }
  if (text.endsWith("\n")) {
    text = text.slice(0, -1);
    length -= 1;
  }
  return { nodes: normalizedNodes, text, images: normalizedImages, length };
}

/**
 * 校验图片帖文档的官方长度和图片数量限制。
 * @since Beta v0.13.0
 * @param document - 图片帖编辑文档
 * @param maxImages - 当前请求允许的图片上限
 */
export function assertPicturePostDocument(
  document: TGApp.BBS.PostEdit.DraftDocument & { length: number },
  maxImages: number = 18,
): void {
  if (
    !Number.isSafeInteger(document.length) ||
    document.length < 0 ||
    document.length > maxPictureContentLength
  ) {
    throw new TypeError("图片帖介绍最多 500 字");
  }
  if (!Array.isArray(document.images) || document.images.length === 0) {
    throw new TypeError("图片帖至少需要 1 张图片");
  }
  if (!Number.isSafeInteger(maxImages) || maxImages < 1) {
    throw new TypeError("图片帖图片数量上限无效");
  }
  if (document.images.length > maxImages) {
    throw new TypeError(`图片帖最多添加 ${maxImages} 张图片`);
  }
}

/**
 * 解析并校验图片帖 `post.content`。
 * @since Beta v0.13.0
 * @param input - JSON 字符串或已解析的图片帖内容
 * @returns 图片帖正文内容
 */
export function parsePicturePostContent(input: unknown): TGApp.BBS.PostEdit.PictureContent {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new TypeError("图片帖正文不是有效 JSON");
    }
  }
  if (!isRecord(parsed)) throw new TypeError("图片帖正文格式无效");
  if (Object.keys(parsed).some((key) => !["imgs", "describe", "link_card_ids"].includes(key))) {
    throw new TypeError("图片帖正文包含未知元数据");
  }
  if (!Array.isArray(parsed.imgs)) throw new TypeError("图片帖图片列表无效");
  const imgs = parsed.imgs.map((image) => {
    if (!isPostUrl(image, true)) throw new TypeError("图片帖图片必须使用 HTTPS 地址");
    return image;
  });
  if (typeof parsed.describe !== "string") throw new TypeError("图片帖介绍无效");
  if (parsed.link_card_ids !== undefined) {
    if (!Array.isArray(parsed.link_card_ids) || parsed.link_card_ids.length > 0) {
      throw new TypeError("图片帖链接卡片元数据无法安全保留");
    }
  }
  return {
    imgs,
    describe: parsed.describe,
    ...(parsed.link_card_ids === undefined ? {} : { link_card_ids: [] }),
  };
}
