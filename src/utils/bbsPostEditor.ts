/**
 * 米游社帖子编辑器的 Quill 扩展格式。
 * @since Beta v0.12.6
 */

import Quill, { Parchment } from "quill";
import { BlockEmbed } from "quill/blots/block.js";
import Embed from "quill/blots/embed.js";

import { parseCustomEmoticon } from "./bbsCustomEmoticon.js";
import { isPostDivider } from "./bbsPostDocument.js";

/**
 * 帖子编辑器内部的用户提及值。
 * @since Beta v0.12.6
 */
type MentionValue = TGApp.BBS.ReplyAsset.Mention;

/**
 * 编辑器内部的表情值。
 * @since Beta v0.12.6
 */
type EmoticonValue = {
  src: string;
  name: string;
};

/**
 * 编辑器内部的收藏表情值。
 * @since Beta v0.12.6
 */
type CustomEmoticonValue = TGApp.BBS.CustomEmoticon.Value;

/**
 * 可见编辑器和发布序列化共用的帖子格式。
 * @since Beta v0.12.6
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
];

const PostAlignAttributor = new Parchment.StyleAttributor("align", "text-align", {
  scope: Parchment.Scope.BLOCK,
  whitelist: ["left", "center", "right"],
});

/**
 * 帖子用户提及节点。
 * @since Beta v0.12.6
 */
class PostMentionBlot extends Embed {
  static blotName = "mention";

  static className = "quill-mention";

  static tagName = "A";

  /** 创建带 UID 的提及元素。 @since Beta v0.12.6 */
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

  /** 读取提及值。 @since Beta v0.12.6 */
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
 * @since Beta v0.12.6
 */
class PostEmoticonBlot extends Embed {
  static blotName = "emoticon";

  static className = "quill-emoticon";

  static tagName = "IMG";

  /** 创建表情元素。 @since Beta v0.12.6 */
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

  /** 读取表情值。 @since Beta v0.12.6 */
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
 * @since Beta v0.12.6
 */
class PostCustomEmoticonBlot extends Embed {
  static blotName = "custom_emoticon";

  static className = "quill-custom-emoticon";

  static tagName = "IMG";

  /** 创建并安全保存收藏表情的完整值。 @since Beta v0.12.6 */
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

  /** 读取收藏表情的完整值。 @since Beta v0.12.6 */
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
 * @since Beta v0.12.6
 */
class PostImageBlot extends BlockEmbed {
  static blotName = "image";

  static className = "ql-image";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 创建官方结构的图片块。 @since Beta v0.12.6 */
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

  /** 读取图片超链接。 @since Beta v0.12.6 */
  static formats(domNode: HTMLElement): Record<string, string> {
    const formats: Record<string, string> = {};
    const link = domNode.getAttribute("link");
    if (link !== null) {
      if (!isPostLink(link)) throw new TypeError("帖子图片链接属性无效");
      formats.link = link;
    }
    return formats;
  }

  /** 读取图片地址。 @since Beta v0.12.6 */
  static value(domNode: HTMLElement): string {
    const value = getImageElement(domNode).getAttribute("src");
    if (!isImageUrl(value)) throw new TypeError("帖子图片地址无效");
    return value;
  }

  /** 修改图片超链接。 @since Beta v0.12.6 */
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
 * @since Beta v0.12.6
 */
class PostDividerBlot extends BlockEmbed {
  static blotName = "divider";

  static className = "ql-divider";

  static tagName = "DIV";

  static scope = Parchment.Scope.BLOCK_BLOT;

  /** 使用帖子分割线组件的图片资源创建分割线块。 @since Beta v0.12.6 */
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

  /** 读取分割线样式。 @since Beta v0.12.6 */
  static value(domNode: HTMLElement): TGApp.BBS.PostEdit.Divider {
    const value = domNode.dataset.divider;
    if (!isPostDivider(value)) throw new TypeError("帖子分割线无效");
    return value;
  }

  /** 忽略文本和段落格式，避免分割线产生附加属性。 @since Beta v0.12.6 */
  format(): void {
    // 分割线只保留自身样式和数据值。
  }
}

let formatsRegistered = false;

/**
 * 判断值是否为普通记录。
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为普通记录
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 注册帖子编辑器所需的 Quill 格式。
 * @since Beta v0.12.6
 */
export function registerPostEditorFormats(): void {
  if (formatsRegistered) return;
  Quill.register(PostAlignAttributor, true);
  Quill.register(PostMentionBlot, true);
  Quill.register(PostEmoticonBlot, true);
  Quill.register(PostCustomEmoticonBlot, true);
  Quill.register(PostImageBlot, true);
  Quill.register(PostDividerBlot, true);
  formatsRegistered = true;
}

/**
 * 判断值是否为帖子编辑器可用的用户提及。
 * @since Beta v0.12.6
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
 * @since Beta v0.12.6
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
 * @since Beta v0.12.6
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
 * 判断值是否为帖子编辑器可用的图片地址。
 * @since Beta v0.12.6
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
 * @since Beta v0.12.6
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
 * 获取帖子图片块中的图片元素。
 * @since Beta v0.12.6
 */
function getImageElement(domNode: HTMLElement): HTMLImageElement {
  const image = domNode.querySelector("img");
  if (!(image instanceof HTMLImageElement)) throw new TypeError("帖子图片节点无效");
  return image;
}
