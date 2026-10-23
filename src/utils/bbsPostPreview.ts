/**
 * 米游社帖子预览中的表情令牌渲染。
 * @since Beta v0.13.0
 */

import { parsePostEmoticonMap, splitPostEmoticonText } from "./bbsPostEmoticon.js";

/**
 * 从帖子节点收集可用于预览的表情图片地址。
 * @since Beta v0.13.0
 * @param nodes - 帖子编辑器节点
 * @returns 已清洗的表情名称与图片地址映射
 */
export function collectPostPreviewEmoticonMap(
  nodes: ReadonlyArray<TGApp.BBS.SctPost.Base>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const node of nodes) {
    const insert = node.insert;
    if (typeof insert === "object" && insert !== null && !Array.isArray(insert)) {
      const emoticon = insert.emoticon;
      if (
        typeof emoticon === "object" &&
        emoticon !== null &&
        !Array.isArray(emoticon) &&
        "name" in emoticon &&
        "src" in emoticon &&
        typeof emoticon.name === "string" &&
        typeof emoticon.src === "string"
      ) {
        values[emoticon.name] = emoticon.src;
      }
    }
    if (node.children) Object.assign(values, collectPostPreviewEmoticonMap(node.children));
  }
  return parsePostEmoticonMap(values);
}

/**
 * 查找编辑器文本节点中尚未解析的表情令牌名称。
 * @since Beta v0.13.0
 * @param nodes - 帖子编辑器节点
 * @param emoticons - 已清洗的表情映射
 * @returns 去重后的待加载表情名称
 */
export function getMissingPostPreviewEmoticonNames(
  nodes: ReadonlyArray<TGApp.BBS.SctPost.Base>,
  emoticons: Readonly<Record<string, string>>,
): Array<string> {
  const names = new Set<string>();
  for (const node of nodes) {
    if (typeof node.insert === "string") {
      const tokenPattern = /_\(([^()\r\n]+)\)/gu;
      let match: RegExpExecArray | null;
      while ((match = tokenPattern.exec(node.insert)) !== null) {
        const name = match[1];
        if (emoticons[name] === undefined && name.trim() === name && name.length > 0)
          names.add(name);
      }
    }
    if (node.children)
      for (const name of getMissingPostPreviewEmoticonNames(node.children, emoticons))
        names.add(name);
  }
  return [...names];
}

/**
 * 在预览 HTML 的文本节点中替换已知表情令牌，保留原有元素及其属性。
 * @since Beta v0.13.0
 * @param html - Quill 生成的预览 HTML
 * @param emoticons - 已清洗的表情映射
 * @returns 插入表情图片后的预览 HTML
 */
export function renderPostPreviewEmoticons(
  html: string,
  emoticons: Readonly<Record<string, string>>,
): string {
  if (typeof document === "undefined" || Object.keys(emoticons).length === 0) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Array<Text> = [];
  let current = walker.nextNode();
  while (current !== null) {
    if (current instanceof Text) textNodes.push(current);
    current = walker.nextNode();
  }
  for (const textNode of textNodes) {
    const segments = splitPostEmoticonText(textNode.data, emoticons);
    if (segments.length === 1 && typeof segments[0].insert === "string") continue;
    const fragment = document.createDocumentFragment();
    for (const segment of segments) {
      if (typeof segment.insert === "string") {
        fragment.append(document.createTextNode(segment.insert));
        continue;
      }
      const image = document.createElement("img");
      image.className = "post-preview-emoticon";
      image.alt = segment.insert.emoticon.name;
      image.title = segment.insert.emoticon.name;
      image.src = segment.insert.emoticon.src;
      image.dataset.name = segment.insert.emoticon.name;
      image.draggable = false;
      fragment.append(image);
    }
    textNode.replaceWith(fragment);
  }
  return container.innerHTML;
}
