/**
 * 米游社富文本帖子文档校验与内容统计
 * @since Beta v0.12.6
 */

import { parseCustomEmoticon } from "./bbsCustomEmoticon.js";

const customEmoticonBackupText: Readonly<"[自定义表情]"> = "[自定义表情]";

/**
 * 判断值是否为普通记录。
 * @since Beta v0.12.6
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 规范化帖子中的自定义表情节点。
 * @since Beta v0.12.6
 * @param value - 未知的自定义表情节点内容
 * @returns 已校验并补齐占位文本的自定义表情节点
 */
function parseCustomEmoticonInsert(
  value: Record<string, unknown>,
): TGApp.BBS.CustomEmoticon.Insert {
  const keys = Object.keys(value);
  if (
    !Object.hasOwn(value, "custom_emoticon") ||
    keys.some((key) => key !== "custom_emoticon" && key !== "backup_text")
  ) {
    throw new TypeError("帖子自定义表情信息无效");
  }
  if (Object.hasOwn(value, "backup_text") && value.backup_text !== customEmoticonBackupText) {
    throw new TypeError("帖子自定义表情占位无效");
  }
  let customEmoticon: TGApp.BBS.CustomEmoticon.Value;
  try {
    customEmoticon = parseCustomEmoticon(value.custom_emoticon);
  } catch {
    throw new TypeError("帖子自定义表情无效");
  }
  return { custom_emoticon: customEmoticon, backup_text: customEmoticonBackupText };
}

/**
 * 判断帖子节点是否为自定义表情。
 * @since Beta v0.12.6
 * @param node - 待判断的帖子节点
 * @returns 是否为自定义表情节点
 */
function isCustomEmoticonNode(
  node: TGApp.BBS.PostEdit.Node,
): node is TGApp.BBS.PostEdit.Node & { insert: TGApp.BBS.CustomEmoticon.Insert } {
  return typeof node.insert !== "string" && "custom_emoticon" in node.insert;
}

/**
 * 校验帖子中自定义表情的数量。
 * @since Beta v0.12.6
 * @param nodes - 已规范化的帖子节点
 */
function assertSingleCustomEmoticon(nodes: Array<TGApp.BBS.PostEdit.Node>): void {
  let count = 0;
  for (const node of nodes) {
    if (!isCustomEmoticonNode(node)) continue;
    count += 1;
    if (count > 1) throw new TypeError("帖子最多添加一个自定义表情");
  }
}

/**
 * 校验 HTTP 链接，拒绝脚本、凭据和控制字符。
 * @since Beta v0.12.6
 * @param value - 待校验的地址
 * @param image - 是否仅允许 HTTPS 图片
 * @returns 是否为安全地址
 */
export function isPostUrl(value: unknown, image: boolean = false): value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || (!image && url.protocol === "http:")) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * 校验富文本颜色，避免向 HTML 样式注入声明。
 * @since Beta v0.12.6
 */
function isPostColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/iu.test(value);
}

/**
 * 判断值是否为帖子编辑器支持的分割线样式。
 * @since Beta v0.12.6
 * @param value - 待校验的分割线样式
 * @returns 是否为支持的分割线样式
 */
export function isPostDivider(value: unknown): value is TGApp.BBS.PostEdit.Divider {
  return value === "line_1" || value === "line_2" || value === "line_3" || value === "line_4";
}

/**
 * 校验官方图片节点附带的资源元数据。
 * @since Beta v0.12.6
 * @param key - 元数据字段名
 * @param value - 元数据字段值
 * @returns 是否为可安全丢弃的官方元数据
 */
function isOfficialImageMetadata(key: string, value: unknown): boolean {
  switch (key) {
    case "height":
    case "width":
      return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    case "size":
      return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    case "ext":
      return typeof value === "string" && /^[a-z\d]+$/iu.test(value) && value.trim() === value;
    default:
      return false;
  }
}

/**
 * 校验并复制单个节点的属性。
 * @since Beta v0.12.6
 */
function parseAttributes(value: unknown, image: boolean): TGApp.BBS.PostEdit.Attributes {
  if (!isRecord(value)) throw new TypeError("帖子格式属性无效");
  const attributes: TGApp.BBS.PostEdit.Attributes = {};
  let hasOfficialImageMetadata = false;
  for (const [key, entry] of Object.entries(value)) {
    if (image) {
      if (key === "link") {
        if (!isPostUrl(entry)) throw new TypeError("帖子图片链接属性无效");
        attributes.link = entry;
      } else if (isOfficialImageMetadata(key, entry)) {
        hasOfficialImageMetadata = true;
      } else {
        throw new TypeError("帖子图片属性无效");
      }
      continue;
    }
    switch (key) {
      case "bold":
      case "italic":
        if (typeof entry !== "boolean") throw new TypeError("帖子文字格式无效");
        attributes[key] = entry;
        break;
      case "header":
        if (entry !== 1 && entry !== 2) {
          throw new TypeError("帖子标题级别无效");
        }
        attributes.header = entry;
        break;
      case "align":
        if (entry !== "left" && entry !== "center" && entry !== "right") {
          throw new TypeError("帖子对齐方式无效");
        }
        attributes.align = entry;
        break;
      case "color":
        if (!isPostColor(entry)) throw new TypeError("帖子文字颜色无效");
        attributes.color = entry;
        break;
      case "link":
        if (!isPostUrl(entry)) throw new TypeError("帖子链接仅支持 HTTP 或 HTTPS");
        attributes.link = entry;
        break;
      default:
        throw new TypeError(`暂不支持编辑帖子格式：${key}，请在米游社网页版编辑`);
    }
  }
  if (
    image &&
    hasOfficialImageMetadata &&
    !["height", "width", "size", "ext"].every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  ) {
    throw new TypeError("帖子图片元数据不完整");
  }
  return attributes;
}

/**
 * 校验并复制富文本节点，未知节点直接拒绝，避免重新编辑时丢失内容。
 * @since Beta v0.12.6
 * @param input - 未知来源的 Delta 节点列表
 * @returns 已校验的节点副本
 */
export function parsePostNodes(input: unknown): Array<TGApp.BBS.PostEdit.Node> {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError("帖子正文不能为空");
  const nodes = input.map((value): TGApp.BBS.PostEdit.Node => {
    if (
      !isRecord(value) ||
      Object.keys(value).some((key) => key !== "insert" && key !== "attributes")
    ) {
      throw new TypeError("帖子结构化节点无效");
    }
    const insert = value.insert;
    let node: TGApp.BBS.PostEdit.Node;
    if (typeof insert === "string") {
      node = { insert };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && isRecord(insert.emoticon)) {
      const emoticon = insert.emoticon;
      if (
        Object.keys(emoticon).some((key) => key !== "src" && key !== "name") ||
        !isPostUrl(emoticon.src, true) ||
        typeof emoticon.name !== "string" ||
        !emoticon.name.trim() ||
        /[\r\n()]/u.test(emoticon.name)
      )
        throw new TypeError("帖子表情无效");
      node = { insert: `_(${emoticon.name})` };
    } else if (isRecord(insert) && Object.hasOwn(insert, "custom_emoticon")) {
      node = { insert: parseCustomEmoticonInsert(insert) };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && "image" in insert) {
      if (!isPostUrl(insert.image, true)) throw new TypeError("帖子图片必须使用 HTTPS 地址");
      node = { insert: { image: insert.image } };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && "divider" in insert) {
      if (!isPostDivider(insert.divider)) throw new TypeError("帖子分割线无效");
      node = { insert: { divider: insert.divider } };
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
        throw new TypeError("帖子提及用户无效");
      }
      node = { insert: { mention: { uid: mention.uid, nickname: mention.nickname } } };
    } else {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if (
      typeof node.insert !== "string" &&
      "divider" in node.insert &&
      Object.prototype.hasOwnProperty.call(value, "attributes")
    ) {
      throw new TypeError("帖子分割线不支持格式属性");
    }
    if (isCustomEmoticonNode(node) && Object.prototype.hasOwnProperty.call(value, "attributes")) {
      throw new TypeError("帖子自定义表情不支持格式属性");
    }
    if (value.attributes !== undefined) {
      if (typeof insert !== "string" && isRecord(insert) && "mention" in insert) {
        throw new TypeError("暂不支持带格式的用户提及，请在米游社网页版编辑");
      }
      const attributes = parseAttributes(value.attributes, typeof node.insert !== "string");
      // 网页规范化时使用链接自身的颜色。
      if (attributes.link) delete attributes.color;
      if (Object.keys(attributes).length > 0) node.attributes = attributes;
    }
    return node;
  });
  assertSingleCustomEmoticon(nodes);
  const last = nodes.at(-1);
  if (!last || typeof last.insert !== "string" || !last.insert.endsWith("\n")) {
    nodes.push({ insert: "\n" });
  }
  return nodes;
}

/**
 * 校验 Delta 并收集纯文字和图片；HTML 由帖子 Quill 编辑器统一导出。
 * @since Beta v0.12.6
 * @param input - 待发布的富文本节点
 * @returns 可供内容统计与发布校验的文档
 */
export function buildPostDocument(input: unknown): TGApp.BBS.PostEdit.DraftDocument {
  const nodes = parsePostNodes(input);
  const images: Array<string> = [];
  let text = "";
  for (const node of nodes) {
    if (typeof node.insert === "string") {
      text += node.insert;
    } else if ("mention" in node.insert) {
      text += `@${node.insert.mention.nickname}`;
    } else if ("custom_emoticon" in node.insert) {
      text += node.insert.backup_text ?? customEmoticonBackupText;
    } else if ("image" in node.insert) {
      images.push(node.insert.image);
    }
  }
  return { nodes, text: text.replace(/\n$/u, ""), images };
}

/**
 * 校验发布正文的实际内容和长度。
 * @since Beta v0.12.6
 * @param document - 已校验的富文本文档
 */
export function assertPostDocumentContent(document: TGApp.BBS.PostEdit.DraftDocument): void {
  if (!document.text.trim() && document.images.length === 0)
    throw new TypeError("帖子正文不能为空");
  if (document.text.length + document.images.length > 30000)
    throw new TypeError("帖子正文最多 30000 字");
  if (document.images.length > 50) throw new TypeError("帖子最多添加 50 张图片");
  const emoticons = (document.text.match(/_\([^()\r\n]+\)/gu) ?? []).length;
  if (emoticons > 50) throw new TypeError("帖子最多添加 50 个表情");
  const mentions = document.nodes.filter(
    (node) => typeof node.insert !== "string" && "mention" in node.insert,
  ).length;
  if (mentions > 100) throw new TypeError("帖子最多提及 100 位用户");
  assertSingleCustomEmoticon(document.nodes);
}
