/**
 * 米游社帖子预览节点转换、交互与表情令牌渲染。
 * @since Beta v0.13.0
 */

import { parsePostEmoticonMap, splitPostEmoticonText } from "./postEmoticon.js";

/**
 * 复制已校验的文档，递归补充详情渲染器识别折叠所需的标记。
 * @since Beta v0.13.0
 * @param documentNodes - 已校验的帖子节点
 * @param images - 图片帖独立的图片列表
 * @returns 与编辑草稿隔离的预览节点
 */
export function createPostPreviewNodes(
  documentNodes: ReadonlyArray<TGApp.BBS.PostEdit.Node>,
  images: ReadonlyArray<string> = [],
): Array<TGApp.BBS.SctPost.Base> {
  const nodes = <Array<TGApp.BBS.PostEdit.Node>>JSON.parse(JSON.stringify(documentNodes));
  for (const node of nodes) {
    if (typeof node.insert === "string" || !("fold" in node.insert)) continue;
    const fold = node.insert.fold;
    node.insert.backup_text ??= "折叠内容";
    // 折叠 JSON 已在文档边界校验；这里仅转换渲染格式。
    fold.title = JSON.stringify(
      createPostPreviewNodes(<Array<TGApp.BBS.PostEdit.Node>>JSON.parse(fold.title)),
    );
    fold.content = JSON.stringify(
      createPostPreviewNodes(<Array<TGApp.BBS.PostEdit.Node>>JSON.parse(fold.content)),
    );
  }
  return [...images.map((image) => ({ insert: { image } })), ...nodes];
}

/**
 * 在捕获阶段拦截预览中的组件动作，保留折叠摘要的原生展开行为。
 * @since Beta v0.13.0
 * @param event - 预览卡片收到的点击事件
 */
export function handlePostPreviewClick(event: Event): void {
  event.stopPropagation();
  if (
    event.type === "click" &&
    event.target instanceof Element &&
    event.target.closest("summary") !== null &&
    event.target.closest("a, button, input, select, textarea") === null
  ) {
    return;
  }
  event.preventDefault();
}

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
    } else if ("fold" in node.insert) {
      const fold = <TGApp.BBS.PostEdit.Fold>node.insert.fold;
      for (const value of [fold.title, fold.content]) {
        const nested = <Array<TGApp.BBS.SctPost.Base>>JSON.parse(value);
        for (const name of getMissingPostPreviewEmoticonNames(nested, emoticons)) names.add(name);
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
  hydratePostPreviewEmoticons(container, emoticons);
  return container.innerHTML;
}

/**
 * 在现有预览 DOM 中渲染表情，保留父元素及折叠块的原始 Delta。
 * @since Beta v0.13.0
 * @param container - 目标预览容器
 * @param emoticons - 已清洗的表情映射
 */
export function hydratePostPreviewEmoticons(
  container: HTMLElement,
  emoticons: Readonly<Record<string, string>>,
): void {
  if (Object.keys(emoticons).length === 0) return;
  const document = container.ownerDocument;
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
}
