/**
 * 米游社帖子编辑器的 Quill 扩展格式。
 * @since Beta v0.13.0
 */

import Quill, { Parchment } from "quill";
import { BlockEmbed } from "quill/blots/block.js";
import Embed from "quill/blots/embed.js";

import { parseCustomEmoticon } from "./customEmoticon.js";
import {
  isPostDivider,
  parsePostFold,
  parsePostNodes,
  parsePostVod,
  parsePostVote,
} from "./postDocument.js";

/**
 * 帖子编辑器内部的用户提及值。
 * @since Beta v0.13.0
 */
type MentionValue = TGApp.BBS.ReplyAsset.Mention;

/**
 * 编辑器内部的表情值。
 * @since Beta v0.13.0
 */
type EmoticonValue = {
  src: string;
  name: string;
};

/**
 * 编辑器内部的收藏表情值。
 * @since Beta v0.13.0
 */
type CustomEmoticonValue = TGApp.BBS.CustomEmoticon.Value;

/**
 * 可见编辑器和发布序列化共用的帖子格式。
 * @since Beta v0.13.0
 */
export const postEditorFormats: ReadonlyArray<string> = [
  "bold",
  "italic",
  "header",
  "align",
  "color",
  "link",
  "image",
  "divider",
  "mention",
  "emoticon",
  "custom_emoticon",
  "vote",
  "vod",
  "fold",
];

const PostAlignAttributor = new Parchment.StyleAttributor("align", "text-align", {
  scope: Parchment.Scope.BLOCK,
  whitelist: ["left", "center", "right"],
});

/**
 * 帖子用户提及节点。
 * @since Beta v0.13.0
 */
class PostMentionBlot extends Embed {
  static blotName = "mention";

  static className = "quill-mention";

  static tagName = "A";

  /** 创建带 UID 的提及元素。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    if (!isMentionValue(value)) throw new TypeError("帖子提及用户无效");
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子提及节点无效");
    node.dataset.uid = String(value.uid);
    node.dataset.nickname = value.nickname;
    node.textContent = `@${value.nickname} `;
    node.setAttribute("contenteditable", "false");
    return node;
  }

  /** 读取提及值。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): MentionValue {
    const value: unknown = {
      uid: Number(domNode.dataset.uid),
      nickname: domNode.dataset.nickname ?? "",
    };
    if (!isMentionValue(value)) throw new TypeError("帖子提及用户无效");
    return value;
  }
}

/**
 * 编辑时显示图片的默认表情节点。
 * @since Beta v0.13.0
 */
class PostEmoticonBlot extends Embed {
  static blotName = "emoticon";

  static className = "quill-emoticon";

  static tagName = "IMG";

  /** 创建表情元素。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    if (!isEmoticonValue(value)) throw new TypeError("帖子表情无效");
    const node = super.create(value);
    if (!(node instanceof HTMLImageElement)) throw new TypeError("帖子表情节点无效");
    node.classList.add("quill-emoticon");
    node.alt = value.name;
    node.title = value.name;
    node.src = value.src;
    node.dataset.name = value.name;
    node.draggable = false;
    node.setAttribute("contenteditable", "false");
    return node;
  }

  /** 读取表情值。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): EmoticonValue {
    const value: unknown = {
      src: domNode.getAttribute("src") ?? "",
      name: domNode.dataset.name ?? domNode.getAttribute("alt") ?? "",
    };
    if (!isEmoticonValue(value)) throw new TypeError("帖子表情无效");
    return value;
  }
}

/**
 * 编辑时显示收藏表情的节点。
 * @since Beta v0.13.0
 */
class PostCustomEmoticonBlot extends Embed {
  static blotName = "custom_emoticon";

  static className = "quill-custom-emoticon";

  static tagName = "IMG";

  /** 创建并安全保存收藏表情的完整值。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    const customEmoticon = normalizeCustomEmoticonEmbed(value);
    const node = super.create(value);
    if (!(node instanceof HTMLImageElement)) throw new TypeError("帖子自定义表情节点无效");
    node.classList.add("quill-custom-emoticon");
    node.alt = customEmoticon.hash ?? customEmoticon.id;
    node.title = "自定义表情";
    node.src = customEmoticon.url;
    node.width = customEmoticon.size.width;
    node.height = customEmoticon.size.height;
    node.dataset.json = JSON.stringify(customEmoticon);
    node.draggable = false;
    node.setAttribute("contenteditable", "false");
    return node;
  }

  /** 读取收藏表情的完整值。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): CustomEmoticonValue {
    const encoded = domNode.dataset.json;
    if (encoded === undefined) throw new TypeError("帖子自定义表情数据缺失");
    let value: unknown;
    try {
      value = JSON.parse(encoded);
    } catch {
      throw new TypeError("帖子自定义表情数据无效");
    }
    return normalizeCustomEmoticonEmbed(value);
  }
}

/**
 * 帖子块级图片节点。
 * @since Beta v0.13.0
 */
class PostImageBlot extends BlockEmbed {
  static blotName = "image";

  static className = "ql-image";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 创建官方结构的图片块。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    if (!isImageUrl(value)) throw new TypeError("帖子图片地址无效");
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子图片节点无效");
    node.classList.add("ql-image");
    const box = document.createElement("div");
    box.className = "ql-image-box";
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = value;
    box.append(image);
    node.replaceChildren(box);
    return node;
  }

  /** 读取图片超链接。 @since Beta v0.13.0 */
  static formats(domNode: HTMLElement): Record<string, string> {
    const formats: Record<string, string> = {};
    const link = domNode.getAttribute("link");
    if (link !== null) {
      if (!isPostLink(link)) throw new TypeError("帖子图片链接属性无效");
      formats.link = link;
    }
    return formats;
  }

  /** 读取图片地址。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): string {
    const value = getImageElement(domNode).getAttribute("src");
    if (!isImageUrl(value)) throw new TypeError("帖子图片地址无效");
    return value;
  }

  /** 修改图片超链接。 @since Beta v0.13.0 */
  format(name: string, value: unknown): void {
    if (name === "link") {
      if (value === undefined || value === null || value === false || value === "") {
        this.domNode.removeAttribute(name);
      } else {
        const link = String(value);
        if (!isPostLink(link)) throw new TypeError("帖子图片链接属性无效");
        this.domNode.setAttribute(name, link);
      }
      return;
    }
    super.format(name, value);
  }
}

/**
 * 帖子块级分割线节点。
 * @since Beta v0.13.0
 */
class PostDividerBlot extends BlockEmbed {
  static blotName = "divider";

  static className = "ql-divider";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 使用帖子分割线组件的图片资源创建分割线块。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    if (!isPostDivider(value)) throw new TypeError("帖子分割线无效");
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子分割线节点无效");
    node.classList.add("ql-divider");
    node.dataset.divider = value;
    node.setAttribute("contenteditable", "false");
    node.setAttribute("role", "separator");
    const image = document.createElement("img");
    image.alt = "divider";
    image.src = "/UI/post/divider_" + value + ".webp";
    image.title = value;
    image.draggable = false;
    node.replaceChildren(image);
    return node;
  }

  /** 读取分割线样式。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): TGApp.BBS.PostEdit.Divider {
    const value = domNode.dataset.divider;
    if (!isPostDivider(value)) throw new TypeError("帖子分割线无效");
    return value;
  }

  /** 忽略文本和段落格式，避免分割线产生附加属性。 @since Beta v0.13.0 */
  format(): void {
    // 分割线只保留自身样式和数据值。
  }
}

/**
 * 帖子投票节点。
 * @since Beta v0.13.0
 */
class PostVoteBlot extends BlockEmbed {
  static blotName = "vote";

  static className = "ql-vote";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 创建保留投票 ID 和发布者 UID 的投票块。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    const vote = parsePostVote(value);
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子投票节点无效");
    node.classList.add("mhy-vote-frame");
    node.dataset.voteId = vote.id;
    node.dataset.voteUid = vote.uid;
    if (vote.url !== undefined) node.dataset.voteUrl = vote.url;
    node.textContent = `投票 ${vote.id}`;
    node.setAttribute("contenteditable", "false");
    node.setAttribute("role", "button");
    return node;
  }

  /** 从投票块读取完整嵌入值。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): TGApp.BBS.PostEdit.Vote {
    const value: Record<string, string> = {
      id: domNode.dataset.voteId ?? "",
      uid: domNode.dataset.voteUid ?? "",
    };
    if (domNode.dataset.voteUrl !== undefined) value.url = domNode.dataset.voteUrl;
    return parsePostVote(value);
  }

  /** 投票块不接受段落或文字格式。 @since Beta v0.13.0 */
  format(): void {
    // 投票块只保留自身的结构化值。
  }
}

/**
 * 帖子视频节点。
 * @since Beta v0.13.0
 */
class PostVodBlot extends BlockEmbed {
  static blotName = "vod";

  static className = "ql-vod";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 创建带封面和时长的视频块。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    const vod = parsePostVod(value);
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子视频节点无效");
    node.classList.add("ql-vod");
    node.dataset.vod = JSON.stringify(vod);
    node.setAttribute("contenteditable", "false");
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", "视频");
    const card = document.createElement("div");
    card.className = "ql-vod-card";
    if (vod.cover) {
      const cover = document.createElement("img");
      cover.className = "ql-vod-cover";
      cover.alt = "";
      cover.draggable = false;
      cover.src = vod.cover;
      card.append(cover);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "ql-vod-placeholder";
      placeholder.textContent = "视频";
      card.append(placeholder);
    }
    const play = document.createElement("img");
    play.className = "ql-vod-play";
    play.alt = "";
    play.draggable = false;
    play.src = "/UI/post/video_play.svg";
    const duration = document.createElement("span");
    duration.className = "ql-vod-duration";
    duration.textContent = formatPostVodDuration(vod.duration);
    card.append(play, duration);
    node.replaceChildren(card);
    return node;
  }

  /** 从视频块读取完整嵌入值。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): TGApp.BBS.PostEdit.Vod {
    const encoded = domNode.dataset.vod;
    if (encoded === undefined) throw new TypeError("帖子视频数据缺失");
    let value: unknown;
    try {
      value = JSON.parse(encoded);
    } catch {
      throw new TypeError("帖子视频数据无效");
    }
    return parsePostVod(value);
  }

  /** 视频块不接受段落或文字格式。 @since Beta v0.13.0 */
  format(): void {
    // 视频块只保留自身的结构化值。
  }
}

/**
 * 帖子折叠节点。
 * @since Beta v0.13.0
 */
class PostFoldBlot extends BlockEmbed {
  static blotName = "fold";

  static className = "ql-fold";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 创建保留嵌套 Delta 的折叠块。 @since Beta v0.13.0 */
  static create(value: unknown): HTMLElement {
    const fold = parsePostFold(value);
    const node = super.create(value);
    if (!(node instanceof HTMLElement)) throw new TypeError("帖子折叠节点无效");
    node.classList.add("ql-fold");
    node.dataset.title = fold.title;
    node.dataset.content = fold.content;
    if (fold.id !== undefined) node.dataset.id = fold.id;
    if (fold.size !== undefined) node.dataset.size = String(fold.size);
    node.setAttribute("contenteditable", "false");
    const title = document.createElement("div");
    title.className = "ql-fold-title";
    appendFoldDeltaMarkup(title, fold.title);
    if (!title.hasChildNodes()) title.textContent = "折叠标题";
    const content = document.createElement("div");
    content.className = "ql-fold-content";
    appendFoldDeltaMarkup(content, fold.content);
    if (!content.hasChildNodes()) content.textContent = "折叠内容";
    node.replaceChildren(title, content);
    return node;
  }

  /** 从折叠块读取完整嵌套 Delta。 @since Beta v0.13.0 */
  static value(domNode: HTMLElement): TGApp.BBS.PostEdit.Fold {
    const value: Record<string, string> = {
      title: domNode.dataset.title ?? "",
      content: domNode.dataset.content ?? "",
    };
    if (domNode.dataset.id !== undefined) value.id = domNode.dataset.id;
    if (domNode.dataset.size !== undefined) value.size = domNode.dataset.size;
    return parsePostFold(value);
  }

  /** 折叠块不接受段落或文字格式。 @since Beta v0.13.0 */
  format(): void {
    // 折叠块只保留自身的结构化值。
  }
}

let formatsRegistered = false;

/**
 * 判断值是否为普通记录。
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为普通记录
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 注册帖子编辑器所需的 Quill 格式。
 * @since Beta v0.13.0
 */
export function registerPostEditorFormats(): void {
  if (formatsRegistered) return;
  Quill.register(PostAlignAttributor, true);
  Quill.register(PostMentionBlot, true);
  Quill.register(PostEmoticonBlot, true);
  Quill.register(PostCustomEmoticonBlot, true);
  Quill.register(PostImageBlot, true);
  Quill.register(PostDividerBlot, true);
  Quill.register(PostVoteBlot, true);
  Quill.register(PostVodBlot, true);
  Quill.register(PostFoldBlot, true);
  formatsRegistered = true;
}

/**
 * 判断值是否为帖子编辑器可用的用户提及。
 * @since Beta v0.13.0
 */
function isMentionValue(value: unknown): value is MentionValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "uid" in value &&
    typeof value.uid === "number" &&
    Number.isSafeInteger(value.uid) &&
    value.uid > 0 &&
    "nickname" in value &&
    typeof value.nickname === "string" &&
    !!value.nickname.trim() &&
    !/[\r\n]/u.test(value.nickname)
  );
}

/**
 * 判断值是否为帖子编辑器可用的表情。
 * @since Beta v0.13.0
 */
function isEmoticonValue(value: unknown): value is EmoticonValue {
  if (
    typeof value !== "object" ||
    value === null ||
    !("src" in value) ||
    !isImageUrl(value.src) ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    value.name.trim() !== value.name ||
    !value.name ||
    /[\r\n]/u.test(value.name)
  ) {
    return false;
  }
  return true;
}

/**
 * 规范化 Quill 收藏表情值，兼容帖子节点中的占位封装。
 * @since Beta v0.13.0
 * @param value - Quill embed 或帖子节点中的未知值
 * @returns 已校验且不共享嵌套对象的收藏表情值
 */
function normalizeCustomEmoticonEmbed(value: unknown): CustomEmoticonValue {
  let source: unknown = value;
  if (isRecord(value) && Object.hasOwn(value, "custom_emoticon")) {
    const keys = Object.keys(value);
    if (
      keys.some((key) => key !== "custom_emoticon" && key !== "backup_text") ||
      (Object.hasOwn(value, "backup_text") && value.backup_text !== "[自定义表情]")
    ) {
      throw new TypeError("帖子自定义表情信息无效");
    }
    source = value.custom_emoticon;
  }
  try {
    return parseCustomEmoticon(source);
  } catch {
    throw new TypeError("帖子自定义表情无效");
  }
}

/**
 * 格式化视频时长，供编辑器和折叠预览展示。
 * @since Beta v0.13.0
 * @param duration - 视频时长，单位毫秒
 * @returns `mm:ss` 或 `hh:mm:ss`
 */
function formatPostVodDuration(duration: number): string {
  const total = Math.floor(duration / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * 判断值是否为帖子编辑器可用的图片地址。
 * @since Beta v0.13.0
 */
function isImageUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * 校验帖子图片的超链接。
 * @since Beta v0.13.0
 */
function isPostLink(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * 将折叠内的 Delta 安全转换为富文本 DOM，供编辑器 HTML 预览使用。
 * @since Beta v0.13.0
 * @param parent - 目标容器
 * @param value - JSON 编码的 Delta
 */
function appendFoldDeltaMarkup(parent: HTMLElement, value: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return;
  }
  let nodes: Array<TGApp.BBS.PostEdit.Node>;
  try {
    nodes = parsePostNodes(parsed);
  } catch {
    return;
  }
  parent.classList.add("ql-fold-rich");
  for (const node of nodes) appendFoldNodeMarkup(parent, node);
}

/**
 * 将一个已校验的折叠内节点转换为 DOM。
 * @since Beta v0.13.0
 * @param parent - 目标容器
 * @param node - 折叠内节点
 */
function appendFoldNodeMarkup(parent: HTMLElement, node: TGApp.BBS.PostEdit.Node): void {
  if (typeof node.insert === "string") {
    const attributes = node.attributes ?? {};
    const tag = attributes.header === 1 ? "h1" : attributes.header === 2 ? "h2" : "span";
    const text = document.createElement(tag);
    text.textContent = node.insert;
    applyFoldTextAttributes(text, attributes);
    appendFoldLink(parent, text, attributes.link);
    return;
  }
  if ("image" in node.insert) {
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = node.insert.image;
    const imageBox = document.createElement("span");
    imageBox.className = "ql-fold-image";
    imageBox.append(image);
    appendFoldLink(parent, imageBox, node.attributes?.link);
    return;
  }
  if ("mention" in node.insert) {
    const mention = document.createElement("span");
    mention.className = "ql-fold-mention";
    mention.textContent = `@${node.insert.mention.nickname} `;
    parent.append(mention);
    return;
  }
  if ("custom_emoticon" in node.insert) {
    const image = document.createElement("img");
    image.className = "ql-fold-emoticon";
    image.alt = node.insert.custom_emoticon.hash ?? node.insert.custom_emoticon.id;
    image.src = node.insert.custom_emoticon.url;
    image.width = node.insert.custom_emoticon.size.width;
    image.height = node.insert.custom_emoticon.size.height;
    parent.append(image);
    return;
  }
  if ("divider" in node.insert) {
    const divider = document.createElement("hr");
    divider.className = "ql-fold-divider";
    parent.append(divider);
    return;
  }
  if ("vote" in node.insert) {
    const vote = document.createElement("span");
    vote.className = "ql-fold-vote";
    vote.textContent = `投票 ${node.insert.vote.id}`;
    parent.append(vote);
    return;
  }
  if ("vod" in node.insert) {
    const vod = document.createElement("span");
    vod.className = "ql-fold-vod";
    vod.textContent = `[视频 ${formatPostVodDuration(node.insert.vod.duration)}]`;
    parent.append(vod);
    return;
  }
  if ("fold" in node.insert) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const content = document.createElement("div");
    appendFoldDeltaMarkup(summary, node.insert.fold.title);
    appendFoldDeltaMarkup(content, node.insert.fold.content);
    details.append(summary, content);
    parent.append(details);
  }
}

/**
 * 应用折叠内文字格式。
 * @since Beta v0.13.0
 * @param element - 文字元素
 * @param attributes - 已校验的文字属性
 */
function applyFoldTextAttributes(
  element: HTMLElement,
  attributes: TGApp.BBS.PostEdit.Attributes,
): void {
  if (attributes.bold) element.style.fontWeight = "700";
  if (attributes.italic) element.style.fontStyle = "italic";
  if (attributes.color) element.style.color = attributes.color;
  if (attributes.align) element.style.textAlign = attributes.align;
}

/**
 * 在折叠内安全添加超链接。
 * @since Beta v0.13.0
 * @param parent - 目标容器
 * @param element - 待添加元素
 * @param link - 可选链接
 */
function appendFoldLink(parent: HTMLElement, element: HTMLElement, link?: string): void {
  if (link === undefined) {
    parent.append(element);
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = link;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.append(element);
  parent.append(anchor);
}

/**
 * 获取帖子图片块中的图片元素。
 * @since Beta v0.13.0
 */
function getImageElement(domNode: HTMLElement): HTMLImageElement {
  const image = domNode.querySelector("img");
  if (!(image instanceof HTMLImageElement)) throw new TypeError("帖子图片节点无效");
  return image;
}
